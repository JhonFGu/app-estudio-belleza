import { db } from '../../src/db/index.js';
import { tenants, users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, generateSlug } from '../../src/utils/auth.js';

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
    const { name, companyName, email, password } = req.body;

    if (!name || !companyName || !email || !password) {
      return res.status(400).json({ error: 'Nombre, empresa, correo y contraseña son obligatorios.' });
    }

    const slug = generateSlug(companyName);
    const passwordHash = hashPassword(password);

    const [newTenant] = await db
      .insert(tenants)
      .values({ name: companyName, slug })
      .returning();

    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: newTenant.id,
        name,
        email,
        passwordHash,
        role: 'admin',
        active: true,
      })
      .returning();

    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({ user: safeUser, tenant: newTenant });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al registrar.' });
  }
}
