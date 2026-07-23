import { db } from '../src/db';
import { clientActivityLog } from '../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

  try {
    switch (req.method) {
      case 'GET': {
        const { clientId } = req.query;
        if (!clientId) {
          return res.status(400).json({ error: 'Se requiere clientId.' });
        }

        const activities = await db
          .select()
          .from(clientActivityLog)
          .where(
            and(
              eq(clientActivityLog.tenantId, tenantId),
              eq(clientActivityLog.clientId, clientId)
            )
          )
          .orderBy(desc(clientActivityLog.createdAt));

        return res.status(200).json(activities);
      }

      case 'POST': {
        const { clientId, action, description, metadata } = req.body;

        if (!clientId || !action || !description) {
          return res.status(400).json({ error: 'clientId, action y description son obligatorios.' });
        }

        const validActions = ['reactivation_attempt', 'note', 'manual_points', 'redemption', 'appointment_completed', 'appointment_cancelled', 'appointment_no_show'];
        if (!validActions.includes(action)) {
          return res.status(400).json({ error: `Accion invalida. Validas: ${validActions.join(', ')}` });
        }

        const [entry] = await db
          .insert(clientActivityLog)
          .values({
            tenantId,
            clientId,
            action,
            description,
            metadata: metadata || null,
          })
          .returning();

        return res.status(201).json(entry);
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Metodo ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
