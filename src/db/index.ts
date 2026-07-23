import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Connection string supplied by the user
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_8wW5PetGcpiE@ep-sparkling-darkness-atab8ji5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = neon(connectionString);
export const db = drizzle(client, { schema });
