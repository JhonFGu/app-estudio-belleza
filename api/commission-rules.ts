import { db } from '../src/db/index.js';
import { commissionRules, services, products, collaborators } from '../src/db/schema.js';
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
          const rule = await db.query.commissionRules.findFirst({
            where: and(eq(commissionRules.id, id), eq(commissionRules.tenantId, tenantId)),
            with: {
              collaborator: true,
              service: true,
              product: true,
            },
          });
          if (!rule) {
            return res.status(404).json({ error: 'Regla de comisión no encontrada.' });
          }
          return res.status(200).json(rule);
        } else {
          const allRules = await db.query.commissionRules.findMany({
            where: eq(commissionRules.tenantId, tenantId),
            with: {
              collaborator: true,
              service: true,
              product: true,
            },
            orderBy: [desc(commissionRules.createdAt)],
          });
          return res.status(200).json(allRules);
        }

      case 'POST':
        const { collaboratorId, serviceId, productId, commissionRate } = req.body;
        if (!collaboratorId || !commissionRate) {
          return res.status(400).json({ error: 'El colaborador y el porcentaje de comisión son obligatorios.' });
        }
        if (!serviceId && !productId) {
          return res.status(400).json({ error: 'Debe especificar un servicio o un producto.' });
        }
        if (serviceId && productId) {
          return res.status(400).json({ error: 'Solo puede especificar un servicio O un producto, no ambos.' });
        }

        const [newRule] = await db
          .insert(commissionRules)
          .values({
            tenantId,
            collaboratorId,
            serviceId: serviceId || null,
            productId: productId || null,
            commissionRate: commissionRate,
            isActive: true,
          })
          .returning();

        const createdRule = await db.query.commissionRules.findFirst({
          where: eq(commissionRules.id, newRule.id),
          with: {
            collaborator: true,
            service: true,
            product: true,
          },
        });
        return res.status(201).json(createdRule);

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la regla para actualizar.' });
        }

        const updateData = req.body;
        const existingRule = await db.query.commissionRules.findFirst({
          where: and(eq(commissionRules.id, id), eq(commissionRules.tenantId, tenantId)),
        });
        if (!existingRule) {
          return res.status(404).json({ error: 'Regla no encontrada.' });
        }

        const setData: Record<string, any> = {};
        if (updateData.commissionRate !== undefined) setData.commissionRate = updateData.commissionRate;
        if (updateData.isActive !== undefined) setData.isActive = updateData.isActive;

        if (Object.keys(setData).length === 0) {
          return res.status(400).json({ error: 'No hay campos para actualizar.' });
        }

        const [updatedRule] = await db
          .update(commissionRules)
          .set(setData)
          .where(and(eq(commissionRules.id, id), eq(commissionRules.tenantId, tenantId)))
          .returning();

        const ruleWithRelations = await db.query.commissionRules.findFirst({
          where: eq(commissionRules.id, updatedRule.id),
          with: {
            collaborator: true,
            service: true,
            product: true,
          },
        });
        return res.status(200).json(ruleWithRelations);

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la regla para eliminar.' });
        }
        const [deletedRule] = await db
          .delete(commissionRules)
          .where(and(eq(commissionRules.id, id), eq(commissionRules.tenantId, tenantId)))
          .returning();
        if (!deletedRule) {
          return res.status(404).json({ error: 'Regla no encontrada o no pertenece a su cuenta.' });
        }
        return res.status(200).json({ message: 'Regla eliminada correctamente.', deletedRule });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
