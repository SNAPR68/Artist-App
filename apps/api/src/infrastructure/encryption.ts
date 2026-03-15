import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY = Buffer.from(config.PII_ENCRYPTION_KEY, 'utf-8').subarray(0, 32);

/**
 * Encrypt a PII field using AES-256-GCM
 * Returns: base64(iv + ciphertext + authTag)
 */
export function encryptPII(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

/**
 * Decrypt a PII field encrypted with encryptPII
 */
export function decryptPII(ciphertext: string): string {
  const data = Buffer.from(ciphertext, 'base64');

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, KEY, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final('utf-8');
}

/**
 * Create HMAC hash for searchable encrypted fields
 * Used for phone_hash and email_hash columns
 */
export function hashForSearch(value: string): string {
  return createHmac('sha256', KEY).update(value.toLowerCase().trim()).digest('hex');
}
