import { db } from '../src/db/index.js';
import { products } from '../src/db/schema.js';
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
      case 'GET': {
        if (id) {
          const item = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.tenantId, tenantId)),
          });
          if (!item) return res.status(404).json({ error: 'Producto no encontrado.' });
          return res.status(200).json(item);
        }

        const list = await db.query.products.findMany({
          where: eq(products.tenantId, tenantId),
          orderBy: [desc(products.createdAt)],
        });
        return res.status(200).json(list);
      }

      case 'POST': {
        const { name, description, sku, price, cost, stock, minStock, category } = req.body;

        if (!name || price === undefined) {
          return res.status(400).json({ error: 'El nombre y el precio son obligatorios.' });
        }

        const [newProduct] = await db
          .insert(products)
          .values({
            tenantId,
            name: name.trim(),
            description: description?.trim() || null,
            sku: sku?.trim() || null,
            price: (parseFloat(price) || 0).toFixed(2),
            cost: (parseFloat(cost) || 0).toFixed(2),
            stock: parseInt(stock, 10) || 0,
            minStock: parseInt(minStock, 10) || 2,
            category: category?.trim() || 'General',
            active: true,
          })
          .returning();

        return res.status(201).json(newProduct);
      }

      case 'PUT': {
        if (!id) return res.status(400).json({ error: 'Falta el id del producto.' });

        const { name, description, sku, price, cost, stock, minStock, category, active } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (sku !== undefined) updateData.sku = sku?.trim() || null;
        if (price !== undefined) updateData.price = (parseFloat(price) || 0).toFixed(2);
        if (cost !== undefined) updateData.cost = (parseFloat(cost) || 0).toFixed(2);
        if (stock !== undefined) updateData.stock = parseInt(stock, 10) || 0;
        if (minStock !== undefined) updateData.minStock = parseInt(minStock, 10) || 0;
        if (category !== undefined) updateData.category = category?.trim() || 'General';
        if (active !== undefined) updateData.active = Boolean(active);

        const [updatedProduct] = await db
          .update(products)
          .set(updateData)
          .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
          .returning();

        return res.status(200).json(updatedProduct);
      }

      case 'DELETE': {
        if (!id) return res.status(400).json({ error: 'Falta el id del producto.' });

        const [deleted] = await db
          .update(products)
          .set({ active: false })
          .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
          .returning();

        return res.status(200).json(deleted);
      }

      default:
        return res.status(405).json({ error: 'Método no permitido.' });
    }
  } catch (error: any) {
    console.error('Error en api/products:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
