import { db } from '../../src/db';
import { users, tenants } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../../src/utils/auth';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    const userList = await db.select().from(users).where(eq(users.email, email));
    const foundUser = userList[0];

    if (!foundUser || !foundUser.passwordHash) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (!verifyPassword(password, foundUser.passwordHash)) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const tenantList = await db.select().from(tenants).where(eq(tenants.id, foundUser.tenantId));
    const { passwordHash: _, ...safeUser } = foundUser;

    return res.status(200).json({ user: safeUser, tenant: tenantList[0] || null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al iniciar sesión.' });
  }
}
