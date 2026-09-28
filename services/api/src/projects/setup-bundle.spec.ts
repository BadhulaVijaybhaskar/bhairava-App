/** Pure-shape guards mirroring ProjectsService.setupBundle / get null hardening. */

function normalizeSetupBundle(project: Record<string, unknown> | null | undefined) {
  const p = project ?? {};
  return {
    project: {
      id: p.id ?? '',
      name: (p.name as string) ?? '',
      code: (p.code as string) ?? '',
      city: p.city ?? null,
      state: p.state ?? null,
      location: p.location ?? null,
      address: p.address ?? null,
      description: p.description ?? null,
      reraNumber: p.reraNumber ?? null,
      projectType: p.projectType ?? null,
      pincode: p.pincode ?? null,
      lifecycleStatus: p.lifecycleStatus ?? null,
      agentVisible: Boolean(p.agentVisible),
      customerListed: Boolean(p.customerListed),
      resaleAvailable: Boolean(p.resaleAvailable),
      settingsJson: p.settingsJson ?? {},
    },
    plotTypes: Array.isArray(p.plotTypes) ? p.plotTypes : [],
    pricingRules: p.pricingRules ?? null,
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    phases: Array.isArray(p.phases) ? p.phases : [],
    blocks: Array.isArray(p.blocks) ? p.blocks : [],
    layouts: Array.isArray(p.layouts) ? p.layouts : [],
  };
}

describe('setupBundle null hardening', () => {
  it('returns stable empty arrays/objects when relations are null/undefined', () => {
    const out = normalizeSetupBundle({
      id: 'p1',
      name: 'Demo',
      code: 'DEMO',
      plotTypes: null as unknown as undefined,
      pricingRules: undefined,
      amenities: undefined,
      phases: null as unknown as undefined,
      blocks: undefined,
      layouts: undefined,
      settingsJson: undefined,
    });
    expect(out.plotTypes).toEqual([]);
    expect(out.amenities).toEqual([]);
    expect(out.phases).toEqual([]);
    expect(out.blocks).toEqual([]);
    expect(out.layouts).toEqual([]);
    expect(out.pricingRules).toBeNull();
    expect(out.project.settingsJson).toEqual({});
    expect(out.project.name).toBe('Demo');
  });

  it('preserves arrays when present', () => {
    const out = normalizeSetupBundle({
      id: 'p1',
      name: 'X',
      code: 'X',
      plotTypes: [{ id: 't1' }],
      amenities: [{ id: 'a1' }],
      phases: [{ id: 'ph1' }],
      blocks: [{ id: 'b1' }],
      layouts: [{ id: 'l1' }],
      pricingRules: { baseRatePerSqYd: '100' },
    });
    expect(out.plotTypes).toHaveLength(1);
    expect(out.layouts[0]).toEqual({ id: 'l1' });
    expect(out.pricingRules).toEqual({ baseRatePerSqYd: '100' });
  });

  it('tolerates fully missing project shell', () => {
    const out = normalizeSetupBundle(undefined);
    expect(out.project.id).toBe('');
    expect(out.plotTypes).toEqual([]);
    expect(Array.isArray(out.layouts)).toBe(true);
  });
});
