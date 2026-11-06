import { and, asc, eq, notLike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { hubTenantIntegrations, whatsappAgentSettings, whatsappInstances } from '../db/schema.js';
import { getSessionUser } from '../utils/session-auth.js';

const sendError = (res: any, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST', 'PUT'].includes(req.method)) return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');

  const user = await getSessionUser(req);
  if (!user) return sendError(res, 401, 'SESSION_REQUIRED', 'Inicia sesión para administrar WhatsApp.');
  if (user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN', 'Solo un administrador puede configurar WhatsApp y el agente.');

  try {
    if (req.method === 'GET') {
      const [instances, settingsRows] = await Promise.all([
        db.select().from(whatsappInstances).where(and(eq(whatsappInstances.tenantId, user.tenantId), notLike(whatsappInstances.evolutionName, 'unlinked:%'))).orderBy(asc(whatsappInstances.createdAt)),
        db.select().from(whatsappAgentSettings).where(eq(whatsappAgentSettings.tenantId, user.tenantId)).limit(1),
      ]);
      return res.status(200).json({
        instances,
        agentSettings: settingsRows[0] || {
          enabled: true,
          tone: 'amable y profesional',
          greeting: '',
          businessContext: '',
          instructions: '',
          bookingInstructions: '',
          handoffMessage: 'Te comunicaré con recepción para ayudarte.',
        },
        evolutionWebhookUrl: process.env.N8N_EVOLUTION_WEBHOOK_URL || '',
        agentApiUrl: `${String(process.env.MIESBE_PUBLIC_URL || `https://${req.headers?.['x-forwarded-host'] || req.headers?.host || ''}`).replace(/\/$/, '')}/api/whatsapp/agent`,
      });
    }

    const body = req.body || {};
    if (body.type === 'instance' && req.method === 'POST') {
      if (body.action === 'unlink') {
        const id = typeof body.id === 'string' ? body.id : '';
        const [current] = await db.select().from(whatsappInstances).where(and(
          eq(whatsappInstances.id, id), eq(whatsappInstances.tenantId, user.tenantId), notLike(whatsappInstances.evolutionName, 'unlinked:%'),
        )).limit(1);
        if (!current) return sendError(res, 404, 'INSTANCE_NOT_FOUND', 'Instancia no encontrada.');
        const [instance] = await db.update(whatsappInstances).set({
          active: false,
          evolutionName: `unlinked:${current.id}`,
          label: `${current.label} (Desvinculada: ${current.evolutionName})`,
          updatedAt: new Date(),
        }).where(and(eq(whatsappInstances.id, id), eq(whatsappInstances.tenantId, user.tenantId))).returning();
        return instance ? res.status(200).json({ id: instance.id, unlinked: true }) : sendError(res, 404, 'INSTANCE_NOT_FOUND', 'Instancia no encontrada.');
      }

      const evolutionName = typeof body.evolutionName === 'string' ? body.evolutionName.trim() : '';
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      if (!/^[a-zA-Z0-9._-]{1,128}$/.test(evolutionName)) {
        return sendError(res, 422, 'INVALID_INSTANCE_NAME', 'Usa el nombre exacto de Evolution (letras, números, punto, guion o guion bajo).');
      }
      if (evolutionName.toLowerCase().startsWith('unlinked:')) {
        return sendError(res, 422, 'RESERVED_INSTANCE_NAME', 'Ese prefijo está reservado.');
      }
      if (!label || label.length > 100) return sendError(res, 422, 'INVALID_LABEL', 'La etiqueta es obligatoria y debe tener hasta 100 caracteres.');

      const [instance] = await db.insert(whatsappInstances).values({
        tenantId: user.tenantId,
        evolutionName,
        label,
        phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() || null : null,
        active: true,
      }).returning();
      // Once a tenant starts using the direct n8n route, stop accepting new live inbox events from the former Hub.
      await db.update(hubTenantIntegrations).set({ active: false, updatedAt: new Date() }).where(eq(hubTenantIntegrations.tenantId, user.tenantId));
      return res.status(201).json(instance);
    }

    if (body.type === 'instance' && req.method === 'PUT') {
      if (typeof body.id !== 'string' || typeof body.active !== 'boolean') return sendError(res, 422, 'INVALID_INSTANCE_UPDATE', 'id y active son obligatorios.');
      const [instance] = await db.update(whatsappInstances)
        .set({ active: body.active, updatedAt: new Date() })
        .where(and(eq(whatsappInstances.id, body.id), eq(whatsappInstances.tenantId, user.tenantId), notLike(whatsappInstances.evolutionName, 'unlinked:%')))
        .returning();
      return instance ? res.status(200).json(instance) : sendError(res, 404, 'INSTANCE_NOT_FOUND', 'Instancia no encontrada.');
    }

    if (body.type === 'agent_settings' && req.method === 'PUT') {
      const values = {
        tenantId: user.tenantId,
        enabled: body.enabled !== false,
        tone: typeof body.tone === 'string' ? body.tone.slice(0, 120) : 'amable y profesional',
        greeting: typeof body.greeting === 'string' ? body.greeting.slice(0, 1000) : null,
        businessContext: typeof body.businessContext === 'string' ? body.businessContext.slice(0, 8000) : null,
        instructions: typeof body.instructions === 'string' ? body.instructions.slice(0, 12000) : null,
        bookingInstructions: typeof body.bookingInstructions === 'string' ? body.bookingInstructions.slice(0, 8000) : null,
        handoffMessage: typeof body.handoffMessage === 'string' ? body.handoffMessage.slice(0, 1000) : null,
        updatedByUserId: user.id,
        updatedAt: new Date(),
      };
      const [settings] = await db.insert(whatsappAgentSettings).values(values)
        .onConflictDoUpdate({ target: whatsappAgentSettings.tenantId, set: values })
        .returning();
      return res.status(200).json(settings);
    }

    return sendError(res, 422, 'INVALID_SETTINGS_ACTION', 'Tipo de configuración no soportado.');
  } catch (error: any) {
    if (error?.code === '23505') return sendError(res, 409, 'INSTANCE_ALREADY_REGISTERED', 'Esta instancia Evolution ya está asociada a otro tenant.');
    return sendError(res, 500, 'WHATSAPP_SETTINGS_FAILED', 'No fue posible guardar la configuración de WhatsApp.');
  }
}
