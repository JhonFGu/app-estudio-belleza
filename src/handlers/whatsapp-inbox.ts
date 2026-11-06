import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  appointments,
  clients,
  collaborators,
  hubConversationMessages,
  hubConversations,
  users,
  whatsappConversations,
  whatsappInstances,
  whatsappMessages,
  whatsappQuotes,
  services,
} from '../db/schema.js';
import { getSessionUser } from '../utils/session-auth.js';
import { hasMessageReadPermission, hasMessageWritePermission } from '../utils/hub-inbox.js';

const fail = (res: any, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-token, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');

  const user = await getSessionUser(req);
  if (!user) return fail(res, 401, 'SESSION_REQUIRED', 'Inicia sesión para consultar Mensajes.');
  const canRead = hasMessageReadPermission(user);
  const canWrite = hasMessageWritePermission(user);
  if (req.method === 'GET' && !canRead) return fail(res, 403, 'FORBIDDEN', 'No tienes permiso para leer Mensajes.');
  if (req.method === 'POST' && !canWrite) return fail(res, 403, 'FORBIDDEN', 'No tienes permiso para responder en Mensajes.');

  try {
    if (req.method === 'GET') {
      if (String(req.query?.source || '') === 'hub_archive') return getHubArchive(req, res, user.tenantId);
      const conversationId = String(Array.isArray(req.query?.conversationId) ? req.query.conversationId[0] : req.query?.conversationId || '');
      if (conversationId) return getConversation(res, user.tenantId, conversationId);
      return getConversations(res, user.tenantId);
    }

    const body = req.body || {};
    if (!['reply', 'takeover_start', 'takeover_release'].includes(body.action)) return fail(res, 422, 'INVALID_ACTION', 'Acción de conversación no soportada.');
    if (typeof body.conversationId !== 'string') return fail(res, 422, 'INVALID_CONVERSATION', 'conversationId es obligatorio.');
    const [conversation] = await db.select().from(whatsappConversations).where(and(
      eq(whatsappConversations.id, body.conversationId), eq(whatsappConversations.tenantId, user.tenantId),
    )).limit(1);
    if (!conversation) return fail(res, 404, 'CONVERSATION_NOT_FOUND', 'Conversación no encontrada.');

    if (body.action === 'takeover_start' || body.action === 'takeover_release') {
      const handlingMode = body.action === 'takeover_start' ? 'human' : 'bot';
      const [updated] = await db.update(whatsappConversations).set({
        handlingMode,
        assignedUserId: handlingMode === 'human' ? user.id : null,
        handoffReason: handlingMode === 'human' ? 'Atención solicitada desde el inbox.' : null,
        updatedAt: new Date(),
      }).where(and(eq(whatsappConversations.id, conversation.id), eq(whatsappConversations.tenantId, user.tenantId))).returning();
      return res.status(200).json({ conversation: updated });
    }

    if (conversation.handlingMode !== 'human') return fail(res, 409, 'TAKEOVER_REQUIRED', 'Activa la atención humana antes de responder.');
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content || content.length > 4000) return fail(res, 422, 'INVALID_MESSAGE', 'El mensaje debe tener entre 1 y 4000 caracteres.');
    const idempotencyKey = String(req.headers['idempotency-key'] || '');
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200) return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'La Idempotency-Key debe tener entre 8 y 200 caracteres.');

    const [existing] = await db.select().from(whatsappMessages).where(and(
      eq(whatsappMessages.tenantId, user.tenantId), eq(whatsappMessages.idempotencyKey, idempotencyKey),
    )).limit(1);
    if (existing) return res.status(existing.deliveryStatus === 'failed' ? 502 : 200).json({ message: existing, duplicate: true });

    const [instance] = await db.select().from(whatsappInstances).where(and(
      eq(whatsappInstances.id, conversation.instanceId), eq(whatsappInstances.tenantId, user.tenantId), eq(whatsappInstances.active, true),
    )).limit(1);
    if (!instance) return fail(res, 409, 'WHATSAPP_INSTANCE_INACTIVE', 'La instancia asociada a esta conversación no está activa.');

    const [pending] = await db.insert(whatsappMessages).values({
      tenantId: user.tenantId,
      instanceId: instance.id,
      conversationId: conversation.id,
      direction: 'outbound',
      authorType: 'user',
      authorUserId: user.id,
      idempotencyKey,
      content,
      messageType: 'text',
      deliveryStatus: 'pending',
    }).onConflictDoNothing().returning();
    if (!pending) {
      const [duplicate] = await db.select().from(whatsappMessages).where(and(eq(whatsappMessages.tenantId, user.tenantId), eq(whatsappMessages.idempotencyKey, idempotencyKey))).limit(1);
      return res.status(200).json({ message: duplicate, duplicate: true });
    }

    const n8nUrl = process.env.N8N_WHATSAPP_SEND_WEBHOOK_URL;
    const n8nSecret = process.env.N8N_WHATSAPP_SEND_SECRET;
    if (!n8nUrl || !n8nSecret) {
      await db.update(whatsappMessages).set({ deliveryStatus: 'failed' }).where(eq(whatsappMessages.id, pending.id));
      return fail(res, 503, 'N8N_SEND_NOT_CONFIGURED', 'El envío de mensajes todavía no está configurado.');
    }
    try {
      const n8nResponse = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-miesbe-send-secret': n8nSecret },
        body: JSON.stringify({
          messageId: pending.id,
          conversationId: conversation.id,
          instanceName: instance.evolutionName,
          remoteJid: conversation.remoteJid,
          userId: user.id,
          content,
          idempotencyKey,
        }),
        signal: AbortSignal.timeout(25000),
      });
      const result: any = await n8nResponse.json().catch(() => ({}));
      if (!n8nResponse.ok || result.sent === false) {
        const deliveryStatus = result.delivery === 'unknown' ? 'unknown' : 'failed';
        const [updated] = await db.update(whatsappMessages).set({ deliveryStatus }).where(eq(whatsappMessages.id, pending.id)).returning();
        return res.status(deliveryStatus === 'unknown' ? 202 : 502).json({ message: updated, error: { code: 'WHATSAPP_SEND_FAILED', message: 'Evolution no confirmó el envío.' } });
      }
      const [updated] = await db.update(whatsappMessages).set({
        providerMessageId: typeof result.providerMessageId === 'string' ? result.providerMessageId : null,
        deliveryStatus: result.deliveryStatus || 'sent',
        sentAt: new Date(),
      }).where(eq(whatsappMessages.id, pending.id)).returning();
      await db.update(whatsappConversations).set({ lastMessageAt: updated.createdAt, updatedAt: new Date() }).where(eq(whatsappConversations.id, conversation.id));
      return res.status(202).json({ message: updated });
    } catch {
      const [updated] = await db.update(whatsappMessages).set({ deliveryStatus: 'unknown' }).where(eq(whatsappMessages.id, pending.id)).returning();
      return res.status(202).json({ message: updated, error: { code: 'WHATSAPP_SEND_UNKNOWN', message: 'El resultado del envío es incierto. Revisa el historial antes de volver a enviarlo.' } });
    }
  } catch {
    return fail(res, 503, 'WHATSAPP_INBOX_UNAVAILABLE', 'No fue posible consultar el inbox en este momento.');
  }
}

async function getConversations(res: any, tenantId: string) {
  const rows = await db.select({
    conversation: whatsappConversations,
    clientName: clients.name,
    clientPhone: clients.phone,
    instanceName: whatsappInstances.evolutionName,
    instanceLabel: whatsappInstances.label,
    assignedUserName: users.name,
  }).from(whatsappConversations)
    .innerJoin(clients, eq(whatsappConversations.clientId, clients.id))
    .innerJoin(whatsappInstances, eq(whatsappConversations.instanceId, whatsappInstances.id))
    .leftJoin(users, eq(whatsappConversations.assignedUserId, users.id))
    .where(eq(whatsappConversations.tenantId, tenantId))
    .orderBy(desc(whatsappConversations.lastMessageAt)).limit(100);
  const ids = rows.map((row) => row.conversation.id);
  const latestMessages = ids.length ? await db.select().from(whatsappMessages).where(inArray(whatsappMessages.conversationId, ids)).orderBy(desc(whatsappMessages.createdAt)) : [];
  const latestByConversation = new Map<string, any>();
  for (const message of latestMessages) if (!latestByConversation.has(message.conversationId)) latestByConversation.set(message.conversationId, message);
  return res.status(200).json({ conversations: rows.map((row) => ({
    ...row.conversation,
    client: { id: row.conversation.clientId, name: row.clientName, phone: row.clientPhone },
    instance: { name: row.instanceName, label: row.instanceLabel },
    assignedUserName: row.assignedUserName,
    lastMessage: latestByConversation.get(row.conversation.id) || null,
  })) });
}

async function getConversation(res: any, tenantId: string, conversationId: string) {
  const [row] = await db.select({ conversation: whatsappConversations, client: clients, instance: whatsappInstances, assignedUser: users })
    .from(whatsappConversations)
    .innerJoin(clients, eq(whatsappConversations.clientId, clients.id))
    .innerJoin(whatsappInstances, eq(whatsappConversations.instanceId, whatsappInstances.id))
    .leftJoin(users, eq(whatsappConversations.assignedUserId, users.id))
    .where(and(eq(whatsappConversations.id, conversationId), eq(whatsappConversations.tenantId, tenantId))).limit(1);
  if (!row) return fail(res, 404, 'CONVERSATION_NOT_FOUND', 'Conversación no encontrada.');
  const [messages, quotes, appointmentRows] = await Promise.all([
    db.select().from(whatsappMessages).where(and(
      eq(whatsappMessages.tenantId, tenantId), eq(whatsappMessages.conversationId, conversationId),
    )).orderBy(asc(whatsappMessages.createdAt)).limit(500),
    db.select().from(whatsappQuotes).where(and(eq(whatsappQuotes.tenantId, tenantId), eq(whatsappQuotes.conversationId, conversationId))).orderBy(desc(whatsappQuotes.createdAt)).limit(20),
    db.select({ appointment: appointments, serviceName: services.name, professionalName: collaborators.name })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(collaborators, eq(appointments.specialistId, collaborators.id))
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.clientId, row.conversation.clientId)))
      .orderBy(desc(appointments.startTime)).limit(10),
  ]);
  return res.status(200).json({
    conversation: row.conversation,
    client: row.client,
    instance: row.instance,
    assignedUser: row.assignedUser,
    messages,
    quotes,
    appointments: appointmentRows.map((item) => ({ ...item.appointment, serviceName: item.serviceName, professionalName: item.professionalName })),
  });
}

async function getHubArchive(req: any, res: any, tenantId: string) {
  const conversationId = String(Array.isArray(req.query?.conversationId) ? req.query.conversationId[0] : req.query?.conversationId || '');
  if (conversationId) {
    const [conversation] = await db.select().from(hubConversations).where(and(
      eq(hubConversations.tenantId, tenantId), eq(hubConversations.hubConversationId, conversationId),
    )).limit(1);
    if (!conversation) return fail(res, 404, 'ARCHIVE_NOT_FOUND', 'Conversación archivada no encontrada.');
    const messages = await db.select().from(hubConversationMessages).where(and(
      eq(hubConversationMessages.tenantId, tenantId), eq(hubConversationMessages.conversationId, conversation.id), isNull(hubConversationMessages.redactedAt),
    )).orderBy(asc(hubConversationMessages.createdAtHub));
    return res.status(200).json({ conversation, messages, source: 'hub_archive', readOnly: true });
  }
  const conversations = await db.select().from(hubConversations).where(eq(hubConversations.tenantId, tenantId)).orderBy(desc(hubConversations.lastMessageAt)).limit(200);
  return res.status(200).json({ conversations, source: 'hub_archive', readOnly: true });
}
