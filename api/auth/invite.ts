import { db } from '../../src/db/index.js';
import { users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../src/utils/auth.js';

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
    const { tenantId, role, name, email, password } = req.body;

    if (!tenantId || !role || !name || !email || !password) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (tenantId, role, name, email, password).' });
    }

    const passwordHash = hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        tenantId,
        name,
        email,
        passwordHash,
        role,
        active: true,
      })
      .returning();

    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({ user: safeUser });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al registrar usuario invitado.' });
  }
}
