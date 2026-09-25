import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { authSessions, integrationApiKeys, users, webhookSubscriptions } from '../db/schema.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const sessionToken = String(req.headers['x-session-token'] || '');
  if (!sessionToken) return res.status(401).json({ error: 'Sesión requerida.' });

  try {
    const sessionRows = await db.select({ user: users, session: authSessions }).from(authSessions).innerJoin(users, eq(authSessions.userId, users.id)).where(eq(authSessions.tokenHash, hash(sessionToken))).limit(1);
    const session = sessionRows[0];
    if (!session || session.session.expiresAt < new Date() || !session.user.active || session.user.role !== 'admin') return res.status(403).json({ error: 'Se requiere una sesión activa de administrador.' });
    const tenantId = session.user.tenantId;
    if (req.method === 'GET') {
      if (req.query.resource === 'webhooks') {
        const hooks = await db.select({ id: webhookSubscriptions.id, url: webhookSubscriptions.url, events: webhookSubscriptions.events, active: webhookSubscriptions.active, createdAt: webhookSubscriptions.createdAt }).from(webhookSubscriptions).where(eq(webhookSubscriptions.tenantId, tenantId)).orderBy(desc(webhookSubscriptions.createdAt));
        return res.status(200).json(hooks);
      }
      const keys = await db.select({
        id: integrationApiKeys.id,
        name: integrationApiKeys.name,
        keyPrefix: integrationApiKeys.keyPrefix,
        scopes: integrationApiKeys.scopes,
        active: integrationApiKeys.active,
        lastUsedAt: integrationApiKeys.lastUsedAt,
        expiresAt: integrationApiKeys.expiresAt,
        createdAt: integrationApiKeys.createdAt,
      }).from(integrationApiKeys).where(eq(integrationApiKeys.tenantId, tenantId)).orderBy(desc(integrationApiKeys.createdAt));
      return res.status(200).json(keys);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.type === 'webhook') {
        if (!body.url || !/^https:\/\//i.test(body.url)) return res.status(422).json({ error: 'La URL del webhook debe usar HTTPS.' });
        const secret = `whsec_${randomBytes(32).toString('hex')}`;
        const [created] = await db.insert(webhookSubscriptions).values({ tenantId, url: body.url, secret, events: body.events || ['appointment.created', 'appointment.cancelled', 'appointment.rescheduled'] }).returning({ id: webhookSubscriptions.id, url: webhookSubscriptions.url, events: webhookSubscriptions.events, active: webhookSubscriptions.active, createdAt: webhookSubscriptions.createdAt });
        return res.status(201).json({ ...created, secret });
      }
      const secret = `miesbe_${randomBytes(32).toString('hex')}`;
      const [created] = await db.insert(integrationApiKeys).values({
        tenantId,
        name: body.name || 'Hub de agentes',
        keyPrefix: secret.slice(0, 15),
        keyHash: hash(secret),
        scopes: body.scopes || ['services:read', 'professionals:read', 'clients:read', 'clients:write', 'availability:read', 'appointments:write'],
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      }).returning({ id: integrationApiKeys.id, name: integrationApiKeys.name, keyPrefix: integrationApiKeys.keyPrefix, scopes: integrationApiKeys.scopes, createdAt: integrationApiKeys.createdAt });
      return res.status(201).json({ ...created, apiKey: secret });
    }

    if (req.method === 'DELETE') {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      if (!id) return res.status(400).json({ error: 'Se requiere el ID de la API key.' });
      if (req.query.resource === 'webhooks') {
        const [revokedHook] = await db.update(webhookSubscriptions).set({ active: false }).where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.tenantId, tenantId))).returning({ id: webhookSubscriptions.id });
        return revokedHook ? res.status(200).json({ id: revokedHook.id, active: false }) : res.status(404).json({ error: 'Webhook no encontrado.' });
      }
      const [revoked] = await db.update(integrationApiKeys).set({ active: false }).where(and(eq(integrationApiKeys.id, id), eq(integrationApiKeys.tenantId, tenantId))).returning({ id: integrationApiKeys.id });
      return revoked ? res.status(200).json({ id: revoked.id, active: false }) : res.status(404).json({ error: 'API key no encontrada.' });
    }
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Error interno.' });
  }
}
