import crypto from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt — no extra dependency to
 * install (matches the JWT approach in ./auth.ts). Stored format is
 * `scrypt$<saltHex>$<hashHex>` so the salt travels with the hash and we can
 * verify without any external state.
 */

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}
