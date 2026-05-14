import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { config } from '../config';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(): string {
  const prefix = config.auth.apiKeyPrefix;
  return `${prefix}_${nanoid()}`;
}

export function generateApiSecret(): string {
  const prefix = config.auth.apiSecretPrefix;
  return `${prefix}_${nanoid()}`;
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

export function getApiKeyPrefix(key: string): string {
  const prefixLength = config.auth.apiKeyPrefix.length + 1;
  return key.substring(0, prefixLength);
}