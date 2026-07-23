import { db } from '../src/db';
import { cashRegisters, transactions, users } from '../src/db/schema';
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
        const { action } = req.query;

        if (action === 'history') {
          // Historial de cierres de caja
          const history = await db
            .select()
            .from(cashRegisters)
            .where(and(eq(cashRegisters.tenantId, tenantId), eq(cashRegisters.status, 'closed')))
            .orderBy(desc(cashRegisters.closedAt));
          return res.status(200).json(history);
        }

        // Obtener la caja actualmente abierta (si existe)
        const [activeRegister] = await db
          .select()
          .from(cashRegisters)
          .where(and(eq(cashRegisters.tenantId, tenantId), eq(cashRegisters.status, 'open')))
          .orderBy(desc(cashRegisters.openedAt))
          .limit(1);

        if (!activeRegister) {
          console.log('[API] GET: No hay caja abierta para tenant:', tenantId);
          return res.status(200).json({ isOpen: false, register: null });
        }

        console.log('[API] GET: Caja abierta encontrada:', activeRegister.id, 'para tenant:', tenantId);

        const regTransactions = await db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, tenantId));

        const cashSales = regTransactions
          .filter((t) => (t.cashRegisterId === activeRegister.id || !t.cashRegisterId) && t.type === 'sale' && (t.paymentMethod === 'cash' || t.paymentMethod === 'efectivo'))
          .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

        const cashExpenses = regTransactions
          .filter((t) => (t.cashRegisterId === activeRegister.id || !t.cashRegisterId) && t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

        const initialBase = parseFloat(activeRegister.initialBase || '0');
        const expectedCash = initialBase + cashSales - cashExpenses;

        let openedByUser: { name: string } | null = null;
        if (activeRegister.openedByUserId) {
          const [userRow] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, activeRegister.openedByUserId))
            .limit(1);
          openedByUser = userRow || null;
        }

        return res.status(200).json({
          isOpen: true,
          register: {
            ...activeRegister,
            openedByUser,
            cashSales,
            cashExpenses,
            expectedCash,
          },
        });
      }

      case 'POST': {
        const { action, initialBase, userId, declaredCash, justification } = req.body;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUserId = userId && uuidRegex.test(userId) ? userId : null;

        if (action === 'open') {
          console.log('[API] Abriendo caja para tenant:', tenantId, 'userId:', validUserId, 'initialBase:', initialBase);
          
          const existingOpen = await db.query.cashRegisters.findFirst({
            where: and(eq(cashRegisters.tenantId, tenantId), eq(cashRegisters.status, 'open')),
          });

          if (existingOpen) {
            console.log('[API] Ya existe caja abierta:', existingOpen.id);
            return res.status(400).json({ error: 'Ya existe una caja abierta para este establecimiento.' });
          }

          const [newRegister] = await db
            .insert(cashRegisters)
            .values({
              tenantId,
              openedByUserId: validUserId,
              status: 'open',
              initialBase: (parseFloat(initialBase) || 0).toFixed(2),
            })
            .returning();

          console.log('[API] Caja abierta exitosamente:', newRegister.id);
          return res.status(201).json(newRegister);
        }

        if (action === 'close') {
          const [activeRegister] = await db
            .select()
            .from(cashRegisters)
            .where(and(eq(cashRegisters.tenantId, tenantId), eq(cashRegisters.status, 'open')))
            .limit(1);

          if (!activeRegister) {
            return res.status(400).json({ error: 'No hay ninguna caja abierta para cerrar.' });
          }

          const regTransactions = await db
            .select()
            .from(transactions)
            .where(eq(transactions.cashRegisterId, activeRegister.id));

          const cashSales = regTransactions
            .filter((t) => t.type === 'sale' && (t.paymentMethod === 'cash' || t.paymentMethod === 'efectivo'))
            .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

          const cashExpenses = regTransactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

          const initialBaseNum = parseFloat(activeRegister.initialBase || '0');
          const expectedCashNum = initialBaseNum + cashSales - cashExpenses;
          const declaredCashNum = parseFloat(declaredCash) || 0;
          const differenceNum = declaredCashNum - expectedCashNum;

          const [closedRegister] = await db
            .update(cashRegisters)
            .set({
              status: 'closed',
              closedAt: new Date(),
              closedByUserId: validUserId,
              expectedCash: expectedCashNum.toFixed(2),
              declaredCash: declaredCashNum.toFixed(2),
              difference: differenceNum.toFixed(2),
              justification: justification || null,
            })
            .where(eq(cashRegisters.id, activeRegister.id))
            .returning();

          return res.status(200).json(closedRegister);
        }

        return res.status(400).json({ error: 'Acción no válida. Use "open" o "close".' });
      }

      default:
        return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error: any) {
    console.error('Error en api/cash-register:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
