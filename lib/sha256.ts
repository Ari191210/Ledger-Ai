// ═══════════════════════════════════════════════════════════════════════════
// SHA-256, pure, dependency-free, identical in every runtime.
//
// M7 needs a cryptographic digest in three places that do not share a runtime:
//
//   · `lib/event-outbox.ts` derives `client_event_id` in the BROWSER, before
//     the first network attempt (T7). `node:crypto` is not there.
//   · `lib/audit.ts` chains `AuditEntry` hashes on the SERVER (O.6).
//   · `tests/academic-events.test.mjs` must be able to prove both, in Node,
//     against the same bytes.
//
// `crypto.subtle.digest` exists in all three but is asynchronous, and an
// identifier that a client must compute BEFORE it persists a pending event is
// far easier to reason about — and to prove — when it is a synchronous pure
// function of its input. `node:crypto`'s `createHash` is synchronous but is not
// available in the browser bundle.
//
// So: one implementation, ~70 lines, no imports, no platform branch. The
// alternative — two implementations that must agree — is exactly the class of
// drift the rest of this milestone exists to prevent.
//
// WHY NOT `lib/ingest/hash.ts`. That module's own header says it plainly:
// *"FNV-1a … Not cryptographic, and deliberately so: this identifies inputs, it
// does not protect them."* The audit chain's entire purpose is to make tampering
// detectable, which is a protection claim, so it needs a hash an attacker cannot
// invert or collide. `stableStringify` from that module IS reused — canonical
// JSON is the part that transfers.
//
// No imports. No clock. No network.
// ═══════════════════════════════════════════════════════════════════════════

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 of a byte array, as 32 bytes. */
export function sha256Bytes(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8;
  // message + 0x80 + zero padding + 8-byte big-endian length, to a 64-byte multiple
  const padded = new Uint8Array(((input.length + 9 + 63) >> 6) << 6);
  padded.set(input);
  padded[input.length] = 0x80;

  // Length is written as a 64-bit big-endian value. JavaScript numbers are
  // exact to 2^53, which is far beyond any payload this system accepts, so the
  // high word is derived by division rather than by BigInt.
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i += 1) outView.setUint32(i * 4, H[i], false);
  return out;
}

const HEX = "0123456789abcdef";

export function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) {
    s += HEX[bytes[i] >> 4] + HEX[bytes[i] & 15];
  }
  return s;
}

/** SHA-256 of a UTF-8 string, as 64 lowercase hex characters. */
export function sha256Hex(text: string): string {
  return toHex(sha256Bytes(new TextEncoder().encode(text)));
}
