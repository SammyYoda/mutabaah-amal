import { hash, verify } from '@node-rs/argon2';
import { randomInt } from 'node:crypto';

// Algorithm.Argon2id === 2 (const enum in the .d.ts, so spelled out here)
const ARGON2ID = 2;

export function hashPassword(pw: string): Promise<string> {
  return hash(pw, { algorithm: ARGON2ID });
}

export async function verifyPassword(passwordHash: string, pw: string): Promise<boolean> {
  try {
    return await verify(passwordHash, pw);
  } catch {
    return false; // malformed hash
  }
}

// No O/0/I/l/1 to avoid misreading when a naqib/admin reads it out.
const TEMP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function randomTempPassword(): string {
  let out = '';
  for (let i = 0; i < 12; i++) out += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
  return out;
}

let dummyHash: Promise<string> | undefined;

/** Hash of a random password, used to equalise login timing for unknown emails. */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomTempPassword());
  return dummyHash;
}
