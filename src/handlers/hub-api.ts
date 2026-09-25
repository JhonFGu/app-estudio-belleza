import { createHash, timingSafeEqual } from 'node:crypto';
import { and, asc, eq, gt, lt, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { appointments, clients, collaborators, collaboratorSchedules, integrationApiKeys, integrationIdempotencyKeys, services } from '../db/schema.js';
import { dispatchWebhook } from '../utils/webhooks.js';

const responseSent = (res: any) => res.headersSent === true || res.writableEnded === true;
const json = (res: any, status: number, data: unknown) => responseSent(res) ? res : res.status(status).json({ data, meta: { request_id: res.getHeader?.('x-request-id') || null } });
const error = (res: any, status: number, code: string, message: string, details: unknown[] = []) => responseSent(res) ? res : res.status(status).json({ error: { code, message, details, request_id: res.getHeader?.('x-request-id') || null } });
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const id = (value: unknown) => Array.isArray(value) ? value[0] : value;

async function authenticate(req: any, res: any) {
  const authorization = String(req.headers.authorization || '');
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : String(req.headers['x-api-key'] || '');
  if (!supplied) {
    error(res, 401, 'AUTHENTICATION_REQUIRED', 'Se requiere una API key del Hub.');
    return null;
  }
  const keyHash = hash(supplied);
  const rows = await db.select().from(integrationApiKeys).where(and(eq(integrationApiKeys.keyHash, keyHash), eq(integrationApiKeys.active, true))).limit(1);
  const apiKey = rows[0];
  if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
    error(res, 401, 'INVALID_API_KEY', 'La API key no es válida o está vencida.');
    return null;
  }
  // Evita que una clave creada con un hash accidentalmente corto sea aceptada.
  if (!timingSafeEqual(Buffer.from(apiKey.keyHash), Buffer.from(keyHash))) {
    error(res, 401, 'INVALID_API_KEY', 'La API key no es válida.');
    return null;
  }
  return apiKey;
}

const appointmentView = (row: any) => ({
  id: row.id, external_id: row.externalId || null, status: row.status,
  start_at: row.startTime, end_at: row.endTime, notes: row.notes || null,
  client_id: row.clientId, professional_id: row.specialistId, service_id: row.serviceId,
});

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.setHeader('x-request-id', req.headers['x-request-id'] || `req_${cryptoRandom()}`);
  try {
    const apiKey = await authenticate(req, res);
    if (!apiKey) return;
    const tenantId = apiKey.tenantId;
    const idemKey = String(req.headers['idempotency-key'] || '');
    if (idemKey && req.method !== 'GET') {
      const requestHash = hash(JSON.stringify({ path: req.query.path, body: req.body || {} }));
      const previous = await db.select().from(integrationIdempotencyKeys).where(and(eq(integrationIdempotencyKeys.tenantId, tenantId), eq(integrationIdempotencyKeys.key, idemKey))).limit(1);
      if (previous[0]) {
        if (previous[0].requestHash !== requestHash) return error(res, 409, 'IDEMPOTENCY_KEY_REUSED', 'La Idempotency-Key ya fue utilizada con otro request.');
        return res.status(previous[0].statusCode).json(previous[0].responseBody);
      }
      const originalJson = res.json.bind(res);
      res.json = async (body: any) => {
        await db.insert(integrationIdempotencyKeys).values({ tenantId, key: idemKey, requestHash, statusCode: res.statusCode || 200, responseBody: body });
        return originalJson(body);
      };
    }
    const path = String(req.query.path || '').replace(/^v1\/?/, '').replace(/^\//, '');
    const parts = path.split('/').filter(Boolean);

    if (parts[0] === 'services' && req.method === 'GET') {
      const rows = await db.select().from(services).where(and(eq(services.tenantId, tenantId), eq(services.active, true))).orderBy(asc(services.name));
      return json(res, 200, rows.map(s => ({ id: s.id, external_id: null, name: s.name, description: s.description, duration_minutes: s.duration, price: s.price, active: s.active })));
    }
    if (parts[0] === 'professionals' && req.method === 'GET') {
      const rows = await db.select().from(collaborators).where(and(eq(collaborators.tenantId, tenantId), eq(collaborators.active, true))).orderBy(asc(collaborators.name));
      return json(res, 200, rows.map(p => ({ id: p.id, external_id: null, name: p.name, phone: p.phone, specialties: p.specialties || [] })));
    }
    if (parts[0] === 'clients' && req.method === 'GET') {
      const phone = id(req.query.phone);
      const rows = await db.select().from(clients).where(phone ? and(eq(clients.tenantId, tenantId), eq(clients.phone, phone)) : eq(clients.tenantId, tenantId)).orderBy(asc(clients.name));
      return json(res, 200, rows.map(c => ({ id: c.id, external_id: null, name: c.name, phone: c.phone, email: c.email })));
    }
    if (parts[0] === 'clients' && req.method === 'POST') {
      const body = req.body || {};
      if (!body.name || !body.phone) return error(res, 422, 'VALIDATION_ERROR', 'name y phone son obligatorios.');
      const [client] = await db.insert(clients).values({ tenantId, name: body.name, phone: body.phone, email: body.email || null, notes: body.notes || null }).returning();
      return json(res, 201, { id: client.id, external_id: body.external_id || null, name: client.name, phone: client.phone, email: client.email });
    }
    if (parts[0] === 'availability' && req.method === 'GET') return availability(req, res, tenantId);
    if (parts[0] === 'appointments' && parts.length === 1 && req.method === 'POST') return createAppointment(req, res, tenantId);
    if (parts[0] === 'appointments' && parts.length === 1 && req.method === 'GET') return listAppointments(req, res, tenantId);
    if (parts[0] === 'appointments' && parts.length === 2 && req.method === 'GET') {
      const rows = await db.select().from(appointments).where(and(eq(appointments.id, parts[1]), eq(appointments.tenantId, tenantId))).limit(1);
      return rows[0] ? json(res, 200, appointmentView(rows[0])) : error(res, 404, 'NOT_FOUND', 'Cita no encontrada.');
    }
    if (parts[0] === 'appointments' && parts.length === 3 && parts[2] === 'cancel' && req.method === 'POST') return changeAppointment(req, res, tenantId, parts[1], 'cancelled');
    if (parts[0] === 'appointments' && parts.length === 3 && parts[2] === 'reschedule' && req.method === 'POST') return reschedule(req, res, tenantId, parts[1]);
    return error(res, 404, 'NOT_FOUND', 'Recurso no encontrado.');
  } catch (e: any) { return error(res, 500, 'INTERNAL_ERROR', e.message || 'Error interno.'); }
}

async function listAppointments(req: any, res: any, tenantId: string) {
  const fromValue = String(id(req.query.from) || '');
  const toValue = String(id(req.query.to) || '');
  const from = new Date(fromValue);
  const to = new Date(toValue);
  const limitValue = Number(id(req.query.limit) || 50);
  const professionalId = id(req.query.professional_id);
  const clientId = id(req.query.client_id);
  const status = id(req.query.status);
  const cursor = decodeCursor(id(req.query.cursor));
  if (!fromValue || !toValue || Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from >= to || to.getTime() - from.getTime() > 31 * 86400000) return error(res, 422, 'VALIDATION_ERROR', 'from y to son obligatorios; el rango máximo es de 31 días.');
  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100) return error(res, 422, 'VALIDATION_ERROR', 'limit debe estar entre 1 y 100.');
  if (id(req.query.cursor) && !cursor) return error(res, 400, 'INVALID_CURSOR', 'El cursor no es válido.');
  const filters = [eq(appointments.tenantId, tenantId), gt(appointments.startTime, from), lt(appointments.startTime, to)];
  if (professionalId) filters.push(eq(appointments.specialistId, professionalId));
  if (clientId) filters.push(eq(appointments.clientId, clientId));
  if (status) filters.push(eq(appointments.status, status));
  if (cursor) filters.push(or(gt(appointments.startTime, new Date(cursor.startAt)), and(eq(appointments.startTime, new Date(cursor.startAt)), gt(appointments.id, cursor.id)))!);
  const rows = await db.select().from(appointments).where(and(...filters)).orderBy(asc(appointments.startTime), asc(appointments.id)).limit(limitValue + 1);
  const hasMore = rows.length > limitValue;
  const page = hasMore ? rows.slice(0, limitValue) : rows;
  const last = page[page.length - 1];
  return res.status(200).json({ data: page.map(appointmentView), meta: { request_id: res.getHeader?.('x-request-id') || null, has_more: hasMore, next_cursor: hasMore && last ? encodeCursor(last.startTime, last.id) : null } });
}

function encodeCursor(startAt: Date, appointmentId: string) {
  return Buffer.from(JSON.stringify({ startAt: startAt.toISOString(), id: appointmentId })).toString('base64url');
}

function decodeCursor(value: unknown): { startAt: string; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (typeof parsed.startAt !== 'string' || typeof parsed.id !== 'string' || Number.isNaN(new Date(parsed.startAt).valueOf())) return null;
    return parsed;
  } catch { return null; }
}

function cryptoRandom() { return Math.random().toString(36).slice(2, 12); }

async function availability(req: any, res: any, tenantId: string) {
  const fromValue = String(id(req.query.from) || ''); const toValue = String(id(req.query.to) || '');
  const from = new Date(fromValue); const to = new Date(toValue);
  const serviceId = id(req.query.service_id); const professionalId = id(req.query.professional_id);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from >= to || !serviceId || to.getTime() - from.getTime() > 31 * 86400000) return error(res, 422, 'VALIDATION_ERROR', 'from, to y service_id son obligatorios; el rango máximo es de 31 días.');
  const [service] = await db.select().from(services).where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId), eq(services.active, true))).limit(1);
  if (!service) return error(res, 404, 'SERVICE_NOT_FOUND', 'Servicio activo no encontrado.');
  const professionals = professionalId ? [professionalId] : (await db.select({ id: collaborators.id }).from(collaborators).where(and(eq(collaborators.tenantId, tenantId), eq(collaborators.active, true)))).map(p => p.id);
  const result: any[] = [];
  const offset = timezoneOffset(String(id(req.query.timezone) || 'America/Bogota'), fromValue);
  const firstLocalDate = fromValue.slice(0, 10);
  const lastLocalDate = toValue.slice(0, 10);
  const firstDay = new Date(`${firstLocalDate}T00:00:00Z`);
  const lastDay = new Date(`${lastLocalDate}T00:00:00Z`);
  for (const professional of professionals) {
    const schedules = await db.select().from(collaboratorSchedules).where(and(eq(collaboratorSchedules.tenantId, tenantId), eq(collaboratorSchedules.collaboratorId, professional), eq(collaboratorSchedules.isActive, true)));
    const busy = await db.select({ start: appointments.startTime, end: appointments.endTime }).from(appointments).where(and(eq(appointments.tenantId, tenantId), eq(appointments.specialistId, professional), ne(appointments.status, 'cancelled'), lt(appointments.startTime, to), gt(appointments.endTime, from)));
    for (let day = new Date(firstDay); day <= lastDay; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10);
      const dayOfWeek = day.getUTCDay();
      const schedule = schedules.find(item => item.dayOfWeek === dayOfWeek && (!item.week || item.week === isoWeek(date)));
      if (!schedule) continue;
      const scheduleStart = localTimeToDate(date, schedule.startTime, offset);
      const scheduleEnd = localTimeToDate(date, schedule.endTime, offset);
      for (let start = new Date(scheduleStart); start.getTime() + service.duration * 60000 <= scheduleEnd.getTime(); start = new Date(start.getTime() + 30 * 60000)) {
        const end = new Date(start.getTime() + service.duration * 60000);
        if (start < from || end > to || start <= new Date()) continue;
        const isBusy = busy.some(item => item.start < end && item.end > start);
        if (!isBusy) result.push({ professional_id: professional, service_id: service.id, start_at: start.toISOString(), end_at: end.toISOString(), timezone: id(req.query.timezone) || 'America/Bogota' });
      }
    }
  }
  return json(res, 200, result.sort((a, b) => a.start_at.localeCompare(b.start_at)));
}

function timezoneOffset(timezone: string, value: string) {
  const explicit = value.match(/([+-]\d{2}:?\d{2})$/)?.[1];
  if (explicit) return explicit.includes(':') ? explicit : `${explicit.slice(0, 3)}:${explicit.slice(3)}`;
  return timezone === 'America/Bogota' ? '-05:00' : '+00:00';
}

function localTimeToDate(date: string, time: string, offset: string) {
  return new Date(`${date}T${time}:00${offset}`);
}

function isoWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const thursday = new Date(value);
  thursday.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return `${thursday.getUTCFullYear()}-W${String(Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

async function createAppointment(req: any, res: any, tenantId: string) {
  const body = req.body || {}; const start = new Date(body.start_at || '');
  if (!body.service_id || !body.professional_id || !body.client_id || Number.isNaN(start.valueOf())) return error(res, 422, 'VALIDATION_ERROR', 'service_id, professional_id, client_id y start_at son obligatorios.');
  const [service] = await db.select().from(services).where(and(eq(services.id, body.service_id), eq(services.tenantId, tenantId), eq(services.active, true))).limit(1);
  const [professional] = await db.select().from(collaborators).where(and(eq(collaborators.id, body.professional_id), eq(collaborators.tenantId, tenantId), eq(collaborators.active, true))).limit(1);
  const [client] = await db.select().from(clients).where(and(eq(clients.id, body.client_id), eq(clients.tenantId, tenantId))).limit(1);
  if (!service || !professional || !client) return error(res, 404, 'RELATED_RESOURCE_NOT_FOUND', 'Cliente, profesional o servicio no encontrado.');
  const end = new Date(start.getTime() + service.duration * 60000);
  const conflict = await db.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.tenantId, tenantId), eq(appointments.specialistId, professional.id), ne(appointments.status, 'cancelled'), lt(appointments.startTime, end), gt(appointments.endTime, start))).limit(1);
  if (conflict.length) return error(res, 409, 'APPOINTMENT_SLOT_UNAVAILABLE', 'El horario solicitado ya no está disponible.');
  const [appointment] = await db.insert(appointments).values({ tenantId, clientId: client.id, specialistId: professional.id, serviceId: service.id, startTime: start, endTime: end, status: 'scheduled', notes: body.notes || null, externalId: body.external_id || null }).returning();
  void dispatchWebhook(tenantId, 'appointment.created', appointmentView(appointment));
  return json(res, 201, appointmentView(appointment));
}

async function changeAppointment(req: any, res: any, tenantId: string, appointmentId: string, status: string) {
  const [appointment] = await db.update(appointments).set({ status }).where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId))).returning();
  if (appointment) void dispatchWebhook(tenantId, 'appointment.cancelled', appointmentView(appointment));
  return appointment ? json(res, 200, appointmentView(appointment)) : error(res, 404, 'NOT_FOUND', 'Cita no encontrada.');
}

async function reschedule(req: any, res: any, tenantId: string, appointmentId: string) {
  const body = req.body || {}; const start = new Date(body.start_at || '');
  if (Number.isNaN(start.valueOf())) return error(res, 422, 'VALIDATION_ERROR', 'start_at es obligatorio.');
  const [current] = await db.select().from(appointments).where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId))).limit(1);
  if (!current) return error(res, 404, 'NOT_FOUND', 'Cita no encontrada.');
  const [service] = await db.select().from(services).where(and(eq(services.id, current.serviceId), eq(services.tenantId, tenantId))).limit(1);
  const end = new Date(start.getTime() + (service?.duration || 0) * 60000);
  const conflict = await db.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.tenantId, tenantId), eq(appointments.specialistId, current.specialistId), ne(appointments.id, appointmentId), ne(appointments.status, 'cancelled'), lt(appointments.startTime, end), gt(appointments.endTime, start))).limit(1);
  if (conflict.length) return error(res, 409, 'APPOINTMENT_SLOT_UNAVAILABLE', 'El nuevo horario ya no está disponible.');
  const [updated] = await db.update(appointments).set({ startTime: start, endTime: end }).where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId))).returning();
  void dispatchWebhook(tenantId, 'appointment.rescheduled', appointmentView(updated));
  return json(res, 200, appointmentView(updated));
}
