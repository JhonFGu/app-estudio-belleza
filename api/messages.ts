import { db } from '../src/db';
import { messages, clients } from '../src/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    return res.status(400).json({ error: 'Falta la cabecera x-tenant-id para aislar datos.' });
  }

  const { clientId } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (clientId) {
          // Obtener la conversación con un cliente específico ordenada cronológicamente
          const chatHistory = await db
            .select()
            .from(messages)
            .where(and(eq(messages.clientId, clientId), eq(messages.tenantId, tenantId)))
            .orderBy(asc(messages.createdAt));
          return res.status(200).json(chatHistory);
        } else {
          // Listado de últimos mensajes de todos los clientes
          const recentMessages = await db
            .select()
            .from(messages)
            .where(eq(messages.tenantId, tenantId))
            .orderBy(desc(messages.createdAt));
          return res.status(200).json(recentMessages);
        }

      case 'POST':
        const { clientId: postClientId, direction, content, channel, status } = req.body;
        if (!postClientId || !direction || !content) {
          return res.status(400).json({ error: 'Cliente, dirección y contenido del mensaje son obligatorios.' });
        }
        const [newMessage] = await db
          .insert(messages)
          .values({
            tenantId,
            clientId: postClientId,
            direction,
            content,
            channel: channel || 'whatsapp',
            status: status || 'sent',
          })
          .returning();
        return res.status(201).json(newMessage);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
