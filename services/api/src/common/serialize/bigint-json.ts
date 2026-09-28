/**
 * Prisma returns JavaScript bigint for BigInt columns. JSON.stringify throws
 * "Do not know how to serialize a BigInt" — convert to decimal strings so
 * money/size/count values keep full precision beyond Number.MAX_SAFE_INTEGER.
 */
export function serializeBigInts<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString() as unknown as T;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item) => serializeBigInts(item)) as unknown as T;
  }
  // Leave non-plain objects (StreamableFile, Error, class instances) untouched
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = serializeBigInts(nested);
  }
  return out as T;
}

/** Safe JSON.stringify that never throws on bigint (for tests / logging). */
export function jsonStringifySafe(value: unknown, space?: number): string {
  return JSON.stringify(serializeBigInts(value), null, space);
}
