import test from 'node:test';
import assert from 'node:assert/strict';

process.env.HUB_INTEGRATION_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.HUB_BASE_URL = 'https://hub.test.invalid';
const { encryptTenantSecret, decryptTenantSecret, verifySignedEvent, hasMessageReadPermission, hasMessageWritePermission, readRawBody } = await import('../src/utils/hub-inbox.ts');
const { processSignedHubEvent } = await import('../src/utils/hub-inbox-events.ts');
const { performHubAction, listHubConversations, getHubMessages, HubClientError } = await import('../src/services/hub-client.ts');
import { createHmac } from 'node:crypto';

test('encrypts tenant secret and decrypts only with configured master key', () => {
  const secret = 'tenant-specific-signing-secret-0123456789';
  const encrypted = encryptTenantSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptTenantSecret(encrypted), secret);
  process.env.HUB_INTEGRATION_MASTER_KEY = Buffer.alloc(32, 8).toString('base64');
  assert.throws(() => decryptTenantSecret(encrypted));
  process.env.HUB_INTEGRATION_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
});

test('accepts only an exact signed raw body within five-minute window', () => {
  const body = Buffer.from('{"event_id":"evt_1"}');
  const nowMs = 1_800_000_000_000;
  const timestamp = String(Math.floor(nowMs / 1000));
  const signature = createHmac('sha256', 'test-secret').update(`${timestamp}.`).update(body).digest('hex');
  assert.equal(verifySignedEvent(body, timestamp, `sha256=${signature}`, 'test-secret', nowMs), true);
  assert.equal(verifySignedEvent(Buffer.from('{"event_id":"evt_2"}'), timestamp, signature, 'test-secret', nowMs), false);
  assert.equal(verifySignedEvent(body, String(Number(timestamp) - 301), signature, 'test-secret', nowMs), false);
});

test('rejects parsed JSON rather than signing a re-serialized body', async () => {
  await assert.rejects(() => readRawBody({ body: { event_id: 'evt_1' } }));
});

test('read access preserves legacy module authorization while writes require explicit messages permission', () => {
  assert.equal(hasMessageReadPermission({ active: true, role: 'receptionist', permissions: { clientes: { leer: true } } }), true);
  assert.equal(hasMessageReadPermission({ active: true, role: 'accountant', permissions: null }), false);
  assert.equal(hasMessageWritePermission({ active: true, role: 'admin' }), true);
  assert.equal(hasMessageWritePermission({ active: true, role: 'receptionist', permissions: { mensajes: { crear: true } } }), true);
  assert.equal(hasMessageWritePermission({ active: true, role: 'specialist', permissions: { clientes: { crear: true } } }), false);
});

function mockEventRuntime() {
  const integration = { tenantId: 'miesbe-tenant', hubTenantId: 'hub-tenant' };
  const records = new Map();
  let applied = 0;
  return {
    records,
    get applied() { return applied; },
    get registered() { return records.size; },
    input: {
      event: { schema_version: 1, event_id: 'evt-1', event_type: 'conversation.created', tenant_id: 'hub-tenant', conversation_id: 'conv-1', sequence: 1, occurred_at: '2026-10-01T12:00:00Z', data: {} },
      rawBody: Buffer.from('{"event_id":"evt-1"}'), timestamp: '1800000000', signature: 'sha256=opaque', now: new Date(1800000000 * 1000),
      headerEventId: 'evt-1',
      resolveIntegration: async (id) => id === integration.hubTenantId ? integration : null,
      verifyIntegrationSignature: async () => true,
      registerEvent: async (_tenant, event, payloadHash) => {
        const found = records.get(event.event_id);
        if (found) return { id: found.id, processed: found.processed, bodyMismatch: found.payloadHash !== payloadHash };
        const record = { id: event.event_id, payloadHash, processed: false };
        records.set(event.event_id, record);
        return record;
      },
      applyEvent: async () => { applied++; },
      markProcessed: async (id) => { records.get(id).processed = true; },
    },
  };
}

test('accepts a valid signed Hub event and marks it processed', async () => {
  const runtime = mockEventRuntime();
  const result = await processSignedHubEvent(runtime.input);
  assert.equal(result.status, 202);
  assert.equal(runtime.applied, 1);
});

test('rejects invalid credentials and an unassociated tenant before applying event', async () => {
  const invalidSignature = mockEventRuntime();
  invalidSignature.input.verifyIntegrationSignature = () => false;
  assert.equal((await processSignedHubEvent(invalidSignature.input)).status, 401);
  assert.equal(invalidSignature.registered, 0, 'invalid signatures must not persist an event');
  const wrongTenant = mockEventRuntime();
  wrongTenant.input.event.tenant_id = 'another-hub-tenant';
  assert.equal((await processSignedHubEvent(wrongTenant.input)).status, 404);
  assert.equal(wrongTenant.registered, 0, 'unmapped tenants must not persist an event');
  assert.equal(invalidSignature.applied + wrongTenant.applied, 0);
});

test('rejects malformed signature headers before event persistence', async () => {
  const runtime = mockEventRuntime();
  runtime.input.signature = 'not-a-sha256-signature';
  runtime.input.verifyIntegrationSignature = (_integration, body, timestamp, signature, now) =>
    verifySignedEvent(body, timestamp, signature, 'test-secret', now.valueOf());
  assert.equal((await processSignedHubEvent(runtime.input)).status, 401);
  assert.equal(runtime.registered, 0);
  assert.equal(runtime.applied, 0);
});

test('repeated event ID is acknowledged without applying twice', async () => {
  const runtime = mockEventRuntime();
  assert.equal((await processSignedHubEvent(runtime.input)).status, 202);
  const duplicate = await processSignedHubEvent(runtime.input);
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.duplicate, true);
  assert.equal(runtime.applied, 1);
});

test('requires v1 envelope and matching X-Hub-Event-Id; rejects event ID with a changed snapshot', async () => {
  const badHeader = mockEventRuntime();
  badHeader.input.headerEventId = 'different-id';
  assert.equal((await processSignedHubEvent(badHeader.input)).status, 400);

  const badVersion = mockEventRuntime();
  badVersion.input.event.schema_version = 2;
  assert.equal((await processSignedHubEvent(badVersion.input)).status, 422);

  const changed = mockEventRuntime();
  assert.equal((await processSignedHubEvent(changed.input)).status, 202);
  const replay = { ...changed.input, rawBody: Buffer.from('{"event_id":"evt-1","different":true}') };
  const conflict = await processSignedHubEvent(replay);
  assert.equal(conflict.status, 409);
  assert.equal(changed.applied, 1);
});

test('Hub client uses server Bearer key, Hub UUID path, scopes routes and exact idempotency key', async () => {
  const apiKey = 'hub-service-key-secret';
  const integration = {
    active: true,
    hubApiCredentialCiphertext: encryptTenantSecret(apiKey),
  };
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ messageId: 'msg-1', status: 'accepted', delivery: 'sent', providerMessageId: null }), { status: 202 });
  };
  try {
    const result = await performHubAction(integration, 'hub-tenant-uuid', 'conv/id', 'reply', {
      content: 'Hola', senderId: 'user-1', senderName: 'Recepción', idempotencyKey: 'stable-operation-key-01',
    });
    assert.equal(requests[0].url, 'https://hub.test.invalid/api/v1/tenants/hub-tenant-uuid/conversations/conv%2Fid/messages');
    assert.equal(requests[0].options.headers.Authorization, `Bearer ${apiKey}`);
    assert.equal(requests[0].options.headers['Idempotency-Key'], 'stable-operation-key-01');
    assert.deepEqual(JSON.parse(requests[0].options.body), { content: 'Hola', senderId: 'user-1', senderName: 'Recepción' });
    assert.equal(result.delivery, 'sent');
    assert.equal(result.hubHttpStatus, 202);
  } finally { globalThis.fetch = originalFetch; }
});

test('Hub client uses the documented conversation read routes and cursor pagination', async () => {
  const integration = { active: true, hubApiCredentialCiphertext: encryptTenantSecret('hub-read-key') };
  const seen = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { seen.push(String(url)); return new Response('{"conversations":[],"page":{"hasMore":false}}', { status: 200 }); };
  try {
    await listHubConversations(integration, 'hub-uuid', 25, 'page-token');
    await getHubMessages(integration, 'hub-uuid', 'conv-1', 40, 'message-cursor');
    assert.match(seen[0], /\/api\/v1\/tenants\/hub-uuid\/conversations\?limit=25&cursor=page-token$/);
    assert.match(seen[1], /\/api\/v1\/tenants\/hub-uuid\/conversations\/conv-1\/messages\?limit=40&cursor=message-cursor$/);
  } finally { globalThis.fetch = originalFetch; }
});

test('Hub client maps ambiguous network timeout without retrying or changing idempotency key', async () => {
  const integration = { active: true, hubApiCredentialCiphertext: encryptTenantSecret('hub-timeout-key') };
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; const timeout = new Error('timeout'); timeout.name = 'AbortError'; throw timeout; };
  try {
    await assert.rejects(
      () => performHubAction(integration, 'hub-uuid', 'conv-1', 'reply', { content: 'Hi', idempotencyKey: 'stable-key-timeout' }),
      (error) => error instanceof HubClientError && error.status === 504 && error.code === 'HUB_TIMEOUT_UNKNOWN',
    );
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('Hub client maps takeover, release and deletion methods to the documented UUID routes', async () => {
  const integration = { active: true, hubApiCredentialCiphertext: encryptTenantSecret('hub-takeover-key') };
  const seen = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => { seen.push({ url: String(url), method: options.method, auth: options.headers.Authorization }); return new Response('{}', { status: 200 }); };
  try {
    await performHubAction(integration, 'hub-uuid', 'conversation-uuid', 'takeover_start', { senderId: 'miesbe-user' });
    await performHubAction(integration, 'hub-uuid', 'conversation-uuid', 'takeover_release');
    await performHubAction(integration, 'hub-uuid', 'conversation-uuid', 'conversation_delete');
    assert.deepEqual(seen.map(item => item.method), ['POST', 'DELETE', 'DELETE']);
    assert.deepEqual(seen.map(item => item.url), [
      'https://hub.test.invalid/api/v1/tenants/hub-uuid/conversations/conversation-uuid/takeover',
      'https://hub.test.invalid/api/v1/tenants/hub-uuid/conversations/conversation-uuid/takeover',
      'https://hub.test.invalid/api/v1/tenants/hub-uuid/conversations/conversation-uuid',
    ]);
    assert.ok(seen.every(item => item.auth === 'Bearer hub-takeover-key'));
  } finally { globalThis.fetch = originalFetch; }
});

test('Hub client never falls back to a hardcoded host when HUB_BASE_URL is absent', async () => {
  const integration = { active: true, hubApiCredentialCiphertext: encryptTenantSecret('hub-no-host-key') };
  const originalBase = process.env.HUB_BASE_URL;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  delete process.env.HUB_BASE_URL;
  globalThis.fetch = async () => { calls++; return new Response('{}'); };
  try {
    await assert.rejects(() => listHubConversations(integration, 'hub-uuid'), error => error.code === 'HUB_NOT_CONFIGURED');
    assert.equal(calls, 0);
  } finally {
    process.env.HUB_BASE_URL = originalBase;
    globalThis.fetch = originalFetch;
  }
});

test('Hub definitive Evolution failure is preserved with its failed message result', async () => {
  const integration = { active: true, hubApiCredentialCiphertext: encryptTenantSecret('hub-failed-key') };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messageId: 'message-failed', status: 'failed', delivery: 'failed', error: 'Message delivery failed' }), { status: 502 });
  try {
    await assert.rejects(
      () => performHubAction(integration, 'hub-uuid', 'conversation-uuid', 'reply', { content: 'Hola', idempotencyKey: 'same-stable-key-0001' }),
      error => error instanceof HubClientError && error.status === 502 && error.responseBody.messageId === 'message-failed' && error.responseBody.delivery === 'failed',
    );
  } finally { globalThis.fetch = originalFetch; }
});

test('Hub rejects invalid service key/scopes as a server integration error, not as a browser API-key failure', async () => {
  const integration = { active: true, hubApiCredentialCiphertext: encryptTenantSecret('hub-insufficient-scope') };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"error":"Invalid API key or scope"}', { status: 403 });
  try {
    await assert.rejects(
      () => listHubConversations(integration, 'hub-uuid'),
      error => error instanceof HubClientError && error.status === 502 && error.code === 'HUB_CREDENTIAL_OR_SCOPE_INVALID',
    );
  } finally { globalThis.fetch = originalFetch; }
});
