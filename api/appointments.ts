import { db } from '../src/db';
import { appointments, clients, collaborators, services, loyaltyConfig, loyaltyPoints, clientActivityLog } from '../src/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

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
          const appointment = await db
            .select({
              id: appointments.id,
              startTime: appointments.startTime,
              endTime: appointments.endTime,
              status: appointments.status,
              notes: appointments.notes,
              clientId: appointments.clientId,
              specialistId: appointments.specialistId,
              serviceId: appointments.serviceId,
              client: {
                id: clients.id,
                name: clients.name,
                phone: clients.phone,
                email: clients.email,
              },
              specialist: {
                id: collaborators.id,
                name: collaborators.name,
                avatarUrl: collaborators.avatarUrl,
              },
              service: {
                id: services.id,
                name: services.name,
                duration: services.duration,
                price: services.price,
              },
            })
            .from(appointments)
            .innerJoin(clients, eq(appointments.clientId, clients.id))
            .innerJoin(collaborators, eq(appointments.specialistId, collaborators.id))
            .innerJoin(services, eq(appointments.serviceId, services.id))
            .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
            .limit(1);

          if (appointment.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada.' });
          }
          return res.status(200).json(appointment[0]);
        } else {
          // Listado general con joins para el calendario y agenda
          const list = await db
            .select({
              id: appointments.id,
              startTime: appointments.startTime,
              endTime: appointments.endTime,
              status: appointments.status,
              notes: appointments.notes,
              clientId: appointments.clientId,
              specialistId: appointments.specialistId,
              serviceId: appointments.serviceId,
              client: {
                id: clients.id,
                name: clients.name,
                phone: clients.phone,
                email: clients.email,
              },
              specialist: {
                id: collaborators.id,
                name: collaborators.name,
                avatarUrl: collaborators.avatarUrl,
              },
              service: {
                id: services.id,
                name: services.name,
                duration: services.duration,
                price: services.price,
              },
            })
            .from(appointments)
            .innerJoin(clients, eq(appointments.clientId, clients.id))
            .innerJoin(collaborators, eq(appointments.specialistId, collaborators.id))
            .innerJoin(services, eq(appointments.serviceId, services.id))
            .where(eq(appointments.tenantId, tenantId))
            .orderBy(asc(appointments.startTime));
          return res.status(200).json(list);
        }

      case 'POST':
        const { clientId, specialistId, serviceId, startTime, endTime, notes, status } = req.body;
        if (!clientId || !specialistId || !serviceId || !startTime || !endTime) {
          return res.status(400).json({ error: 'Cliente, especialista, servicio, hora de inicio y fin son obligatorios.' });
        }
        const [newApp] = await db
          .insert(appointments)
          .values({
            tenantId,
            clientId,
            specialistId,
            serviceId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            notes: notes || null,
            status: status || 'scheduled',
          })
          .returning();
        return res.status(201).json(newApp);

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la cita para actualizar.' });
        }
        const updateData = req.body;
        const [updatedApp] = await db
          .update(appointments)
          .set({
            clientId: updateData.clientId,
            specialistId: updateData.specialistId,
            serviceId: updateData.serviceId,
            startTime: updateData.startTime ? new Date(updateData.startTime) : undefined,
            endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
            status: updateData.status,
            notes: updateData.notes,
          })
          .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
          .returning();
        if (!updatedApp) {
          return res.status(404).json({ error: 'Cita no encontrada o no pertenece a su cuenta.' });
        }

        if (updateData.status === 'completed') {
          const serviceData = await db
            .select({ id: services.id, name: services.name, price: services.price })
            .from(services)
            .where(and(eq(services.id, updatedApp.serviceId), eq(services.tenantId, tenantId)))
            .limit(1);

          if (serviceData.length > 0) {
            const [config] = await db
              .select()
              .from(loyaltyConfig)
              .where(and(eq(loyaltyConfig.tenantId, tenantId), eq(loyaltyConfig.isActive, true)))
              .limit(1);

            if (config) {
              const servicePrice = parseFloat(serviceData[0].price);
              const currencyUnit = parseFloat(String(config.currencyUnit));
              const pointsEarned = Math.floor(servicePrice / currencyUnit) * config.pointsPerCurrencyUnit;

              if (pointsEarned > 0) {
                const [lastPoint] = await db
                  .select({ balanceAfter: loyaltyPoints.balanceAfter })
                  .from(loyaltyPoints)
                  .where(
                    and(
                      eq(loyaltyPoints.tenantId, tenantId),
                      eq(loyaltyPoints.clientId, updatedApp.clientId)
                    )
                  )
                  .orderBy(desc(loyaltyPoints.createdAt))
                  .limit(1);

                const currentBalance = lastPoint ? lastPoint.balanceAfter : 0;
                const newBalance = currentBalance + pointsEarned;

                await db.insert(loyaltyPoints).values({
                  tenantId,
                  clientId: updatedApp.clientId,
                  points: pointsEarned,
                  type: 'earned',
                  referenceType: 'appointment',
                  referenceId: updatedApp.id,
                  description: `Cita completada: ${serviceData[0].name}`,
                  balanceAfter: newBalance,
                });
              }
            }
          }
        }

        // Log activity for status changes (completed / cancelled / no_show)
        if (['completed', 'cancelled', 'no_show'].includes(updateData.status)) {
          const specialistData = await db
            .select({ name: collaborators.name })
            .from(collaborators)
            .where(and(eq(collaborators.id, updatedApp.specialistId), eq(collaborators.tenantId, tenantId)))
            .limit(1);

          const serviceNameData = await db
            .select({ name: services.name })
            .from(services)
            .where(and(eq(services.id, updatedApp.serviceId), eq(services.tenantId, tenantId)))
            .limit(1);

          const specialistName = specialistData.length > 0 ? specialistData[0].name : 'Especialista';
          const serviceName = serviceNameData.length > 0 ? serviceNameData[0].name : 'Servicio';

          let logAction: string;
          let logDescription: string;

          switch (updateData.status) {
            case 'completed':
              logAction = 'appointment_completed';
              logDescription = `Servicio completado: ${serviceName} con ${specialistName}`;
              break;
            case 'cancelled':
              logAction = 'appointment_cancelled';
              logDescription = `Cita cancelada: ${serviceName} con ${specialistName}`;
              break;
            case 'no_show':
              logAction = 'appointment_no_show';
              logDescription = `Cliente no asistio a: ${serviceName} con ${specialistName}`;
              break;
            default:
              logAction = '';
          }

          if (logAction) {
            await db.insert(clientActivityLog).values({
              tenantId,
              clientId: updatedApp.clientId,
              action: logAction,
              description: logDescription,
              metadata: {
                appointmentId: updatedApp.id,
                serviceId: updatedApp.serviceId,
                specialistId: updatedApp.specialistId,
                date: updatedApp.startTime,
              },
            });
          }
        }

        return res.status(200).json(updatedApp);

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID de la cita para eliminar.' });
        }
        const [deletedApp] = await db
          .delete(appointments)
          .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
          .returning();
        if (!deletedApp) {
          return res.status(404).json({ error: 'Cita no encontrada o no pertenece a su cuenta.' });
        }
        return res.status(200).json({ message: 'Cita eliminada correctamente.', deletedApp });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
