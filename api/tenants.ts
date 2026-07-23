import { db } from '../src/db';
import { tenants } from '../src/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tenant-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'PUT') {
      const { id, logoUrl, name, nit, phone, email, address, city, country, currency, category, website, instagram } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Se requiere el ID del inquilino.' });
      }
      const updateData: Record<string, any> = {};
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      if (name !== undefined) updateData.name = name;
      if (nit !== undefined) updateData.nit = nit;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (country !== undefined) updateData.country = country;
      if (currency !== undefined) updateData.currency = currency;
      if (category !== undefined) updateData.category = category;
      if (website !== undefined) updateData.website = website;
      if (instagram !== undefined) updateData.instagram = instagram;
      const [updated] = await db
        .update(tenants)
        .set(updateData)
        .where(eq(tenants.id, id))
        .returning();
      return res.status(200).json(updated);
    }

    const list = await db.select().from(tenants);
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
