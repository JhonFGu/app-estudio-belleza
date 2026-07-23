import { db } from '../src/db';
import { transactions, transactionItems, services, collaborators, appointments, products, commissionRules } from '../src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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

  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (id) {
          // Detalle de una transacción específica
          const trans = await db.query.transactions.findFirst({
            where: and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)),
            with: {
              client: true,
              appointment: true,
              items: {
                with: {
                  service: true,
                  product: true,
                  collaborator: true,
                },
              },
            },
          });

          if (!trans) {
            return res.status(404).json({ error: 'Transacción no encontrada.' });
          }
          return res.status(200).json(trans);
        } else {
          // Listado general de transacciones ordenadas por fecha de creación (más recientes primero)
          const list = await db.query.transactions.findMany({
            where: eq(transactions.tenantId, tenantId),
            with: {
              client: true,
              items: {
                with: {
                  service: true,
                  product: true,
                  collaborator: true,
                },
              },
            },
            orderBy: [desc(transactions.createdAt)],
          });
          return res.status(200).json(list);
        }

      case 'POST':
        const {
          type,
          clientId,
          appointmentId,
          cashRegisterId,
          amount,
          paidAmount,
          pendingBalance,
          status,
          paymentMethod,
          description,
          items,
          targetTransactionId,
        } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
          return res.status(400).json({ error: 'El monto total es obligatorio y debe ser mayor a 0.' });
        }

        if (type === 'abono' && targetTransactionId) {
          // Registrar abono a una cuenta por cobrar existente
          const [originalTx] = await db
            .select()
            .from(transactions)
            .where(and(eq(transactions.id, targetTransactionId), eq(transactions.tenantId, tenantId)))
            .limit(1);

          if (originalTx) {
            const currentPaid = parseFloat(originalTx.paidAmount || originalTx.amount || '0');
            const abonoAmount = parseFloat(amount);
            const newPaidAmount = (currentPaid + abonoAmount).toFixed(2);
            const origTotal = parseFloat(originalTx.amount || '0');
            const newPendingBalance = Math.max(0, origTotal - (currentPaid + abonoAmount)).toFixed(2);
            const newStatus = parseFloat(newPendingBalance) <= 0 ? 'completed' : 'partial';

            await db
              .update(transactions)
              .set({
                paidAmount: newPaidAmount,
                pendingBalance: newPendingBalance,
                status: newStatus,
              })
              .where(and(eq(transactions.id, targetTransactionId), eq(transactions.tenantId, tenantId)));
          }

          // Insertar registro del abono como ingreso de caja
          const [abonoTx] = await db
            .insert(transactions)
            .values({
              tenantId,
              clientId: clientId || originalTx?.clientId || null,
              cashRegisterId: cashRegisterId || null,
              type: 'sale',
              amount: amount.toString(),
              paidAmount: amount.toString(),
              pendingBalance: '0.00',
              status: 'completed',
              paymentMethod: paymentMethod || 'cash',
              description: description || `Abono a Factura #${targetTransactionId.slice(0, 8).toUpperCase()}`,
            })
            .returning();

          return res.status(201).json(abonoTx);
        }

        if (type === 'sale') {
          const calcPaid = paidAmount !== undefined ? paidAmount.toString() : amount.toString();
          const calcPending = pendingBalance !== undefined ? pendingBalance.toString() : '0.00';
          const calcStatus = status || (parseFloat(calcPending) > 0 ? (parseFloat(calcPaid) > 0 ? 'partial' : 'pending') : 'completed');

          // 1. Crear registro de venta principal
          const [newSale] = await db
            .insert(transactions)
            .values({
              tenantId,
              clientId: clientId || null,
              appointmentId: appointmentId || null,
              cashRegisterId: cashRegisterId || null,
              type: 'sale',
              amount: amount.toString(),
              paidAmount: calcPaid,
              pendingBalance: calcPending,
              status: calcStatus,
              paymentMethod: paymentMethod || 'cash',
              description: description || 'Venta POS',
            })
            .returning();

          // 2. Procesar ítems e insertar con cálculo de comisiones / descuento de inventario
          if (items && Array.isArray(items) && items.length > 0) {
            const itemsToInsert = [];
            for (const item of items) {
              const { serviceId, productId, quantity, unitPrice, collaboratorId } = item;
              const qty = quantity || 1;
              
              let commissionPaid = '0.00';
              if (collaboratorId) {
                let rule = null;
                if (serviceId) {
                  [rule] = await db
                    .select({ commissionRate: commissionRules.commissionRate })
                    .from(commissionRules)
                    .where(
                      and(
                        eq(commissionRules.collaboratorId, collaboratorId),
                        eq(commissionRules.serviceId, serviceId),
                        eq(commissionRules.tenantId, tenantId),
                        eq(commissionRules.isActive, true),
                      ),
                    )
                    .limit(1);
                } else if (productId) {
                  [rule] = await db
                    .select({ commissionRate: commissionRules.commissionRate })
                    .from(commissionRules)
                    .where(
                      and(
                        eq(commissionRules.collaboratorId, collaboratorId),
                        eq(commissionRules.productId, productId),
                        eq(commissionRules.tenantId, tenantId),
                        eq(commissionRules.isActive, true),
                      ),
                    )
                    .limit(1);
                }

                if (rule) {
                  const totalItemPrice = Number(unitPrice) * Number(qty);
                  commissionPaid = (totalItemPrice * (Number(rule.commissionRate) / 100)).toFixed(2);
                }
              }

              // Si es producto físico, reducir el stock disponible
              if (productId) {
                await db
                  .update(products)
                  .set({ stock: sql`${products.stock} - ${qty}` })
                  .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
              }

              itemsToInsert.push({
                transactionId: newSale.id,
                serviceId: serviceId || null,
                productId: productId || null,
                quantity: qty,
                unitPrice: unitPrice.toString(),
                collaboratorId: collaboratorId || null,
                commissionPaid,
              });
            }

            await db.insert(transactionItems).values(itemsToInsert);
          }

          // Si hay una cita asociada, actualizar su estado a 'completed'
          if (appointmentId) {
            await db
              .update(appointments)
              .set({ status: 'completed' })
              .where(eq(appointments.id, appointmentId));
          }

          // Retornar la venta creada
          return res.status(201).json(newSale);
        } else if (type === 'expense') {
          // Gasto financiero simple
          const [newExpense] = await db
            .insert(transactions)
            .values({
              tenantId,
              type: 'expense',
              amount: amount.toString(),
              paymentMethod: paymentMethod || 'cash',
              description: description || 'Gasto operativo',
            })
            .returning();
          return res.status(201).json(newExpense);
        } else {
          return res.status(400).json({ error: 'Tipo de transacción no válido. Debe ser "sale" o "expense".' });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
