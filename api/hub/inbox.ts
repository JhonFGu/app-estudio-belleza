import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../src/db/index.js';
import { hubConversationMessages, hubConversations } from '../../src/db/schema.js';
import { getSessionUser } from '../../src/utils/session-auth.js';
import { hasMessageReadPermission } from '../../src/utils/hub-inbox.js';

const fail = (res: any, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return fail(res, 410, 'HUB_INBOX_RETIRED', 'La atención activa de WhatsApp se gestiona desde el inbox nativo de Miesbe.');
  const user = await getSessionUser(req);
  if (!user) return fail(res, 401, 'SESSION_REQUIRED', 'Inicia sesión para consultar el archivo de conversaciones.');
  if (!hasMessageReadPermission(user)) return fail(res, 403, 'FORBIDDEN', 'No tienes permiso para leer Mensajes.');

  try {
    const conversations = await db.select().from(hubConversations)
      .where(and(eq(hubConversations.tenantId, user.tenantId), isNull(hubConversations.deletedAt)))
      .orderBy(desc(hubConversations.lastMessageAt)).limit(200);
    const conversationId = String(Array.isArray(req.query?.conversationId) ? req.query.conversationId[0] : req.query?.conversationId || '');
    if (!conversationId) return res.status(200).json({ conversations, source: 'hub_archive', readOnly: true });
    const conversation = conversations.find((item) => item.hubConversationId === conversationId);
    if (!conversation) return fail(res, 404, 'CONVERSATION_NOT_FOUND', 'Conversación archivada no encontrada.');
    const messages = await db.select().from(hubConversationMessages).where(and(
      eq(hubConversationMessages.tenantId, user.tenantId),
      eq(hubConversationMessages.conversationId, conversation.id),
      isNull(hubConversationMessages.redactedAt),
    )).orderBy(hubConversationMessages.createdAtHub).limit(1000);
    return res.status(200).json({ conversation, messages, source: 'hub_archive', readOnly: true });
  } catch {
    return fail(res, 503, 'HUB_ARCHIVE_UNAVAILABLE', 'No fue posible consultar el archivo local de conversaciones.');
  }
}
