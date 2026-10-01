const acceptedTypes = new Set([
  'conversation.created', 'message.created', 'message.delivery_updated',
  'conversation.takeover_started', 'conversation.takeover_released', 'conversation.deleted',
]);

export async function processSignedHubEvent(input: {
  event: any;
  rawBody: Buffer;
  timestamp: unknown;
  signature: unknown;
  headerEventId: unknown;
  now?: Date;
  resolveIntegration: (hubTenantId: string) => Promise<any | null>;
  verifyIntegrationSignature: (integration: any, rawBody: Buffer, timestamp: unknown, signature: unknown, now: Date) => boolean;
  registerEvent: (integration: any, event: any, payloadHash: string) => Promise<{ id: string; processed: boolean; bodyMismatch?: boolean }>;
  applyEvent: (integration: any, event: any) => Promise<void>;
  markProcessed: (eventRecordId: string) => Promise<void>;
}) {
  const { event } = input;
  if (!event || event.schema_version !== 1 || typeof event.event_id !== 'string' || typeof event.tenant_id !== 'string' ||
      typeof event.conversation_id !== 'string' || typeof event.event_type !== 'string' || !acceptedTypes.has(event.event_type) ||
      !Number.isSafeInteger(event.sequence) || event.sequence < 1 ||
      typeof event.occurred_at !== 'string' || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) {
    return { status: 422, code: 'INVALID_EVENT', message: 'Faltan campos obligatorios o el tipo no está soportado.' };
  }
  if (typeof input.headerEventId !== 'string' || input.headerEventId !== event.event_id) {
    return { status: 400, code: 'EVENT_ID_MISMATCH', message: 'X-Hub-Event-Id debe coincidir con event_id.' };
  }
  const occurredAt = new Date(event.occurred_at);
  if (Number.isNaN(occurredAt.valueOf())) return { status: 422, code: 'INVALID_EVENT', message: 'occurred_at no es una fecha válida.' };

  const now = input.now || new Date();
  // Authenticate first using configured signing secrets; tenant_id is an untrusted lookup selector.
  const integration = await input.resolveIntegration(event.tenant_id);
  if (!integration) return { status: 404, code: 'TENANT_NOT_ASSOCIATED', message: 'El tenant Hub no tiene una integración activa.' };
  if (!input.verifyIntegrationSignature(integration, input.rawBody, input.timestamp, input.signature, now)) {
    return { status: 401, code: 'INVALID_SIGNATURE', message: 'La firma del evento es inválida o venció.' };
  }

  const payloadHash = await sha256(input.rawBody);
  const receipt = await input.registerEvent(integration, event, payloadHash);
  if (receipt.bodyMismatch) return { status: 409, code: 'EVENT_ID_REUSED', message: 'event_id ya existe con un snapshot diferente.' };
  if (receipt.processed) return { status: 200, code: 'DUPLICATE', accepted: true, duplicate: true };
  await input.applyEvent(integration, event);
  await input.markProcessed(receipt.id);
  return { status: 202, accepted: true, duplicate: false };
}

async function sha256(body: Buffer) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(body).digest('hex');
}
