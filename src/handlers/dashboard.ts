import { db } from '../db/index.js';
import { transactions, transactionItems, appointments, clients, collaborators, services, products } from '../db/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const headerTenant = req.headers['x-tenant-id'] || req.headers['x-tenant-id']?.[0];
  const tenantId = headerTenant || 'd6f127ca-16da-4417-b525-97a788d29c1d';

  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const period = req.query?.period || urlObj.searchParams.get('period') || 'all';

    const now = new Date();
    let startDate: Date | null = null;

    if (period === 'day') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // 'all' (por defecto): Histórico completo
      startDate = null;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const txDateFilter = startDate ? gte(transactions.createdAt, startDate) : sql`1=1`;
    const apptDateFilter = startDate ? gte(appointments.startTime, startDate) : sql`1=1`;
    const clientDateFilter = startDate ? gte(clients.createdAt, startDate) : sql`1=1`;

    // Parallelize all independent database queries for maximum performance
    const [
      salesResult,
      expensesResult,
      commissionsResult,
      clientsResult,
      appointmentsResult,
      todaySchedule,
      paymentMethodsResult,
      topSoldItemsResult,
      monthlyFlowResult,
      recentAppointmentsResult
    ] = await Promise.all([
      // 1. Sumar ingresos por ventas (POS) en el período
      db
        .select({ total: sql<string>`sum(amount)` })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.type, 'sale'),
          txDateFilter
        )),

      // 2. Sumar egresos por gastos operativos en el período
      db
        .select({ total: sql<string>`sum(amount)` })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.type, 'expense'),
          txDateFilter
        )),

      // 3. Sumar comisiones pagadas en el período
      db
        .select({ total: sql<string>`sum(${transactionItems.commissionPaid})` })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .where(and(
          eq(transactions.tenantId, tenantId),
          txDateFilter
        )),

      // 4. Conteo de nuevos clientes registrados en el período
      db
        .select({ count: sql<number>`count(*)` })
        .from(clients)
        .where(and(eq(clients.tenantId, tenantId), clientDateFilter)),

      // 5. Conteo de citas en el período
      db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(and(
          eq(appointments.tenantId, tenantId),
          apptDateFilter
        )),

      // 6. Citas para el día de hoy (para la agenda rápida)
      db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          status: appointments.status,
          notes: appointments.notes,
          client: {
            name: clients.name,
            phone: clients.phone,
          },
          specialist: {
            name: collaborators.name,
            avatarUrl: collaborators.avatarUrl,
          },
          service: {
            name: services.name,
            price: services.price,
            duration: services.duration,
          },
        })
        .from(appointments)
        .innerJoin(clients, eq(appointments.clientId, clients.id))
        .innerJoin(collaborators, eq(appointments.specialistId, collaborators.id))
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startTime, startOfToday),
            lte(appointments.startTime, endOfToday)
          )
        )
        .orderBy(appointments.startTime),

      // 7. Distribución de ventas por método de pago en el período
      db
        .select({
          method: transactions.paymentMethod,
          total: sql<string>`sum(amount)`,
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.type, 'sale'),
          txDateFilter
        ))
        .groupBy(transactions.paymentMethod),

      // 8. Servicios y Productos más vendidos en el período
      db
        .select({
          name: sql<string>`coalesce(${services.name}, ${products.name}, 'Ítem Genérico')`,
          type: sql<string>`case when ${transactionItems.serviceId} is not null then 'service' else 'product' end`,
          quantity: sql<number>`sum(${transactionItems.quantity})`,
          totalAmount: sql<string>`sum(${transactionItems.unitPrice} * ${transactionItems.quantity})`,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .leftJoin(services, eq(transactionItems.serviceId, services.id))
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .where(and(
          eq(transactions.tenantId, tenantId),
          txDateFilter
        ))
        .groupBy(services.name, products.name, transactionItems.serviceId)
        .orderBy(sql`sum(${transactionItems.quantity}) desc`)
        .limit(5),

      // 9. Flujo Financiero Mensual (Ingresos y Gastos por mes en el período)
      db
        .select({
          month: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM')`,
          monthName: sql<string>`to_char(${transactions.createdAt}, 'Mon')`,
          type: transactions.type,
          total: sql<string>`sum(amount)`,
        })
        .from(transactions)
        .where(and(eq(transactions.tenantId, tenantId), txDateFilter))
        .groupBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`, sql`to_char(${transactions.createdAt}, 'Mon')`, transactions.type)
        .orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`),

      // 10. Últimas citas y su estado actual
      db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          status: appointments.status,
          clientName: clients.name,
          serviceName: services.name,
        })
        .from(appointments)
        .innerJoin(clients, eq(appointments.clientId, clients.id))
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(eq(appointments.tenantId, tenantId))
        .orderBy(sql`${appointments.startTime} desc`)
        .limit(6),
    ]);

    const totalSales = parseFloat(salesResult[0]?.total || '0.00');
    const totalExpenses = parseFloat(expensesResult[0]?.total || '0.00');
    const totalCommissions = parseFloat(commissionsResult[0]?.total || '0.00');
    const countClients = Number(clientsResult[0]?.count || 0);
    const countAppointments = Number(appointmentsResult[0]?.count || 0);

    const paymentMethods = paymentMethodsResult.map((r) => ({
      method: r.method || 'Otro',
      total: parseFloat(r.total || '0.00'),
      count: r.count,
    }));

    const topSoldItems = topSoldItemsResult.map((r) => ({
      name: r.name,
      type: r.type,
      quantity: Number(r.quantity || 0),
      totalAmount: parseFloat(r.totalAmount || '0.00'),
    }));

    // Build Period-Aware Financial Flow Chart Data
    let chartFlow: Array<{ label: string; sales: number; expenses: number; netProfit: number }> = [];

    const periodTrans = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(and(eq(transactions.tenantId, tenantId), txDateFilter));

    if (period === 'day') {
      // Group by hours of the day (8:00 to 20:00)
      const hoursMap: Record<number, { sales: number; expenses: number }> = {};
      for (let h = 8; h <= 20; h += 2) {
        hoursMap[h] = { sales: 0, expenses: 0 };
      }
      periodTrans.forEach((t) => {
        const h = new Date(t.createdAt).getHours();
        const bucket = Math.floor(h / 2) * 2;
        const key = bucket >= 8 && bucket <= 20 ? bucket : 8;
        const val = parseFloat(t.amount || '0');
        if (t.type === 'sale' || t.type === 'abono') hoursMap[key].sales += val;
        else if (t.type === 'expense') hoursMap[key].expenses += val;
      });
      chartFlow = Object.entries(hoursMap).map(([hStr, data]) => ({
        label: `${hStr}:00`,
        sales: data.sales,
        expenses: data.expenses,
        netProfit: data.sales - data.expenses,
      }));
    } else if (period === 'month') {
      // Group by days of current month (e.g. Day 1, 5, 10, 15, 20, 25, 30)
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysMap: Record<number, { sales: number; expenses: number }> = {};

      for (let d = 1; d <= daysInMonth; d += 3) {
        daysMap[d] = { sales: 0, expenses: 0 };
      }

      periodTrans.forEach((t) => {
        const d = new Date(t.createdAt).getDate();
        const bucket = Math.floor((d - 1) / 3) * 3 + 1;
        const key = daysMap[bucket] !== undefined ? bucket : 1;
        const val = parseFloat(t.amount || '0');
        if (t.type === 'sale' || t.type === 'abono') daysMap[key].sales += val;
        else if (t.type === 'expense') daysMap[key].expenses += val;
      });

      chartFlow = Object.entries(daysMap).map(([dStr, data]) => ({
        label: `Día ${dStr}`,
        sales: data.sales,
        expenses: data.expenses,
        netProfit: data.sales - data.expenses,
      }));
    } else {
      // Default: 'year' or 'all' - 12 Months of the Year (Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Sep, Oct, Nov, Dic)
      const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthMap: Record<number, { sales: number; expenses: number }> = {};

      for (let m = 0; m < 12; m++) {
        monthMap[m] = { sales: 0, expenses: 0 };
      }

      periodTrans.forEach((t) => {
        const m = new Date(t.createdAt).getMonth();
        const val = parseFloat(t.amount || '0');
        if (t.type === 'sale' || t.type === 'abono') monthMap[m].sales += val;
        else if (t.type === 'expense') monthMap[m].expenses += val;
      });

      chartFlow = monthLabels.map((label, idx) => {
        const data = monthMap[idx];
        return {
          label,
          sales: data.sales,
          expenses: data.expenses,
          netProfit: data.sales - data.expenses,
        };
      });
    }

    // 11. Utilidad Neta (Ingresos - Gastos - Comisiones)
    const netProfit = totalSales - totalExpenses - totalCommissions;

    return res.status(200).json({
      metrics: {
        totalSales,
        totalExpenses,
        totalCommissions,
        netProfit,
        countClients,
        countAppointments,
      },
      todaySchedule,
      paymentMethods,
      topSoldItems,
      monthlyFlow: chartFlow,
      chartFlow,
      recentAppointments: recentAppointmentsResult,
    });
  } catch (error: any) {
    console.error('DASHBOARD API ERROR:', error);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.code) console.error('Code:', error.code);
    return res.status(500).json({ error: error.message });
  }
}
