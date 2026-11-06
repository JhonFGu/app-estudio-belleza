import { and, eq, gt, lt, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { appointments, collaborators, collaboratorSchedules, services } from '../db/schema.js';

const DEFAULT_TIMEZONE = 'America/Bogota';

function offsetFor(value: Date, timezone: string) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
    .formatToParts(value).find((item) => item.type === 'timeZoneName')?.value || 'GMT-05:00';
  const match = part.match(/GMT([+-]\d{2}:\d{2})/);
  return match?.[1] || '+00:00';
}

function localDateParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

function localTimeToDate(date: string, time: string, timezone: string) {
  const [hour = '00', minute = '00'] = String(time).split(':');
  const normalizedTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  const nominal = new Date(`${date}T${normalizedTime}:00Z`);
  return new Date(`${date}T${normalizedTime}:00${offsetFor(nominal, timezone)}`);
}

function rangeBound(value: string, timezone: string, endOfDay: boolean) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return localTimeToDate(value, endOfDay ? '23:59' : '00:00', timezone);
  return new Date(value);
}

function isoWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const thursday = new Date(value);
  thursday.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return `${thursday.getUTCFullYear()}-W${String(Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

export async function getWhatsAppAvailability(input: {
  tenantId: string;
  serviceId: string;
  from: string;
  to: string;
  professionalId?: string;
  timezone?: string;
}) {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const from = rangeBound(input.from, timezone, false);
  const to = rangeBound(input.to, timezone, true);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from >= to || to.getTime() - from.getTime() > 32 * 86400000) {
    throw new Error('El rango de disponibilidad no es válido; máximo 31 días.');
  }
  const [service] = await db.select().from(services).where(and(
    eq(services.id, input.serviceId), eq(services.tenantId, input.tenantId), eq(services.active, true),
  )).limit(1);
  if (!service) throw new Error('No se encontró el servicio activo solicitado.');

  const professionalRows = input.professionalId
    ? await db.select({ id: collaborators.id }).from(collaborators).where(and(
      eq(collaborators.id, input.professionalId), eq(collaborators.tenantId, input.tenantId), eq(collaborators.active, true),
    )).limit(1)
    : await db.select({ id: collaborators.id }).from(collaborators).where(and(
      eq(collaborators.tenantId, input.tenantId), eq(collaborators.active, true),
    ));
  const startParts = localDateParts(from, timezone);
  const endParts = localDateParts(to, timezone);
  const firstDay = new Date(`${startParts.year}-${startParts.month}-${startParts.day}T00:00:00Z`);
  const lastDay = new Date(`${endParts.year}-${endParts.month}-${endParts.day}T00:00:00Z`);
  const slots: Array<{ professionalId: string; serviceId: string; startAt: string; endAt: string; timezone: string }> = [];

  for (const { id: professionalId } of professionalRows) {
    const [schedules, busy] = await Promise.all([
      db.select().from(collaboratorSchedules).where(and(
        eq(collaboratorSchedules.tenantId, input.tenantId),
        eq(collaboratorSchedules.collaboratorId, professionalId),
        eq(collaboratorSchedules.isActive, true),
      )),
      db.select({ start: appointments.startTime, end: appointments.endTime }).from(appointments).where(and(
        eq(appointments.tenantId, input.tenantId),
        eq(appointments.specialistId, professionalId),
        ne(appointments.status, 'cancelled'),
        lt(appointments.startTime, to),
        gt(appointments.endTime, from),
      )),
    ]);

    for (let day = new Date(firstDay); day <= lastDay; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10);
      const schedule = schedules.find((item) => item.dayOfWeek === day.getUTCDay() && (!item.week || item.week === isoWeek(date)));
      if (!schedule) continue;
      const scheduleStart = localTimeToDate(date, schedule.startTime, timezone);
      const scheduleEnd = localTimeToDate(date, schedule.endTime, timezone);
      const duration = service.duration;
      for (let start = new Date(scheduleStart); start.getTime() + duration * 60000 <= scheduleEnd.getTime(); start = new Date(start.getTime() + 30 * 60000)) {
        const end = new Date(start.getTime() + duration * 60000);
        if (start < from || end > to || start <= new Date()) continue;
        if (busy.some((item) => item.start < end && item.end > start)) continue;
        slots.push({ professionalId, serviceId: service.id, startAt: start.toISOString(), endAt: end.toISOString(), timezone });
      }
    }
  }
  return { service: { id: service.id, name: service.name, duration: service.duration, price: service.price }, slots: slots.sort((a, b) => a.startAt.localeCompare(b.startAt)) };
}

export async function findAppointmentConflict(input: {
  tenantId: string;
  professionalId: string;
  start: Date;
  end: Date;
}) {
  const rows = await db.select({ id: appointments.id }).from(appointments).where(and(
    eq(appointments.tenantId, input.tenantId),
    eq(appointments.specialistId, input.professionalId),
    ne(appointments.status, 'cancelled'),
    lt(appointments.startTime, input.end),
    gt(appointments.endTime, input.start),
  )).limit(1);
  return rows[0] || null;
}
