import { db } from '../db/index.js';
import { services } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

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

  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (id) {
          const service = await db
            .select()
            .from(services)
            .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
            .limit(1);
          if (service.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
          }
          return res.status(200).json(service[0]);
        } else {
          const allServices = await db
            .select()
            .from(services)
            .where(eq(services.tenantId, tenantId))
            .orderBy(desc(services.createdAt));
          return res.status(200).json(allServices);
        }

      case 'POST':
        const { name, description, duration, price, active } = req.body;
        if (!name || duration === undefined || price === undefined) {
          return res.status(400).json({ error: 'Nombre, duración y precio son obligatorios.' });
        }
        const [newService] = await db
          .insert(services)
          .values({
            tenantId,
            name,
            description,
            duration,
            price,
            active: active !== undefined ? active : true,
          })
          .returning();
        return res.status(201).json(newService);

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del servicio para actualizar.' });
        }
        const updateData = req.body;
        const [updatedService] = await db
          .update(services)
          .set({
            name: updateData.name,
            description: updateData.description,
            duration: updateData.duration,
            price: updateData.price,
            active: updateData.active,
          })
          .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
          .returning();
        if (!updatedService) {
          return res.status(404).json({ error: 'Servicio no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json(updatedService);

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del servicio para eliminar.' });
        }
        const [deletedService] = await db
          .delete(services)
          .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
          .returning();
        if (!deletedService) {
          return res.status(404).json({ error: 'Servicio no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json({ message: 'Servicio eliminado correctamente.', deletedService });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
