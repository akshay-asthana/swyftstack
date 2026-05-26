// Secret encryption helper — AES-256-GCM. Used for app env vars, DB passwords,
// storage secret keys, and node tokens. Never store these in plaintext.
import crypto from "node:crypto";
import { env } from "./env.js";

const ALGO = "aes-256-gcm";
const DEV_KEY_LABEL = "swyftstack-insecure-dev-key";
const LEGACY_DEV_KEY_LABEL = ["quick", "dock-insecure-dev-key"].join("");

function devKey(label: string): Buffer {
  return crypto.createHash("sha256").update(label).digest();
}

function getKey(label = DEV_KEY_LABEL): Buffer {
  const raw = env.SECRET_ENCRYPTION_KEY;
  if (!raw) {
    // Dev fallback: deterministic key so the app boots without config.
    // Production MUST set SECRET_ENCRYPTION_KEY (32-byte base64).
    return devKey(label);
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes (base64).");
  }
  return key;
}

function decryptWithKey(payload: string, key: Buffer): string {
  const [version, ivB64, tagB64, ctB64] = payload.split(":");
  if (version !== "v1") throw new Error(`Unsupported secret payload version: ${version}`);
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Encrypts plaintext -> "v1:<iv b64>:<tag b64>:<ciphertext b64>". */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/** Reverses encryptSecret(). Throws if the payload is tampered. */
export function decryptSecret(payload: string): string {
  try {
    return decryptWithKey(payload, getKey());
  } catch (err) {
    if (env.SECRET_ENCRYPTION_KEY) throw err;
    return decryptWithKey(payload, getKey(LEGACY_DEV_KEY_LABEL));
  }
}

/** One-way hash for tokens/passwords we only ever need to compare. */
export function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomSecret(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Password hashing using scrypt (no native deps). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt") return false;
  const derived = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}
