import { db } from '../src/db';
import { transactions, clients, appointments } from '../src/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

async function test() {
  const tenantId = 'd6f127ca-16da-4417-b525-97a788d29c1d';
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  console.log('Testing dashboard query with tenantId:', tenantId);
  console.log('startDate:', startDate.toISOString());

  const salesRes = await db
    .select({ total: sql<string>`sum(amount)` })
    .from(transactions)
    .where(and(eq(transactions.tenantId, tenantId), eq(transactions.type, 'sale'), gte(transactions.createdAt, startDate)));

  console.log('Sales result:', salesRes);

  const monthlyFlowRes = await db
    .select({
      month: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM')`,
      monthName: sql<string>`to_char(${transactions.createdAt}, 'Mon')`,
      type: transactions.type,
      total: sql<string>`sum(amount)`,
    })
    .from(transactions)
    .where(eq(transactions.tenantId, tenantId))
    .groupBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`, sql`to_char(${transactions.createdAt}, 'Mon')`, transactions.type)
    .orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM')`);

  console.log('Monthly flow result:', monthlyFlowRes);
}

test();
