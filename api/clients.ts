import { db } from '../src/db';
import { clients } from '../src/db/schema';
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
          // Detalle de un cliente específico
          const clientData = await db
            .select()
            .from(clients)
            .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
            .limit(1);
          if (clientData.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
          }
          return res.status(200).json(clientData[0]);
        } else {
          // Listado general de clientes del tenant
          const allClients = await db
            .select()
            .from(clients)
            .where(eq(clients.tenantId, tenantId))
            .orderBy(desc(clients.createdAt));
          return res.status(200).json(allClients);
        }

      case 'POST':
        const { name, email, phone, notes } = req.body;
        if (!name || !phone) {
          return res.status(400).json({ error: 'El nombre y teléfono son obligatorios.' });
        }
        const [newClient] = await db
          .insert(clients)
          .values({
            tenantId,
            name,
            email,
            phone,
            notes,
          })
          .returning();
        return res.status(201).json(newClient);

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del cliente para actualizar.' });
        }
        const updateData = req.body;
        const [updatedClient] = await db
          .update(clients)
          .set({
            name: updateData.name,
            email: updateData.email,
            phone: updateData.phone,
            notes: updateData.notes,
          })
          .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
          .returning();
        if (!updatedClient) {
          return res.status(404).json({ error: 'Cliente no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json(updatedClient);

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del cliente para eliminar.' });
        }
        const [deletedClient] = await db
          .delete(clients)
          .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
          .returning();
        if (!deletedClient) {
          return res.status(404).json({ error: 'Cliente no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json({ message: 'Cliente eliminado correctamente.', deletedClient });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
