import { decryptTenantSecret } from '../utils/hub-inbox.ts';

export type HubAction = 'reply' | 'takeover_start' | 'takeover_release' | 'conversation_delete';

export class HubClientError extends Error {
  status: number;
  code: string;
  responseBody?: any;
  constructor(status: number, code: string, message: string, responseBody?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.responseBody = responseBody;
  }
}

function getBaseUrl() {
  const configured = process.env.HUB_BASE_URL?.trim();
  if (!configured) throw new HubClientError(503, 'HUB_NOT_CONFIGURED', 'La conexión con Hub no está configurada para este entorno.');
  let url: URL;
  try { url = new URL(configured); }
  catch { throw new HubClientError(503, 'HUB_NOT_CONFIGURED', 'La URL de Hub configurada no es válida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new HubClientError(503, 'HUB_NOT_CONFIGURED', 'HUB_BASE_URL debe ser una URL HTTPS de origen.');
  }
  return url.toString().replace(/\/$/, '');
}

function route(tenantRef: string, suffix: string) {
  return `${getBaseUrl()}/api/v1/tenants/${encodeURIComponent(tenantRef)}/conversations${suffix}`;
}

async function requestHub<T>(integration: any, tenantRef: string, suffix: string, options: {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
} = {}): Promise<T> {
  if (!integration.active || !integration.hubApiCredentialCiphertext) {
    throw new HubClientError(503, 'HUB_NOT_CONFIGURED', 'La integración Hub no tiene una credencial de servicio activa.');
  }
  const apiKey = decryptTenantSecret(integration.hubApiCredentialCiphertext);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8_000);
  try {
    const response = await fetch(route(tenantRef, suffix), {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: 'no-store',
    });
    const raw = await response.text();
    let data: any = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = null; }
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new HubClientError(502, 'HUB_CREDENTIAL_OR_SCOPE_INVALID', 'La key Hub no es válida o no tiene los scopes requeridos.');
      }
      const message = response.status === 404 ? 'La conversación solicitada no existe en Hub.'
            : response.status === 409 ? 'Hub rechazó el estado actual de la conversación.'
              : response.status === 422 ? 'Hub rechazó los datos de la solicitud.'
                : 'Hub no pudo completar la operación.';
      throw new HubClientError(response.status, 'HUB_REQUEST_FAILED', message, data);
    }
    const result = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    result.hubHttpStatus = response.status;
    return result as T;
  } catch (error: any) {
    if (error instanceof HubClientError) throw error;
    if (error?.name === 'AbortError') throw new HubClientError(504, 'HUB_TIMEOUT_UNKNOWN', 'Hub no respondió a tiempo. Si reintentas el envío, conserva la misma Idempotency-Key.');
    throw new HubClientError(502, 'HUB_UNAVAILABLE', 'No fue posible conectar con Hub.');
  } finally {
    clearTimeout(timeout);
  }
}

export function listHubConversations(integration: any, tenantRef: string, limit = 50, cursor?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  return requestHub<any>(integration, tenantRef, `?${query}`);
}

export function getHubMessages(integration: any, tenantRef: string, conversationId: string, limit = 100, cursor?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  return requestHub<any>(integration, tenantRef, `/${encodeURIComponent(conversationId)}/messages?${query}`);
}

export function performHubAction(integration: any, tenantRef: string, conversationId: string, action: HubAction, args: {
  content?: string;
  idempotencyKey?: string;
  reason?: string;
  senderId?: string;
  senderName?: string;
}) {
  const path = `/${encodeURIComponent(conversationId)}`;
  if (action === 'takeover_start') return requestHub<any>(integration, tenantRef, `${path}/takeover`, { method: 'POST', body: { reason: args.reason || 'Atención solicitada desde Miesbe', ...(args.senderId ? { assignedTo: args.senderId } : {}) } });
  if (action === 'takeover_release') return requestHub<any>(integration, tenantRef, `${path}/takeover`, { method: 'DELETE' });
  if (action === 'conversation_delete') return requestHub<any>(integration, tenantRef, path, { method: 'DELETE' });
  return requestHub<any>(integration, tenantRef, `${path}/messages`, {
    method: 'POST',
    idempotencyKey: args.idempotencyKey,
    body: { content: args.content, senderId: args.senderId, senderName: args.senderName },
  });
}
