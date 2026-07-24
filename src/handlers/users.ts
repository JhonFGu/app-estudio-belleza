import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { hashPassword } from '../utils/auth.js';

function stripPassword(user: any) {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return safe;
}

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
          const userItem = await db
            .select()
            .from(users)
            .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
            .limit(1);
          if (userItem.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
          }
          return res.status(200).json(stripPassword(userItem[0]));
        } else {
          const allUsers = await db
            .select()
            .from(users)
            .where(eq(users.tenantId, tenantId))
            .orderBy(desc(users.createdAt));
          return res.status(200).json(allUsers.map(stripPassword));
        }

      case 'POST':
        const { name, email, role, phone, active, permissions, password } = req.body;
        if (!name || !email) {
          return res.status(400).json({ error: 'El nombre y correo son obligatorios.' });
        }
        const newUser = await db
          .insert(users)
          .values({
            tenantId,
            name,
            email,
            passwordHash: password ? hashPassword(password) : 'hashed_dummy_pass',
            role: role || 'specialist',
            phone: phone || null,
            active: active !== undefined ? active : true,
            permissions: permissions || null,
          })
          .returning();
        return res.status(201).json(stripPassword(newUser[0]));

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del usuario para actualizar.' });
        }
        const updateData = req.body;
        const [updatedUser] = await db
          .update(users)
          .set({
            name: updateData.name !== undefined ? updateData.name : undefined,
            email: updateData.email !== undefined ? updateData.email : undefined,
            role: updateData.role !== undefined ? updateData.role : undefined,
            phone: updateData.phone !== undefined ? updateData.phone : undefined,
            active: updateData.active !== undefined ? updateData.active : undefined,
            permissions: updateData.permissions !== undefined ? updateData.permissions : undefined,
          })
          .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
          .returning();

        if (!updatedUser) {
          return res.status(404).json({ error: 'Usuario no encontrado o no pertenece al tenant.' });
        }
        return res.status(200).json(stripPassword(updatedUser));

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Se requiere el ID del usuario para eliminar.' });
        }
        const [deletedUser] = await db
          .delete(users)
          .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
          .returning();

        if (!deletedUser) {
          return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        return res.status(200).json({ message: 'Usuario eliminado correctamente.', deletedUser });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
