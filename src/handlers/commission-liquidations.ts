import { db } from '../db/index.js';
import {
  commissionLiquidations,
  commissionLiquidationItems,
  commissionRules,
  transactionItems,
  transactions,
  services,
  products,
  collaborators,
  cashRegisters,
} from '../db/schema.js';
import { eq, and, gte, lte, isNull, desc, sum, sql } from 'drizzle-orm';

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

  const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const action = req.query?.action || urlObj.searchParams.get('action');
  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (action === 'pending') {
          const collaboratorIdParam = req.query?.collaboratorId || urlObj.searchParams.get('collaboratorId');
          const periodStart = req.query?.periodStart || urlObj.searchParams.get('periodStart');
          const periodEnd = req.query?.periodEnd || urlObj.searchParams.get('periodEnd');

          if (!collaboratorIdParam) {
            return res.status(400).json({ error: 'Se requiere collaboratorId.' });
          }

          const filters = [
            eq(transactionItems.collaboratorId, collaboratorIdParam),
            eq(transactions.tenantId, tenantId),
            eq(transactions.type, 'sale'),
          ];

          if (periodStart) filters.push(gte(transactions.createdAt, new Date(periodStart)));
          if (periodEnd) filters.push(lte(transactions.createdAt, new Date(periodEnd)));

          const pendingItems = await db
            .select({
              id: transactionItems.id,
              transactionId: transactionItems.transactionId,
              serviceId: transactionItems.serviceId,
              productId: transactionItems.productId,
              quantity: transactionItems.quantity,
              unitPrice: transactionItems.unitPrice,
              commissionPaid: transactionItems.commissionPaid,
              createdAt: transactions.createdAt,
              serviceName: services.name,
              productName: products.name,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .leftJoin(services, eq(transactionItems.serviceId, services.id))
            .leftJoin(products, eq(transactionItems.productId, products.id))
            .where(and(...filters))
            .orderBy(desc(transactions.createdAt));

          return res.status(200).json(pendingItems);
        }

        if (id) {
          const liquidation = await db.query.commissionLiquidations.findFirst({
            where: and(eq(commissionLiquidations.id, id), eq(commissionLiquidations.tenantId, tenantId)),
            with: {
              collaborator: true,
              items: {
                with: {
                  transactionItem: {
                    with: {
                      service: true,
                      product: true,
                      transaction: true,
                    },
                  },
                },
              },
            },
          });
          if (!liquidation) {
            return res.status(404).json({ error: 'Liquidación no encontrada.' });
          }
          return res.status(200).json(liquidation);
        } else {
          const allLiquidations = await db.query.commissionLiquidations.findMany({
            where: eq(commissionLiquidations.tenantId, tenantId),
            with: {
              collaborator: true,
              items: true,
            },
            orderBy: [desc(commissionLiquidations.createdAt)],
          });
          return res.status(200).json(allLiquidations);
        }

      case 'POST':
        const { collaboratorId, periodStart, periodEnd, notes, transactionItemIds } = req.body;

        if (!collaboratorId || !periodStart || !periodEnd) {
          return res.status(400).json({ error: 'Colaborador, período inicio y período fin son obligatorios.' });
        }

        if (!transactionItemIds || !Array.isArray(transactionItemIds) || transactionItemIds.length === 0) {
          return res.status(400).json({ error: 'Debe incluir al menos un ítem de transacción para liquidar.' });
        }

        let totalAmount = 0;
        const liquidationItemsData: any[] = [];

        for (const tiId of transactionItemIds) {
          const [ti] = await db
            .select({
              id: transactionItems.id,
              commissionPaid: transactionItems.commissionPaid,
              serviceId: transactionItems.serviceId,
              productId: transactionItems.productId,
              collaboratorId: transactionItems.collaboratorId,
              unitPrice: transactionItems.unitPrice,
              quantity: transactionItems.quantity,
            })
            .from(transactionItems)
            .where(eq(transactionItems.id, tiId))
            .limit(1);

          if (!ti) continue;
          if (ti.collaboratorId !== collaboratorId) continue;

          let appliedRate = '0.00';
          if (ti.serviceId) {
            const [rule] = await db
              .select({ commissionRate: commissionRules.commissionRate })
              .from(commissionRules)
              .where(
                and(
                  eq(commissionRules.collaboratorId, collaboratorId),
                  eq(commissionRules.serviceId, ti.serviceId),
                  eq(commissionRules.isActive, true),
                ),
              )
              .limit(1);
            if (rule) appliedRate = rule.commissionRate;
          } else if (ti.productId) {
            const [rule] = await db
              .select({ commissionRate: commissionRules.commissionRate })
              .from(commissionRules)
              .where(
                and(
                  eq(commissionRules.collaboratorId, collaboratorId),
                  eq(commissionRules.productId, ti.productId),
                  eq(commissionRules.isActive, true),
                ),
              )
              .limit(1);
            if (rule) appliedRate = rule.commissionRate;
          }

          const amount = parseFloat(ti.commissionPaid || '0');
          totalAmount += amount;

          liquidationItemsData.push({
            id: undefined,
            transactionItemId: tiId,
            commissionAmount: amount.toFixed(2),
            appliedRate,
          });
        }

        const totalAmountStr = totalAmount.toFixed(2);

        const [newLiquidation] = await db
          .insert(commissionLiquidations)
          .values({
            tenantId,
            collaboratorId,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            totalAmount: totalAmountStr,
            status: 'draft',
            notes: notes || null,
          })
          .returning();

        const itemsWithLiquidationId = liquidationItemsData.map(item => ({
          liquidationId: newLiquidation.id,
          transactionItemId: item.transactionItemId,
          commissionAmount: item.commissionAmount,
          appliedRate: item.appliedRate,
        }));

        await db.insert(commissionLiquidationItems).values(itemsWithLiquidationId);

        const createdLiquidation = await db.query.commissionLiquidations.findFirst({
          where: eq(commissionLiquidations.id, newLiquidation.id),
          with: {
            collaborator: true,
            items: {
              with: {
                transactionItem: {
                  with: {
                    service: true,
                    product: true,
                  },
                },
              },
            },
          },
        });
        return res.status(201).json(createdLiquidation);

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la liquidación.' });
        }

        const existing = await db.query.commissionLiquidations.findFirst({
          where: and(eq(commissionLiquidations.id, id), eq(commissionLiquidations.tenantId, tenantId)),
        });
        if (!existing) {
          return res.status(404).json({ error: 'Liquidación no encontrada.' });
        }

        const { status, notes: updNotes, paymentMethod } = req.body;
        const setData: Record<string, any> = {};
        if (status !== undefined) setData.status = status;
        if (updNotes !== undefined) setData.notes = updNotes;

        if (status === 'paid') {
          const [colab] = await db
            .select({ name: collaborators.name })
            .from(collaborators)
            .where(eq(collaborators.id, existing.collaboratorId))
            .limit(1);

          const [activeRegister] = await db
            .select()
            .from(cashRegisters)
            .where(and(
              eq(cashRegisters.tenantId, tenantId),
              eq(cashRegisters.status, 'open')
            ))
            .limit(1);

          const periodStart = new Date(existing.periodStart);
          const periodEnd = new Date(existing.periodEnd);
          const periodStr = `${periodStart.toLocaleDateString('es-CO')} al ${periodEnd.toLocaleDateString('es-CO')}`;

          await db.insert(transactions).values({
            tenantId,
            cashRegisterId: activeRegister?.id || null,
            type: 'expense',
            amount: existing.totalAmount,
            paymentMethod: paymentMethod || 'cash',
            description: `Liquidación comisiones - ${colab?.name || 'Colaborador'} - ${periodStr}`,
          });

          setData.paidAt = new Date();
        }

        const [updated] = await db
          .update(commissionLiquidations)
          .set(setData)
          .where(and(eq(commissionLiquidations.id, id), eq(commissionLiquidations.tenantId, tenantId)))
          .returning();

        const result = await db.query.commissionLiquidations.findFirst({
          where: eq(commissionLiquidations.id, updated.id),
          with: {
            collaborator: true,
            items: {
              with: {
                transactionItem: {
                  with: {
                    service: true,
                    product: true,
                  },
                },
              },
            },
          },
        });
        return res.status(200).json(result);

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la liquidación.' });
        }
        const [deleted] = await db
          .delete(commissionLiquidations)
          .where(and(eq(commissionLiquidations.id, id), eq(commissionLiquidations.tenantId, tenantId)))
          .returning();
        if (!deleted) {
          return res.status(404).json({ error: 'Liquidación no encontrada.' });
        }
        return res.status(200).json({ message: 'Liquidación eliminada.', deleted });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
