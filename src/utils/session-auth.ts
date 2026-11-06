import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { authSessions, users } from '../db/schema.js';

export async function getSessionUser(req: any) {
  const token = String(req.headers?.['x-session-token'] || '');
  if (!token) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const rows = await db.select({ user: users, session: authSessions })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(eq(authSessions.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row || row.session.expiresAt <= new Date() || !row.user.active) return null;
  return row.user;
}
