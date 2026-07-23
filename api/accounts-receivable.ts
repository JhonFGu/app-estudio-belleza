import { db } from '../src/db';
import { accountsReceivable } from '../src/db/schema';
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
          const result = await db
            .select()
            .from(accountsReceivable)
            .where(and(eq(accountsReceivable.id, id), eq(accountsReceivable.tenantId, tenantId)))
            .limit(1);
          if (result.length === 0) {
            return res.status(404).json({ error: 'Registro de cuenta por cobrar no encontrado.' });
          }
          return res.status(200).json(result[0]);
        } else {
          const list = await db
            .select()
            .from(accountsReceivable)
            .where(eq(accountsReceivable.tenantId, tenantId))
            .orderBy(desc(accountsReceivable.createdAt));
          return res.status(200).json(list);
        }

      case 'POST': {
        const { invoiceNumber, description, category, totalValue, status, documentUrl, createdAt } = req.body;
        if (!description || !category || totalValue === undefined) {
          return res.status(400).json({ error: 'La descripción, categoría y valor total son requeridos.' });
        }
        const [newItem] = await db
          .insert(accountsReceivable)
          .values({
            tenantId,
            invoiceNumber: invoiceNumber || null,
            description,
            category,
            totalValue: String(totalValue),
            status: status || 'pending',
            documentUrl: documentUrl || null,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
          })
          .returning();
        return res.status(201).json(newItem);
      }

      case 'PUT': {
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del registro para actualizar.' });
        }
        const updateData = req.body;
        const [updatedItem] = await db
          .update(accountsReceivable)
          .set({
            invoiceNumber: updateData.invoiceNumber,
            description: updateData.description,
            category: updateData.category,
            totalValue: updateData.totalValue ? String(updateData.totalValue) : undefined,
            status: updateData.status,
            documentUrl: updateData.documentUrl,
            createdAt: updateData.createdAt ? new Date(updateData.createdAt) : undefined,
          })
          .where(and(eq(accountsReceivable.id, id), eq(accountsReceivable.tenantId, tenantId)))
          .returning();
        if (!updatedItem) {
          return res.status(404).json({ error: 'Registro no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json(updatedItem);
      }

      case 'DELETE': {
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del registro para eliminar.' });
        }
        const [deletedItem] = await db
          .delete(accountsReceivable)
          .where(and(eq(accountsReceivable.id, id), eq(accountsReceivable.tenantId, tenantId)))
          .returning();
        if (!deletedItem) {
          return res.status(404).json({ error: 'Registro no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json({ message: 'Registro eliminado correctamente.', deletedItem });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
