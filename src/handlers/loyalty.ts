import { db } from '../db/index.js';
import { loyaltyConfig, loyaltyPoints, loyaltyRewards, clients } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');

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
        const { clientId, config, rewards, redeemed } = req.query;

        if (config === 'true') {
          const [configData] = await db
            .select()
            .from(loyaltyConfig)
            .where(eq(loyaltyConfig.tenantId, tenantId))
            .orderBy(desc(loyaltyConfig.createdAt))
            .limit(1);

          if (!configData) {
            return res.status(200).json({
              pointsPerCurrencyUnit: 1,
              currencyUnit: '10000',
              inactivityDays: 45,
              isActive: true,
            });
          }
          return res.status(200).json(configData);
        }

        if (rewards === 'true') {
          const rewardsList = await db
            .select()
            .from(loyaltyRewards)
            .where(and(eq(loyaltyRewards.tenantId, tenantId), eq(loyaltyRewards.active, true)))
            .orderBy(loyaltyRewards.pointsCost);

          return res.status(200).json(rewardsList);
        }

        if (redeemed === 'true' && clientId) {
          const redeemedList = await db
            .select({
              id: loyaltyPoints.id,
              points: loyaltyPoints.points,
              description: loyaltyPoints.description,
              createdAt: loyaltyPoints.createdAt,
            })
            .from(loyaltyPoints)
            .where(
              and(
                eq(loyaltyPoints.tenantId, tenantId),
                eq(loyaltyPoints.clientId, clientId),
                eq(loyaltyPoints.type, 'redeemed')
              )
            )
            .orderBy(desc(loyaltyPoints.createdAt));

          return res.status(200).json(redeemedList);
        }

        if (req.query.balances === 'true') {
          const raw = await db.execute(
            sql`
              SELECT DISTINCT ON (lp.client_id) lp.client_id, lp.balance_after
              FROM ${loyaltyPoints} lp
              WHERE lp.tenant_id = ${tenantId}
              ORDER BY lp.client_id, lp.created_at DESC
            `
          );
          const balances = (raw as any).rows.map((r: any) => ({
            clientId: r.client_id,
            balance: r.balance_after,
          }));
          return res.status(200).json(balances);
        }

        if (clientId) {
          const history = await db
            .select()
            .from(loyaltyPoints)
            .where(
              and(
                eq(loyaltyPoints.tenantId, tenantId),
                eq(loyaltyPoints.clientId, clientId)
              )
            )
            .orderBy(desc(loyaltyPoints.createdAt));

          const balance = history.length > 0 ? history[0].balanceAfter : 0;

          return res.status(200).json({ balance, history });
        }

        return res.status(400).json({ error: 'Se requiere clientId, config=true, o rewards=true.' });
      }

      case 'POST': {
        const { clientId, rewardId, points, description } = req.body;

        if (points && description) {
          if (!clientId) {
            return res.status(400).json({ error: 'Se requiere clientId para ajustar puntos.' });
          }

          const [clientExists] = await db
            .select({ id: clients.id })
            .from(clients)
            .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
            .limit(1);

          if (!clientExists) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
          }

          const [lastRecord] = await db
            .select({ balanceAfter: loyaltyPoints.balanceAfter })
            .from(loyaltyPoints)
            .where(
              and(
                eq(loyaltyPoints.tenantId, tenantId),
                eq(loyaltyPoints.clientId, clientId)
              )
            )
            .orderBy(desc(loyaltyPoints.createdAt))
            .limit(1);

          const currentBalance = lastRecord ? lastRecord.balanceAfter : 0;
          const newBalance = currentBalance + points;

          const [entry] = await db
            .insert(loyaltyPoints)
            .values({
              tenantId,
              clientId,
              points,
              type: 'adjusted',
              referenceType: 'manual',
              description,
              balanceAfter: newBalance,
            })
            .returning();

          return res.status(201).json({ entry, newBalance });
        }

        if (rewardId) {
          if (!clientId) {
            return res.status(400).json({ error: 'Se requiere clientId para canjear.' });
          }

          const [reward] = await db
            .select()
            .from(loyaltyRewards)
            .where(
              and(
                eq(loyaltyRewards.id, rewardId),
                eq(loyaltyRewards.tenantId, tenantId),
                eq(loyaltyRewards.active, true)
              )
            )
            .limit(1);

          if (!reward) {
            return res.status(404).json({ error: 'Recompensa no encontrada o inactiva.' });
          }

          const [lastRecord] = await db
            .select({ balanceAfter: loyaltyPoints.balanceAfter })
            .from(loyaltyPoints)
            .where(
              and(
                eq(loyaltyPoints.tenantId, tenantId),
                eq(loyaltyPoints.clientId, clientId)
              )
            )
            .orderBy(desc(loyaltyPoints.createdAt))
            .limit(1);

          const currentBalance = lastRecord ? lastRecord.balanceAfter : 0;

          if (currentBalance < reward.pointsCost) {
            return res.status(400).json({
              error: 'Puntos insuficientes.',
              required: reward.pointsCost,
              available: currentBalance,
            });
          }

          const newBalance = currentBalance - reward.pointsCost;

          const [entry] = await db
            .insert(loyaltyPoints)
            .values({
              tenantId,
              clientId,
              points: -reward.pointsCost,
              type: 'redeemed',
              referenceType: 'redemption',
              referenceId: reward.id,
              description: `Canje: ${reward.name}`,
              balanceAfter: newBalance,
            })
            .returning();

          return res.status(201).json({ entry, newBalance, reward });
        }

        return res.status(400).json({ error: 'Se requiere rewardId para canjear, o points+description para ajuste manual.' });
      }

      case 'PUT': {
        const { config } = req.query;

        if (config === 'true') {
          const { pointsPerCurrencyUnit, currencyUnit, inactivityDays, isActive } = req.body;

          const [existingConfig] = await db
            .select()
            .from(loyaltyConfig)
            .where(eq(loyaltyConfig.tenantId, tenantId))
            .limit(1);

          if (existingConfig) {
            const [updated] = await db
              .update(loyaltyConfig)
              .set({
                pointsPerCurrencyUnit: pointsPerCurrencyUnit !== undefined ? pointsPerCurrencyUnit : existingConfig.pointsPerCurrencyUnit,
                currencyUnit: currencyUnit !== undefined ? currencyUnit : existingConfig.currencyUnit,
                inactivityDays: inactivityDays !== undefined ? inactivityDays : existingConfig.inactivityDays,
                isActive: isActive !== undefined ? isActive : existingConfig.isActive,
              })
              .where(eq(loyaltyConfig.id, existingConfig.id))
              .returning();
            return res.status(200).json(updated);
          }

          const [created] = await db
            .insert(loyaltyConfig)
            .values({
              tenantId,
              pointsPerCurrencyUnit: pointsPerCurrencyUnit || 1,
              currencyUnit: currencyUnit || '10000',
              inactivityDays: inactivityDays || 45,
              isActive: isActive !== undefined ? isActive : true,
            })
            .returning();
          return res.status(201).json(created);
        }

        return res.status(400).json({ error: 'Se requiere config=true.' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Metodo ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
