import { db } from '../src/db';
import { collaborators } from '../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
          // Detalle de un colaborador específico
          const colab = await db
            .select()
            .from(collaborators)
            .where(and(eq(collaborators.id, id), eq(collaborators.tenantId, tenantId)))
            .limit(1);
          if (colab.length === 0) {
            return res.status(404).json({ error: 'Colaborador no encontrado.' });
          }
          return res.status(200).json(colab[0]);
        } else {
          // Listado general de colaboradores
          const allColabs = await db
            .select()
            .from(collaborators)
            .where(eq(collaborators.tenantId, tenantId))
            .orderBy(desc(collaborators.createdAt));
          return res.status(200).json(allColabs);
        }

      case 'POST':
        const { name, email, phone, specialties, avatarUrl, bio, experience, docType, docNumber, active } = req.body;
        if (!name || !phone) {
          return res.status(400).json({ error: 'El nombre y teléfono son obligatorios.' });
        }
        const [newColab] = await db
          .insert(collaborators)
          .values({
            tenantId,
            name,
            email,
            phone,
            specialties: specialties || [],
            avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
            bio: bio || null,
            experience: experience || null,
            docType: docType || 'Cédula',
            docNumber: docNumber || null,
            active: active !== undefined ? active : true,
          })
          .returning();
        return res.status(201).json(newColab);

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del colaborador para actualizar.' });
        }
        const updateData = req.body;
        const [updatedColab] = await db
          .update(collaborators)
          .set({
            name: updateData.name,
            email: updateData.email,
            phone: updateData.phone,
            specialties: updateData.specialties,
            avatarUrl: updateData.avatarUrl,
            bio: updateData.bio,
            experience: updateData.experience,
            docType: updateData.docType,
            docNumber: updateData.docNumber,
            active: updateData.active,
          })
          .where(and(eq(collaborators.id, id), eq(collaborators.tenantId, tenantId)))
          .returning();
        if (!updatedColab) {
          return res.status(404).json({ error: 'Colaborador no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json(updatedColab);

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del colaborador para eliminar.' });
        }
        const [deletedColab] = await db
          .delete(collaborators)
          .where(and(eq(collaborators.id, id), eq(collaborators.tenantId, tenantId)))
          .returning();
        if (!deletedColab) {
          return res.status(404).json({ error: 'Colaborador no encontrado o no pertenece a su cuenta.' });
        }
        return res.status(200).json({ message: 'Colaborador eliminado correctamente.', deletedColab });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
