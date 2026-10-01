import { and, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '../../src/db/index.js';
import { hubConversationMessages, hubConversations, hubInboxEvents, hubTenantIntegrations } from '../../src/db/schema.js';
import { decryptTenantSecret, readRawBody, verifySignedEvent } from '../../src/utils/hub-inbox.js';
import { processSignedHubEvent } from '../../src/utils/hub-inbox-events.js';

export const config = { api: { bodyParser: false } };

const error = (res: any, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });

class InvalidEventDataError extends Error {}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return error(res, 405, 'METHOD_NOT_ALLOWED', 'Se acepta solo POST.');

  let rawBody: Buffer;
  let event: any;
  try {
    rawBody = await readRawBody(req);
    if (rawBody.length > 256 * 1024) return error(res, 413, 'EVENT_TOO_LARGE', 'El evento excede el tamaño máximo permitido.');
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (e: any) {
    if (String(e?.message || '').includes('exceeds limit')) return error(res, 413, 'EVENT_TOO_LARGE', 'El evento excede el tamaño máximo permitido.');
    return error(res, 400, 'INVALID_EVENT', 'El cuerpo del evento no es válido.');
  }

  try {
    const result = await processSignedHubEvent({
      event,
      rawBody,
      timestamp: req.headers['x-hub-timestamp'],
      signature: req.headers['x-hub-signature'],
      headerEventId: req.headers['x-hub-event-id'],
      resolveIntegration: async (hubTenantId) => {
        const [integration] = await db.select().from(hubTenantIntegrations)
          .where(and(eq(hubTenantIntegrations.hubTenantId, hubTenantId), eq(hubTenantIntegrations.active, true))).limit(1);
        return integration || null;
      },
      verifyIntegrationSignature: (integration, body, timestamp, signature, now) => {
        const encryptedSecrets = [integration.eventSecretCiphertext];
        if (integration.previousEventSecretCiphertext && integration.previousSecretValidUntil && integration.previousSecretValidUntil > now) {
          encryptedSecrets.push(integration.previousEventSecretCiphertext);
        }
        return encryptedSecrets.some((encrypted: string) => {
          try { return verifySignedEvent(body, timestamp, signature, decryptTenantSecret(encrypted), now.valueOf()); }
          catch { return false; }
        });
      },
      registerEvent: async (integration, incoming, payloadHash) => {
        const [stored] = await db.insert(hubInboxEvents).values({
          tenantId: integration.tenantId,
          eventId: incoming.event_id,
          payloadHash,
          eventType: incoming.event_type,
          hubMessageId: incoming.event_type === 'message.delivery_updated'
            ? String(incoming.data?.message_id || '') || null
            : incoming.event_type === 'message.created' ? String(incoming.data?.message_id || '') || null : null,
          deliveryStatus: incoming.event_type === 'message.delivery_updated'
            ? String(incoming.data?.status || '') || null
            : null,
          hubSequence: incoming.sequence,
          occurredAt: new Date(incoming.occurred_at),
          dedupeExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }).onConflictDoNothing().returning({ id: hubInboxEvents.id, payloadHash: hubInboxEvents.payloadHash, processedAt: hubInboxEvents.processedAt });
        const prior = stored || (await db.select({ id: hubInboxEvents.id, payloadHash: hubInboxEvents.payloadHash, processedAt: hubInboxEvents.processedAt })
          .from(hubInboxEvents)
          .where(and(eq(hubInboxEvents.tenantId, integration.tenantId), eq(hubInboxEvents.eventId, incoming.event_id))).limit(1))[0];
        if (!prior) throw new Error('event persist failed');
        if (!stored && prior.payloadHash !== payloadHash) return { id: prior.id, processed: false, bodyMismatch: true };
        return { id: prior.id, processed: Boolean(prior.processedAt) };
      },
      applyEvent,
      markProcessed: async (eventRecordId) => {
        await db.update(hubInboxEvents).set({ processedAt: new Date() }).where(eq(hubInboxEvents.id, eventRecordId));
      },
    });
    if (result.status >= 400) return error(res, result.status, result.code!, result.message!);
    return res.status(result.status).json({ accepted: true, duplicate: result.duplicate });
  } catch (e: any) {
    if (e instanceof InvalidEventDataError) return error(res, 422, 'INVALID_EVENT_DATA', 'Los datos del evento no corresponden al contrato v1.');
    return error(res, 503, 'EVENT_RETRYABLE', 'No fue posible procesar el evento; puede reintentarse con el mismo event_id y cuerpo.');
  }
}

async function applyEvent(integration: any, event: any) {
  const { data } = event;
  const conversationId = event.conversation_id;
  const seq: number = event.sequence;
  if (event.event_type === 'conversation.deleted') {
    const deletedAt = data.deleted_at ? new Date(data.deleted_at) : new Date(event.occurred_at);
    if (Number.isNaN(deletedAt.valueOf())) throw new InvalidEventDataError('invalid deleted_at');
    const [local] = await db.select({ id: hubConversations.id, hubSequence: hubConversations.hubSequence })
      .from(hubConversations)
      .where(and(eq(hubConversations.tenantId, integration.tenantId), eq(hubConversations.hubConversationId, conversationId))).limit(1);
    if (!local) {
      await db.insert(hubConversations).values({
        tenantId: integration.tenantId,
        integrationId: integration.id,
        hubConversationId: conversationId,
        status: data.status || 'closed',
        handlingMode: 'bot',
        hubSequence: seq,
        deletedAt,
        retentionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      }).onConflictDoNothing();
      return;
    }
    if (local.hubSequence === null || seq > local.hubSequence) {
      await db.update(hubConversationMessages).set({ content: null, authorId: null, providerMessageId: null, redactedAt: new Date() })
        .where(and(eq(hubConversationMessages.tenantId, integration.tenantId), eq(hubConversationMessages.conversationId, local.id)));
      await db.update(hubConversations).set({
        contactName: null, contactPhone: null, hubContactId: null, clientId: null, takeoverId: null, assignedTo: null,
        status: data.status || 'closed', handlingMode: 'bot', deletedAt, hubSequence: seq,
        updatedAt: new Date(), retentionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      }).where(eq(hubConversations.id, local.id));
    }
    return;
  }

  const [local] = await db.insert(hubConversations).values({
    tenantId: integration.tenantId,
    integrationId: integration.id,
    hubConversationId: conversationId,
    hubContactId: data.contact_id || data.contact?.id || null,
    contactName: data.contact?.display_name || null,
    contactPhone: data.contact?.phone || null,
    status: event.event_type === 'conversation.created' ? data.status || 'bot_active' : 'bot_active',
    handlingMode: event.event_type === 'conversation.takeover_started' ? 'human' : 'bot',
    takeoverId: event.event_type === 'conversation.takeover_started' ? data.takeover_id || null : null,
    assignedTo: event.event_type === 'conversation.takeover_started' ? data.assigned_to || null : null,
    lastMessageAt: event.event_type === 'message.created' ? new Date(data.created_at || event.occurred_at) : null,
    hubSequence: seq,
    retentionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  }).onConflictDoNothing().returning({ id: hubConversations.id, hubSequence: hubConversations.hubSequence, deletedAt: hubConversations.deletedAt });

  const [conversation] = local ? [local] : await db.select({ id: hubConversations.id, hubSequence: hubConversations.hubSequence, deletedAt: hubConversations.deletedAt })
    .from(hubConversations)
    .where(and(eq(hubConversations.tenantId, integration.tenantId), eq(hubConversations.hubConversationId, conversationId))).limit(1);
  if (!conversation) throw new Error('conversation persist failed');
  // Tombstones are terminal; delayed events must not recreate redacted PII.
  if (conversation.deletedAt) return;

  const newer = conversation.hubSequence === null || seq > conversation.hubSequence;
  if (!newer && event.event_type === 'conversation.created') {
    await db.update(hubConversations).set({
      hubContactId: data.contact_id || data.contact?.id || null,
      contactName: data.contact?.display_name || null,
      contactPhone: data.contact?.phone || null,
    }).where(and(eq(hubConversations.id, conversation.id), isNull(hubConversations.deletedAt)));
  }
  if (newer) {
    const patch: Record<string, any> = {
      hubSequence: seq,
      updatedAt: new Date(),
      retentionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
    if (event.event_type === 'conversation.created') {
      patch.status = data.status || 'bot_active';
      patch.hubContactId = data.contact_id || data.contact?.id || null;
      patch.contactName = data.contact?.display_name || null;
      patch.contactPhone = data.contact?.phone || null;
    } else if (event.event_type === 'conversation.takeover_started') {
      patch.status = data.status || 'human_active';
      patch.handlingMode = 'human';
      patch.takeoverId = data.takeover_id || null;
      patch.assignedTo = data.assigned_to || null;
    } else if (event.event_type === 'conversation.takeover_released') {
      patch.status = data.status || 'bot_active';
      patch.handlingMode = 'bot';
      patch.takeoverId = null;
      patch.assignedTo = null;
    } else if (event.event_type === 'message.created') {
      patch.lastMessageAt = new Date(data.created_at || event.occurred_at);
    }
    await db.update(hubConversations).set(patch)
      .where(and(eq(hubConversations.id, conversation.id), isNull(hubConversations.deletedAt)));
  }

  if (event.event_type === 'message.created') {
    if (typeof data.message_id !== 'string' || !['inbound', 'outbound'].includes(data.direction) || typeof data.content !== 'string') {
      throw new InvalidEventDataError('invalid message.created payload');
    }
    const [deliveryBeforeMessage] = await db.select({ status: hubInboxEvents.deliveryStatus, occurredAt: hubInboxEvents.occurredAt, sequence: hubInboxEvents.hubSequence })
      .from(hubInboxEvents)
      .where(and(eq(hubInboxEvents.tenantId, integration.tenantId), eq(hubInboxEvents.hubMessageId, data.message_id), eq(hubInboxEvents.eventType, 'message.delivery_updated')))
      .orderBy(desc(hubInboxEvents.hubSequence)).limit(1);
    const deliverySequence = deliveryBeforeMessage?.sequence ?? null;
    const status = deliverySequence !== null && deliverySequence > seq
      ? deliveryBeforeMessage.status
      : data.status || 'received';
    const finalSequence = deliverySequence !== null && deliverySequence > seq ? deliverySequence : seq;
    await db.insert(hubConversationMessages).values({
      tenantId: integration.tenantId,
      conversationId: conversation.id,
      hubMessageId: data.message_id,
      providerMessageId: data.provider_message_id || null,
      direction: data.direction,
      authorType: String(data.author_type || 'contact'),
      authorId: data.author_id || null,
      content: data.content,
      deliveryStatus: status,
      createdAtHub: new Date(data.created_at || event.occurred_at),
      hubSequence: finalSequence,
    }).onConflictDoUpdate({
      target: [hubConversationMessages.tenantId, hubConversationMessages.hubMessageId],
      set: {
        providerMessageId: data.provider_message_id || null,
        content: data.content,
        deliveryStatus: status,
        hubSequence: finalSequence,
      },
      setWhere: or(isNull(hubConversationMessages.hubSequence), lt(hubConversationMessages.hubSequence, finalSequence)),
    });
  }

  if (event.event_type === 'message.delivery_updated') {
    if (typeof data.message_id !== 'string' || !['sent', 'failed', 'unknown'].includes(data.status)) {
      throw new InvalidEventDataError('invalid message.delivery_updated payload');
    }
    await db.update(hubConversationMessages).set({
      deliveryStatus: data.status,
      providerMessageId: data.provider_message_id || undefined,
      hubSequence: seq,
    }).where(and(
      eq(hubConversationMessages.tenantId, integration.tenantId),
      eq(hubConversationMessages.conversationId, conversation.id),
      eq(hubConversationMessages.hubMessageId, data.message_id),
      or(isNull(hubConversationMessages.hubSequence), lt(hubConversationMessages.hubSequence, seq))!,
    ));
  }
}
