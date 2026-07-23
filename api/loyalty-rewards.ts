import { db } from '../src/db';
import { loyaltyRewards } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

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
        const all = await db
          .select()
          .from(loyaltyRewards)
          .where(eq(loyaltyRewards.tenantId, tenantId))
          .orderBy(loyaltyRewards.pointsCost);
        return res.status(200).json(all);
      }

      case 'POST': {
        const { name, description, pointsCost, type, value, serviceId } = req.body;
        if (!name || !pointsCost || !type) {
          return res.status(400).json({ error: 'name, pointsCost y type son obligatorios.' });
        }

        const [reward] = await db
          .insert(loyaltyRewards)
          .values({
            tenantId,
            name,
            description: description || null,
            pointsCost,
            type,
            value: value || null,
            serviceId: serviceId || null,
          })
          .returning();

        return res.status(201).json(reward);
      }

      case 'PUT': {
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la recompensa.' });
        }

        const { name, description, pointsCost, type, value, serviceId, active } = req.body;
        const [updated] = await db
          .update(loyaltyRewards)
          .set({
            name: name || undefined,
            description: description !== undefined ? description : undefined,
            pointsCost: pointsCost !== undefined ? pointsCost : undefined,
            type: type || undefined,
            value: value !== undefined ? value : undefined,
            serviceId: serviceId !== undefined ? serviceId : undefined,
            active: active !== undefined ? active : undefined,
          })
          .where(and(eq(loyaltyRewards.id, id), eq(loyaltyRewards.tenantId, tenantId)))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Recompensa no encontrada.' });
        }
        return res.status(200).json(updated);
      }

      case 'DELETE': {
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la recompensa.' });
        }

        const [deleted] = await db
          .delete(loyaltyRewards)
          .where(and(eq(loyaltyRewards.id, id), eq(loyaltyRewards.tenantId, tenantId)))
          .returning();

        if (!deleted) {
          return res.status(404).json({ error: 'Recompensa no encontrada.' });
        }
        return res.status(200).json({ message: 'Recompensa eliminada.', deleted });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Metodo ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
