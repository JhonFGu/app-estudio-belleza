import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running database migration for tenants logo_url column...');
  try {
    await db.execute(sql`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url text;
    `);
    console.log('Migration completed successfully!');
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

migrate();
