import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Hash format: "salt:hash" (both hex-encoded)
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, "hex");
    const derived  = (await scryptAsync(plain, salt, 64)) as Buffer;
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

// Call this in every admin route handler.
// Key must be sent as: Authorization: Bearer <key>
// If ADMIN_KEY is a scrypt hash (salt:hash), uses verifyPassword.
// Otherwise falls back to timing-safe plaintext comparison.
export async function checkAdminKey(req: Request): Promise<boolean> {
  const stored = process.env.ADMIN_KEY ?? "";
  if (!stored) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const submitted = authHeader.slice(7);

  if (stored.includes(":")) {
    return verifyPassword(submitted, stored);
  }

  // Plaintext fallback — timing-safe
  try {
    const a = Buffer.from(submitted);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
