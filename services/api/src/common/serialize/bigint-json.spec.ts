import { jsonStringifySafe, serializeBigInts } from './bigint-json';

describe('serializeBigInts', () => {
  it('converts top-level bigint to string', () => {
    expect(serializeBigInts(9007199254740993n)).toBe('9007199254740993');
  });

  it('recursively converts nested bigint fields (documents list shape)', () => {
    const payload = [
      {
        id: 'doc1',
        title: 'Agreement',
        sizeBytes: 1048576n,
        version: 1,
        nested: { amountPaise: 240000000n, nullish: null as null },
      },
      {
        id: 'doc2',
        title: 'Empty',
        sizeBytes: null as null,
        version: 2,
      },
    ];
    const out = serializeBigInts(payload) as Array<{
      id: string;
      sizeBytes: string | null;
      nested?: { amountPaise: string; nullish: null };
    }>;
    expect(out[0]?.sizeBytes).toBe('1048576');
    expect(out[0]?.nested?.amountPaise).toBe('240000000');
    expect(out[0]?.nested?.nullish).toBeNull();
    expect(out[1]?.sizeBytes).toBeNull();
    expect(() => JSON.stringify(out)).not.toThrow();
    expect(JSON.parse(JSON.stringify(out))[0].sizeBytes).toBe('1048576');
  });

  it('preserves Date and leaves Buffer alone', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    const buf = Buffer.from('pdf');
    const out = serializeBigInts({ d, buf, n: 1n });
    expect(out.d).toBe(d);
    expect(Buffer.isBuffer(out.buf)).toBe(true);
    expect(out.n).toBe('1');
  });

  it('jsonStringifySafe never throws on bigint', () => {
    expect(jsonStringifySafe({ sizeBytes: 42n })).toBe('{"sizeBytes":"42"}');
  });

  it('handles empty list and pagination-like envelopes', () => {
    expect(serializeBigInts([])).toEqual([]);
    const page = { items: [{ sizeBytes: 1n }], total: 1n, page: 1, pageSize: 20 };
    const out = serializeBigInts(page);
    expect(out.items[0].sizeBytes).toBe('1');
    expect(out.total).toBe('1');
    expect(() => JSON.stringify(out)).not.toThrow();
  });
});
