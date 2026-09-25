import { createHmac, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { webhookDeliveries, webhookSubscriptions } from '../db/schema.js';

export async function dispatchWebhook(tenantId: string, eventType: string, data: unknown) {
  const subscriptions = await db.select().from(webhookSubscriptions).where(and(eq(webhookSubscriptions.tenantId, tenantId), eq(webhookSubscriptions.active, true)));
  for (const subscription of subscriptions) {
    if (subscription.events.length && !subscription.events.includes(eventType) && !subscription.events.includes('*')) continue;
    const eventId = `evt_${randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = JSON.stringify({ id: eventId, type: eventType, created_at: new Date().toISOString(), data });
    const signature = createHmac('sha256', subscription.secret).update(`${timestamp}.${payload}`).digest('hex');
    let statusCode: number | null = null;
    let lastError: string | null = null;
    let deliveredAt: Date | null = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      attempts = attempt;
      try {
        const response = await fetch(subscription.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Id': eventId, 'X-Webhook-Timestamp': timestamp, 'X-Webhook-Signature': `sha256=${signature}` }, body: payload });
        statusCode = response.status;
        if (response.ok) { deliveredAt = new Date(); break; }
        lastError = `HTTP ${response.status}`;
      } catch (error: any) { lastError = error.message || 'Webhook request failed'; }
    }
    await db.insert(webhookDeliveries).values({ subscriptionId: subscription.id, eventId, eventType, statusCode, attempts, deliveredAt, lastError });
  }
}
