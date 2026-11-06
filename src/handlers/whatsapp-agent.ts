import { timingSafeEqual } from 'node:crypto';
import { and, asc, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  appointments, clients, collaborators, products, services, tenants, users,
  whatsappAgentSettings, whatsappConversations, whatsappInstances, whatsappMessages, whatsappQuotes,
  type WhatsAppQuoteItemSnapshot,
} from '../db/schema.js';
import { dispatchWebhook } from '../utils/webhooks.js';
import { isExplicitQuoteAcceptance, isExplicitQuoteIntent } from '../utils/whatsapp-intent.js';
import { findAppointmentConflict, getWhatsAppAvailability } from '../services/whatsapp-booking.js';

const send = (res: any, status: number, data: unknown) => res.status(status).json(data);
const fail = (res: any, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const text = (value: unknown, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function phoneFromJid(jid: string) {
  const digits = jid.split('@')[0].replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

async function getInstance(name: string) {
  if (!name) throw Object.assign(new Error('instanceName es obligatorio.'), { statusCode: 422, code: 'INSTANCE_REQUIRED' });
  const [instance] = await db.select().from(whatsappInstances).where(and(eq(whatsappInstances.evolutionName, name), eq(whatsappInstances.active, true))).limit(1);
  return instance || null;
}

async function getConversation(instance: any, id: string) {
  if (!id) throw Object.assign(new Error('conversationId es obligatorio.'), { statusCode: 422, code: 'CONVERSATION_REQUIRED' });
  const [conversation] = await db.select().from(whatsappConversations).where(and(
    eq(whatsappConversations.id, id), eq(whatsappConversations.tenantId, instance.tenantId), eq(whatsappConversations.instanceId, instance.id),
  )).limit(1);
  return conversation || null;
}

async function agentContext(instance: any, conversation: any) {
  const [client, settings, tenant, serviceList, productList, professionals, recentMessages, quotes] = await Promise.all([
    db.select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone }).from(clients).where(and(eq(clients.id, conversation.clientId), eq(clients.tenantId, instance.tenantId))).limit(1),
    db.select().from(whatsappAgentSettings).where(eq(whatsappAgentSettings.tenantId, instance.tenantId)).limit(1),
    db.select({ name: tenants.name, category: tenants.category, currency: tenants.currency, city: tenants.city, phone: tenants.phone }).from(tenants).where(eq(tenants.id, instance.tenantId)).limit(1),
    db.select({ id: services.id, name: services.name, description: services.description, duration: services.duration, price: services.price }).from(services).where(and(eq(services.tenantId, instance.tenantId), eq(services.active, true))).orderBy(asc(services.name)).limit(100),
    db.select({ id: products.id, name: products.name, description: products.description, price: products.price }).from(products).where(and(eq(products.tenantId, instance.tenantId), eq(products.active, true))).orderBy(asc(products.name)).limit(100),
    db.select({ id: collaborators.id, name: collaborators.name, specialties: collaborators.specialties }).from(collaborators).where(and(eq(collaborators.tenantId, instance.tenantId), eq(collaborators.active, true))).orderBy(asc(collaborators.name)).limit(100),
    db.select({ id: whatsappMessages.id, direction: whatsappMessages.direction, authorType: whatsappMessages.authorType, content: whatsappMessages.content, createdAt: whatsappMessages.createdAt }).from(whatsappMessages).where(and(eq(whatsappMessages.tenantId, instance.tenantId), eq(whatsappMessages.conversationId, conversation.id))).orderBy(desc(whatsappMessages.createdAt)).limit(20),
    db.select({ id: whatsappQuotes.id, status: whatsappQuotes.status, total: whatsappQuotes.total, currency: whatsappQuotes.currency, itemSnapshot: whatsappQuotes.itemSnapshot, appointmentId: whatsappQuotes.appointmentId }).from(whatsappQuotes).where(and(eq(whatsappQuotes.tenantId, instance.tenantId), eq(whatsappQuotes.conversationId, conversation.id), inArray(whatsappQuotes.status, ['draft', 'sent', 'accepted']))).orderBy(desc(whatsappQuotes.createdAt)).limit(5),
  ]);
  const configuredSettings = settings[0] || {
    enabled: true,
    tone: 'amable y profesional',
    greeting: null,
    businessContext: null,
    instructions: null,
    bookingInstructions: null,
    handoffMessage: null,
  };
  const effectiveSettings = {
    ...configuredSettings,
    businessContext: [
      configuredSettings.businessContext,
      configuredSettings.greeting ? `Saludo inicial del centro (úsalo en el primer contacto): ${configuredSettings.greeting}` : '',
    ].filter(Boolean).join('\n'),
    instructions: [
      'Solo prepara una cotización cuando el cliente solicite expresamente un presupuesto o confirme intención de compra/reserva. Una pregunta simple por precio o disponibilidad no basta. Antes de confirmar una cita, consigue y confirma el nombre real del cliente; el nombre de perfil de WhatsApp no cuenta como confirmación.',
      configuredSettings.instructions,
      configuredSettings.handoffMessage ? `Mensaje configurado para el traspaso a recepción: ${configuredSettings.handoffMessage}` : '',
    ].filter(Boolean).join('\n'),
  };
  return {
    tenant: tenant[0] || null,
    instance: { id: instance.id, name: instance.evolutionName, label: instance.label, phoneNumber: instance.phoneNumber },
    conversation: { id: conversation.id, status: conversation.status, handlingMode: conversation.handlingMode, assignedUserId: conversation.assignedUserId, handoffReason: conversation.handoffReason, clientNameConfirmed: conversation.clientNameConfirmed },
    client: client[0] || null,
    settings: effectiveSettings,
    services: serviceList,
    products: productList,
    professionals,
    activeQuotes: quotes,
    history: recentMessages.reverse(),
  };
}

async function assignStaff(tenantId: string, reason: string) {
  const clinical = /m[eé]dic|doctor|s[ií]ntom|salud|cl[ií]nic|profesional/i.test(reason);
  if (clinical) {
    const [specialist] = await db.select({ id: users.id }).from(users).where(and(eq(users.tenantId, tenantId), eq(users.role, 'specialist'), eq(users.active, true))).orderBy(asc(users.createdAt)).limit(1);
    if (specialist) return specialist.id;
  }
  const [receptionist] = await db.select({ id: users.id }).from(users).where(and(eq(users.tenantId, tenantId), eq(users.role, 'receptionist'), eq(users.active, true))).orderBy(asc(users.createdAt)).limit(1);
  if (receptionist) return receptionist.id;
  const [admin] = await db.select({ id: users.id }).from(users).where(and(eq(users.tenantId, tenantId), eq(users.role, 'admin'), eq(users.active, true))).orderBy(asc(users.createdAt)).limit(1);
  return admin?.id || null;
}

async function handoff(instance: any, conversation: any, reason: string) {
  const assignedUserId = await assignStaff(instance.tenantId, reason);
  const [updated] = await db.update(whatsappConversations).set({ handlingMode: 'human', assignedUserId, handoffReason: reason.slice(0, 500), updatedAt: new Date() })
    .where(and(eq(whatsappConversations.id, conversation.id), eq(whatsappConversations.tenantId, instance.tenantId))).returning();
  return updated;
}

async function ingest(input: any) {
  const event = input.event && typeof input.event === 'object' ? input.event : input;
  const instanceName = text(event.instance || input.instanceName, 128);
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  const key = data.key && typeof data.key === 'object' ? data.key : {};
  const providerMessageId = text(key.id, 256);
  const remoteJid = text(key.remoteJidAlt || key.remoteJid, 256);
  const eventName = text(event.event || event.type, 80).toLowerCase();
  if (!instanceName || !providerMessageId || !remoteJid || key.fromMe === true || remoteJid.endsWith('@g.us') || (eventName && !eventName.includes('messages.upsert'))) return { skipped: true, reason: 'unsupported_message' };
  const instance = await getInstance(instanceName);
  if (!instance) throw Object.assign(new Error('Instancia no registrada o inactiva.'), { statusCode: 404, code: 'INSTANCE_NOT_FOUND' });
  const phoneNumber = phoneFromJid(remoteJid);
  if (!phoneNumber) return { skipped: true, reason: 'invalid_phone' };
  const [duplicate] = await db.select({ id: whatsappMessages.id, conversationId: whatsappMessages.conversationId }).from(whatsappMessages).where(and(
    eq(whatsappMessages.tenantId, instance.tenantId), eq(whatsappMessages.instanceId, instance.id), eq(whatsappMessages.providerMessageId, providerMessageId),
  )).limit(1);
  if (duplicate) return { duplicate: true, conversationId: duplicate.conversationId };

  let [client] = await db.select().from(clients).where(and(eq(clients.tenantId, instance.tenantId), eq(clients.phone, phoneNumber))).orderBy(asc(clients.createdAt)).limit(1);
  if (!client) [client] = await db.insert(clients).values({ tenantId: instance.tenantId, name: `Contacto WhatsApp ${phoneNumber.slice(-4)}`, phone: phoneNumber }).returning();
  const displayName = text(data.pushName, 120) || null;
  await db.insert(whatsappConversations).values({
    tenantId: instance.tenantId, instanceId: instance.id, clientId: client.id, remoteJid, phoneNumber, displayName, lastMessageAt: new Date(),
  }).onConflictDoNothing({ target: [whatsappConversations.instanceId, whatsappConversations.remoteJid] });
  let [conversation] = await db.select().from(whatsappConversations).where(and(eq(whatsappConversations.instanceId, instance.id), eq(whatsappConversations.remoteJid, remoteJid))).limit(1);
  if (!conversation) throw new Error('No fue posible resolver la conversación.');
  const messageType = ['text', 'audio', 'image', 'video', 'document'].includes(input.messageType) ? input.messageType : 'text';
  const content = text(input.content, 4000) || (messageType === 'audio' ? '[Audio recibido]' : messageType === 'image' ? '[Imagen recibida]' : '[Mensaje recibido]');
  const [stored] = await db.insert(whatsappMessages).values({
    tenantId: instance.tenantId, instanceId: instance.id, conversationId: conversation.id, direction: 'inbound', authorType: 'client',
    providerMessageId, content, messageType, mediaMimeType: text(input.mediaMimeType, 120) || null, deliveryStatus: 'received', metadata: { source: 'evolution' },
  }).onConflictDoNothing().returning();
  if (!stored) return { duplicate: true, conversationId: conversation.id };
  [conversation] = await db.update(whatsappConversations).set({ lastMessageAt: stored.createdAt, updatedAt: new Date() }).where(eq(whatsappConversations.id, conversation.id)).returning();
  return { duplicate: false, messageId: stored.id, inboundMessageId: stored.id, inboundText: content, instanceName, remoteJid, conversationId: conversation.id, context: await agentContext(instance, conversation) };
}

async function prepareQuote(instance: any, conversation: any, itemsInput: any[], notes: string, inboundMessageId: string) {
  const [sourceMessage] = await db.select({ content: whatsappMessages.content }).from(whatsappMessages).where(and(
    eq(whatsappMessages.id, inboundMessageId), eq(whatsappMessages.tenantId, instance.tenantId),
    eq(whatsappMessages.conversationId, conversation.id), eq(whatsappMessages.direction, 'inbound'),
  )).limit(1);
  const sourceRow = inboundMessageId ? (await db.select({ createdAt: whatsappMessages.createdAt }).from(whatsappMessages).where(eq(whatsappMessages.id, inboundMessageId)).limit(1))[0] : null;
  const [previousAssistantMessage] = sourceRow ? await db.select({ content: whatsappMessages.content }).from(whatsappMessages).where(and(
    eq(whatsappMessages.tenantId, instance.tenantId), eq(whatsappMessages.conversationId, conversation.id),
    eq(whatsappMessages.direction, 'outbound'), lt(whatsappMessages.createdAt, sourceRow.createdAt),
  )).orderBy(desc(whatsappMessages.createdAt)).limit(1) : [];
  const quoteWasExplicitlyOffered = Boolean(previousAssistantMessage && /(quieres.*cotizaci[oó]n|preparo.*cotizaci[oó]n|env[ií]e.*cotizaci[oó]n|presupuesto.*confirmar)/i.test(previousAssistantMessage.content));
  const acceptedQuoteOffer = Boolean(sourceMessage && quoteWasExplicitlyOffered && isExplicitQuoteAcceptance(sourceMessage.content, true));
  if (!sourceMessage || (!isExplicitQuoteIntent(sourceMessage.content) && !acceptedQuoteOffer)) {
    throw Object.assign(new Error('La cotización requiere una solicitud o intención de compra explícita del cliente.'), { statusCode: 409, code: 'PURCHASE_INTENT_REQUIRED' });
  }
  if (!Array.isArray(itemsInput) || itemsInput.length < 1 || itemsInput.length > 10) throw Object.assign(new Error('La cotización requiere de 1 a 10 servicios o productos.'), { statusCode: 422, code: 'INVALID_QUOTE_ITEMS' });
  const itemSnapshot: WhatsAppQuoteItemSnapshot[] = [];
  for (const item of itemsInput) {
    const itemType = item.itemType === 'service' || item.itemType === 'product' ? item.itemType : null;
    const itemId = text(item.itemId, 80);
    const quantity = Number(item.quantity ?? 1);
    if (!itemType || !itemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw Object.assign(new Error('Artículo o cantidad no válido.'), { statusCode: 422, code: 'INVALID_QUOTE_ITEMS' });
    if (itemType === 'service') {
      const [service] = await db.select().from(services).where(and(eq(services.id, itemId), eq(services.tenantId, instance.tenantId), eq(services.active, true))).limit(1);
      if (!service) throw Object.assign(new Error('Servicio activo no encontrado.'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });
      const price = Number(service.price);
      itemSnapshot.push({ itemType, itemId, name: service.name, quantity, unitPrice: price.toFixed(2), totalPrice: (price * quantity).toFixed(2), durationMinutes: service.duration });
    } else {
      const [product] = await db.select().from(products).where(and(eq(products.id, itemId), eq(products.tenantId, instance.tenantId), eq(products.active, true))).limit(1);
      if (!product) throw Object.assign(new Error('Producto activo no encontrado.'), { statusCode: 404, code: 'ITEM_NOT_FOUND' });
      if (product.stock < quantity) throw Object.assign(new Error('No hay disponibilidad suficiente para cotizar esa cantidad.'), { statusCode: 409, code: 'PRODUCT_STOCK_UNAVAILABLE' });
      const price = Number(product.price);
      itemSnapshot.push({ itemType, itemId, name: product.name, quantity, unitPrice: price.toFixed(2), totalPrice: (price * quantity).toFixed(2) });
    }
  }
  const total = itemSnapshot.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const [tenant] = await db.select({ currency: tenants.currency }).from(tenants).where(eq(tenants.id, instance.tenantId)).limit(1);
  const [quote] = await db.insert(whatsappQuotes).values({
    tenantId: instance.tenantId, conversationId: conversation.id, clientId: conversation.clientId,
    currency: tenant?.currency || 'COP', subtotal: total.toFixed(2), total: total.toFixed(2), itemSnapshot,
    notes: notes || null, expiresAt: new Date(Date.now() + 7 * 86400000),
  }).returning();
  return quote;
}

async function acceptQuote(instance: any, conversation: any, input: any) {
  const [quote] = await db.select().from(whatsappQuotes).where(and(
    eq(whatsappQuotes.id, text(input.quoteId, 80)), eq(whatsappQuotes.tenantId, instance.tenantId), eq(whatsappQuotes.conversationId, conversation.id),
  )).limit(1);
  if (!quote || quote.status !== 'sent' || (quote.expiresAt && quote.expiresAt < new Date())) throw Object.assign(new Error('No hay cotización vigente pendiente de aceptación.'), { statusCode: 409, code: 'QUOTE_NOT_PENDING' });
  const [inbound] = await db.select().from(whatsappMessages).where(and(eq(whatsappMessages.id, text(input.inboundMessageId, 80)), eq(whatsappMessages.conversationId, conversation.id), eq(whatsappMessages.direction, 'inbound'))).limit(1);
  const [lastOutbound] = await db.select().from(whatsappMessages).where(and(eq(whatsappMessages.conversationId, conversation.id), eq(whatsappMessages.direction, 'outbound'), gte(whatsappMessages.createdAt, quote.sentAt || quote.createdAt))).orderBy(desc(whatsappMessages.createdAt)).limit(1);
  const invited = Boolean(lastOutbound && /(aceptas|aceptar|confirmas|confirmar|quieres reservar|te gustar[ií]a reservar|deseas reservar)/i.test(lastOutbound.content));
  if (!inbound || !isExplicitQuoteAcceptance(inbound.content, invited)) throw Object.assign(new Error('El mensaje no expresa aceptación explícita de la cotización.'), { statusCode: 409, code: 'QUOTE_ACCEPTANCE_NOT_EXPLICIT' });
  const [updated] = await db.update(whatsappQuotes).set({ status: 'accepted', acceptedAt: new Date(), acceptedMessageId: inbound.id }).where(and(eq(whatsappQuotes.id, quote.id), eq(whatsappQuotes.status, 'sent'))).returning();
  if (!updated) throw Object.assign(new Error('La cotización ya fue procesada.'), { statusCode: 409, code: 'QUOTE_ALREADY_PROCESSED' });

  const serviceItems = quote.itemSnapshot.filter((item) => item.itemType === 'service');
  const productOnly = quote.itemSnapshot.every((item) => item.itemType === 'product');
  const singleServiceQuote = quote.itemSnapshot.length === 1 && serviceItems.length === 1;
  const startAt = new Date(String(input.startAt || ''));
  const professionalId = text(input.professionalId, 80);
  if (singleServiceQuote && !conversation.clientNameConfirmed) {
    const updatedConversation = await handoff(instance, conversation, 'Cotización aceptada; recepción debe confirmar el nombre antes de reservar la cita.');
    return { accepted: true, needsHuman: true, reason: 'CLIENT_NAME_NOT_CONFIRMED', assignedUserId: updatedConversation.assignedUserId, quote: updated };
  }
  if (!singleServiceQuote || productOnly || Number.isNaN(startAt.valueOf()) || !professionalId) {
    const reason = productOnly ? 'Cotización de producto aceptada; requiere gestión de recepción en POS.' : 'Cotización aceptada; faltan horario y profesional confirmados.';
    const updatedConversation = await handoff(instance, conversation, reason);
    return { accepted: true, needsHuman: true, assignedUserId: updatedConversation.assignedUserId, quote: updated };
  }

  const externalId = `whatsapp_quote:${quote.id}`;
  const [priorBooking] = await db.select().from(appointments).where(and(eq(appointments.tenantId, instance.tenantId), eq(appointments.externalId, externalId))).limit(1);
  if (priorBooking) {
    const [syncedQuote] = await db.update(whatsappQuotes).set({ appointmentId: priorBooking.id }).where(eq(whatsappQuotes.id, quote.id)).returning();
    return { accepted: true, appointment: priorBooking, quote: syncedQuote };
  }
  const [service] = await db.select().from(services).where(and(eq(services.id, serviceItems[0].itemId), eq(services.tenantId, instance.tenantId), eq(services.active, true))).limit(1);
  const [professional] = await db.select().from(collaborators).where(and(eq(collaborators.id, professionalId), eq(collaborators.tenantId, instance.tenantId), eq(collaborators.active, true))).limit(1);
  if (!service || !professional) throw Object.assign(new Error('Servicio o profesional no disponible.'), { statusCode: 409, code: 'BOOKING_RESOURCE_UNAVAILABLE' });
  const endAt = new Date(startAt.getTime() + service.duration * 60000);
  const available = await getWhatsAppAvailability({
    tenantId: instance.tenantId, serviceId: service.id, from: new Date(startAt.getTime() - 60000).toISOString(),
    to: new Date(endAt.getTime() + 30 * 60000).toISOString(), professionalId,
    timezone: text(input.timezone, 80) || 'America/Bogota',
  });
  const exactSlot = available.slots.some((slot) => new Date(slot.startAt).getTime() === startAt.getTime());
  if (!exactSlot || await findAppointmentConflict({ tenantId: instance.tenantId, professionalId, start: startAt, end: endAt })) {
    const updatedConversation = await handoff(instance, conversation, 'El horario solicitado ya no está disponible; recepción debe ofrecer una alternativa.');
    return { accepted: true, needsHuman: true, reason: 'APPOINTMENT_SLOT_UNAVAILABLE', assignedUserId: updatedConversation.assignedUserId, quote: updated };
  }
  let appointment: any;
  try {
    [appointment] = await db.insert(appointments).values({ tenantId: instance.tenantId, clientId: conversation.clientId, specialistId: professional.id,
      serviceId: service.id, startTime: startAt, endTime: endAt, status: 'scheduled', notes: `Confirmada por WhatsApp; cotización ${quote.id}`, externalId }).returning();
  } catch (e: any) {
    if (e?.code !== '23505') throw e;
    [appointment] = await db.select().from(appointments).where(and(eq(appointments.tenantId, instance.tenantId), eq(appointments.externalId, externalId))).limit(1);
    if (!appointment) throw e;
  }
  const [bookedQuote] = await db.update(whatsappQuotes).set({ appointmentId: appointment.id }).where(eq(whatsappQuotes.id, quote.id)).returning();
  void dispatchWebhook(instance.tenantId, 'appointment.created', { id: appointment.id, client_id: appointment.clientId, service_id: appointment.serviceId, professional_id: appointment.specialistId, start_at: appointment.startTime, end_at: appointment.endTime, status: appointment.status });
  return { accepted: true, appointment, quote: bookedQuote };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return fail(res, 405, 'METHOD_NOT_ALLOWED', 'Solo se acepta POST.');
  const expected = Buffer.from(process.env.MIESBE_N8N_API_KEY || '');
  const authorization = String(req.headers?.authorization || '');
  const provided = Buffer.from(authorization.startsWith('Bearer ') ? authorization.slice(7) : String(req.headers?.['x-miesbe-api-key'] || ''));
  if (expected.length < 32 || provided.length !== expected.length || !timingSafeEqual(expected, provided)) return fail(res, 401, 'AUTOMATION_AUTH_FAILED', 'Credencial de automatización no válida.');
  const body = req.body || {};
  try {
    if (body.action === 'ingest') return send(res, 200, await ingest(body));
    const instance = await getInstance(text(body.instanceName, 128));
    if (!instance) return fail(res, 404, 'INSTANCE_NOT_FOUND', 'Instancia no registrada o inactiva.');
    const conversation = await getConversation(instance, text(body.conversationId, 80));
    if (!conversation) return fail(res, 404, 'CONVERSATION_NOT_FOUND', 'Conversación no encontrada para esa instancia.');
    if (body.action === 'context') return send(res, 200, await agentContext(instance, conversation));
    if (body.action === 'update_client') {
      const name = text(body.name, 120);
      const email = text(body.email, 254);
      const sourceMessageId = text(body.inboundMessageId, 80);
      const [sourceMessage] = sourceMessageId ? await db.select().from(whatsappMessages).where(and(
        eq(whatsappMessages.id, sourceMessageId), eq(whatsappMessages.conversationId, conversation.id), eq(whatsappMessages.direction, 'inbound'),
      )).limit(1) : [];
      if ((name || email) && !sourceMessage) return fail(res, 409, 'SOURCE_MESSAGE_REQUIRED', 'Los datos de contacto deben corresponder a un mensaje entrante.');
      const sourceText = sourceMessage?.content.toLowerCase() || '';
      if (name && !sourceText.includes(name.toLowerCase())) return fail(res, 409, 'NAME_NOT_CONFIRMED', 'El nombre debe estar presente en el mensaje entrante.');
      if (email && !sourceText.includes(email.toLowerCase())) return fail(res, 409, 'EMAIL_NOT_CONFIRMED', 'El correo debe estar presente en el mensaje entrante.');
      const update: Record<string, unknown> = {};
      if (name && !name.toLowerCase().startsWith('contacto whatsapp')) update.name = name;
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) update.email = email;
      if (Object.keys(update).length) await db.update(clients).set(update).where(and(eq(clients.id, conversation.clientId), eq(clients.tenantId, instance.tenantId)));
      if (body.nameConfirmed === true && name) await db.update(whatsappConversations).set({ clientNameConfirmed: true, updatedAt: new Date() }).where(eq(whatsappConversations.id, conversation.id));
      return send(res, 200, { updated: Object.keys(update).length > 0 });
    }
    if (body.action === 'store_message') {
      const content = text(body.content, 4000);
      if (!content) return fail(res, 422, 'MESSAGE_REQUIRED', 'El mensaje está vacío.');
      const direction = body.direction === 'inbound' ? 'inbound' : 'outbound';
      const idempotencyKey = text(body.idempotencyKey, 200);
      const providerMessageId = text(body.providerMessageId, 256) || null;
      if (direction === 'outbound' && !idempotencyKey && !providerMessageId) return fail(res, 422, 'IDEMPOTENCY_REQUIRED', 'Los mensajes salientes requieren idempotencyKey o providerMessageId.');
      const authorUserId = text(body.authorUserId, 80) || null;
      if (authorUserId) {
        const [author] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, authorUserId), eq(users.tenantId, instance.tenantId), eq(users.active, true))).limit(1);
        if (!author) return fail(res, 403, 'AUTHOR_NOT_ALLOWED', 'El remitente no pertenece a este tenant o no está activo.');
      }
      if (idempotencyKey) {
        const [pending] = await db.select().from(whatsappMessages).where(and(
          eq(whatsappMessages.tenantId, instance.tenantId), eq(whatsappMessages.conversationId, conversation.id), eq(whatsappMessages.idempotencyKey, idempotencyKey),
        )).limit(1);
        if (pending) {
          const status = ['pending', 'sent', 'delivered', 'read', 'failed', 'unknown', 'received'].includes(body.deliveryStatus) ? body.deliveryStatus : pending.deliveryStatus;
          const [updated] = await db.update(whatsappMessages).set({
            providerMessageId: providerMessageId || pending.providerMessageId,
            deliveryStatus: status,
            content,
            sentAt: direction === 'outbound' && ['sent', 'delivered', 'read'].includes(status) ? new Date() : pending.sentAt,
          }).where(eq(whatsappMessages.id, pending.id)).returning();
          await db.update(whatsappConversations).set({ lastMessageAt: updated.createdAt, updatedAt: new Date() }).where(eq(whatsappConversations.id, conversation.id));
          return send(res, 200, { duplicate: true, message: updated, conversationId: conversation.id });
        }
      }
      const [message] = await db.insert(whatsappMessages).values({
        tenantId: instance.tenantId, instanceId: instance.id, conversationId: conversation.id, direction,
        authorType: direction === 'inbound' ? 'client' : body.authorType === 'user' ? 'user' : 'agent',
        authorUserId,
        providerMessageId,
        idempotencyKey: idempotencyKey || null,
        content, messageType: text(body.messageType, 40) || 'text', mediaMimeType: text(body.mediaMimeType, 120) || null,
        deliveryStatus: ['pending', 'sent', 'delivered', 'read', 'failed', 'unknown', 'received'].includes(body.deliveryStatus) ? body.deliveryStatus : (direction === 'inbound' ? 'received' : 'sent'),
        sentAt: direction === 'outbound' && ['sent', 'delivered', 'read'].includes(body.deliveryStatus) ? new Date() : null,
      }).onConflictDoNothing().returning();
      if (!message) return send(res, 200, { duplicate: true, conversationId: conversation.id });
      await db.update(whatsappConversations).set({ lastMessageAt: message.createdAt, updatedAt: new Date() }).where(eq(whatsappConversations.id, conversation.id));
      return send(res, 201, { duplicate: false, message, conversationId: conversation.id });
    }
    if (body.action === 'prepare_quote') return send(res, 201, { quote: await prepareQuote(instance, conversation, body.items, text(body.notes, 1000), text(body.inboundMessageId, 80)) });
    if (body.action === 'mark_quote_sent') {
      const quoteId = text(body.quoteId, 80);
      const [draftQuote] = quoteId
        ? await db.select({ id: whatsappQuotes.id }).from(whatsappQuotes).where(and(eq(whatsappQuotes.id, quoteId), eq(whatsappQuotes.tenantId, instance.tenantId), eq(whatsappQuotes.conversationId, conversation.id), eq(whatsappQuotes.status, 'draft'))).limit(1)
        : await db.select({ id: whatsappQuotes.id }).from(whatsappQuotes).where(and(eq(whatsappQuotes.tenantId, instance.tenantId), eq(whatsappQuotes.conversationId, conversation.id), eq(whatsappQuotes.status, 'draft'))).orderBy(desc(whatsappQuotes.createdAt)).limit(1);
      const [quote] = draftQuote ? await db.update(whatsappQuotes).set({ status: 'sent', sentAt: new Date(), sentMessageId: text(body.messageId, 80) || null }).where(eq(whatsappQuotes.id, draftQuote.id)).returning() : [];
      return quote ? send(res, 200, { quote }) : fail(res, 409, 'QUOTE_NOT_DRAFT', 'La cotización ya se envió o no pertenece a la conversación.');
    }
    if (body.action === 'accept_quote') return send(res, 200, await acceptQuote(instance, conversation, body));
    if (body.action === 'availability') return send(res, 200, await getWhatsAppAvailability({
      tenantId: instance.tenantId, serviceId: text(body.serviceId, 80), from: text(body.from, 80), to: text(body.to, 80),
      professionalId: text(body.professionalId, 80) || undefined, timezone: text(body.timezone, 80) || 'America/Bogota',
    }));
    if (body.action === 'handoff') {
      const updated = await handoff(instance, conversation, text(body.reason, 500) || 'El cliente solicitó atención humana.');
      return send(res, 200, { handedOff: true, assignedUserId: updated.assignedUserId, conversationId: updated.id });
    }
    return fail(res, 422, 'UNSUPPORTED_ACTION', 'Acción de WhatsApp no soportada.');
  } catch (e: any) {
    return fail(res, e.statusCode || 500, e.code || 'WHATSAPP_AGENT_FAILED', e.statusCode ? e.message : 'No fue posible procesar la solicitud de WhatsApp.');
  }
}
