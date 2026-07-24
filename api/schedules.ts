import { db } from '../src/db/index.js';
import { collaboratorSchedules } from '../src/db/schema.js';
import { eq, and } from 'drizzle-orm';

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

  const { collaboratorId } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (collaboratorId) {
          const schedules = await db
            .select()
            .from(collaboratorSchedules)
            .where(
              and(
                eq(collaboratorSchedules.collaboratorId, collaboratorId),
                eq(collaboratorSchedules.tenantId, tenantId)
              )
            );
          return res.status(200).json(schedules);
        } else {
          const allSchedules = await db
            .select()
            .from(collaboratorSchedules)
            .where(eq(collaboratorSchedules.tenantId, tenantId));
          return res.status(200).json(allSchedules);
        }

      case 'POST':
        // Cargar múltiples horarios (ej: reconfiguración completa de disponibilidad del especialista)
        const { schedules: inputSchedules } = req.body;
        if (!inputSchedules || !Array.isArray(inputSchedules)) {
          return res.status(400).json({ error: 'Se requiere una lista de horarios en el cuerpo de la petición.' });
        }

        const insertedSchedules = [];
        for (const item of inputSchedules) {
          const { collaboratorId: itemCollabId, dayOfWeek, week, startTime, endTime, isActive } = item;
          if (!itemCollabId || dayOfWeek === undefined || !startTime || !endTime) {
            continue;
          }

          // Eliminar horario previo para ese día, semana y especialista del mismo tenant
          if (week) {
            await db.delete(collaboratorSchedules).where(
              and(
                eq(collaboratorSchedules.collaboratorId, itemCollabId),
                eq(collaboratorSchedules.dayOfWeek, dayOfWeek),
                eq(collaboratorSchedules.week, week),
                eq(collaboratorSchedules.tenantId, tenantId)
              )
            );
          } else {
            await db.delete(collaboratorSchedules).where(
              and(
                eq(collaboratorSchedules.collaboratorId, itemCollabId),
                eq(collaboratorSchedules.dayOfWeek, dayOfWeek),
                eq(collaboratorSchedules.tenantId, tenantId)
              )
            );
          }

          // Insertar nuevo horario
          const [newSchedule] = await db
            .insert(collaboratorSchedules)
            .values({
              tenantId,
              collaboratorId: itemCollabId,
              dayOfWeek,
              week: week || null,
              startTime,
              endTime,
              isActive: isActive !== undefined ? isActive : true,
            })
            .returning();
          insertedSchedules.push(newSchedule);
        }

        return res.status(200).json(insertedSchedules);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
