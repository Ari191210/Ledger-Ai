/**
 * Stable hashing for pipeline determinism.
 *
 * A stage's input hash decides whether it must run at all. Two structurally
 * identical inputs MUST hash identically regardless of key order, or
 * idempotency silently breaks — so stringification sorts keys recursively
 * rather than trusting insertion order.
 *
 * FNV-1a over UTF-8, 128 bits as four 32-bit lanes. Not cryptographic, and
 * deliberately so: this identifies inputs, it does not protect them.
 */

/** Deterministic JSON: object keys sorted, arrays order-preserving. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/** 32 hex characters. Deterministic across runtimes and process restarts. */
export function stableHash(value: unknown): string {
  const text = typeof value === 'string' ? value : stableStringify(value);
  const bytes = new TextEncoder().encode(text);

  // Four independently seeded FNV-1a lanes, widened to 128 bits of output.
  const seeds = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
  const lanes = seeds.slice();

  for (let lane = 0; lane < 4; lane += 1) {
    let h = lanes[lane] >>> 0;
    for (let i = 0; i < bytes.length; i += 1) {
      h ^= bytes[(i + lane) % bytes.length] ^ bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    // Final avalanche so short inputs still spread.
    h ^= h >>> 15;
    h = Math.imul(h, 0x2545f491) >>> 0;
    h ^= h >>> 13;
    lanes[lane] = h >>> 0;
  }

  return lanes.map(l => l.toString(16).padStart(8, '0')).join('');
}
