import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const MAX_EVENT_BYTES = 256 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export function getMasterKey() {
  const encoded = process.env.HUB_INTEGRATION_MASTER_KEY || '';
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('HUB_INTEGRATION_MASTER_KEY must be a base64-encoded 32-byte key.');
  return key;
}

export function decryptTenantSecret(ciphertext: string) {
  const [version, ivText, tagText, dataText] = ciphertext.split(':');
  if (version !== 'v1' || !ivText || !tagText || !dataText) throw new Error('Invalid encrypted Hub secret.');
  const decipher = createDecipheriv('aes-256-gcm', getMasterKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataText, 'base64')), decipher.final()]).toString('utf8');
}

export function encryptTenantSecret(secret: string) {
  const iv = randomBytes(12);
  const encryptor = createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const encrypted = Buffer.concat([encryptor.update(secret, 'utf8'), encryptor.final()]);
  return `v1:${iv.toString('base64')}:${encryptor.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

export async function readRawBody(req: any): Promise<Buffer> {
  const raw = req.rawBody ?? req.body;
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > MAX_EVENT_BYTES) throw new Error('Raw request body exceeds limit.');
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Raw request body is required for webhook signature verification.');
}

export function verifySignedEvent(rawBody: Buffer, timestampHeader: unknown, signatureHeader: unknown, secret: string, nowMs = Date.now()) {
  if (rawBody.length > MAX_EVENT_BYTES) return false;
  const timestampText = String(timestampHeader ?? '');
  if (!/^\d{1,12}$/.test(timestampText)) return false;
  const timestamp = Number(timestampText);
  const suppliedText = String(signatureHeader || '').replace(/^sha256=/, '');
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(nowMs / 1000) - timestamp) > MAX_CLOCK_SKEW_SECONDS) return false;
  if (!/^[a-f0-9]{64}$/i.test(suppliedText)) return false;
  const expected = createHmac('sha256', secret).update(`${timestampText}.`).update(rawBody).digest();
  const supplied = Buffer.from(suppliedText, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function hasMessageWritePermission(user: any) {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.mensajes?.crear === true;
}

export function hasMessageReadPermission(user: any) {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  const messageRead = user.permissions?.mensajes?.leer;
  if (typeof messageRead === 'boolean') return messageRead;
  if (typeof user.permissions?.clientes?.leer === 'boolean') return user.permissions.clientes.leer;
  if (user.role === 'accountant') return false;
  return ['receptionist', 'specialist'].includes(user.role);
}
