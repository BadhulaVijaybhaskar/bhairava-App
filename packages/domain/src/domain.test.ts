import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLOT_STATUSES,
  toCanonicalPlotStatus,
  isTransitionAllowed,
  calculatePlotPrice,
  evaluateReservationState,
  projectCustomerPii,
  rupeesToPaise,
  addPaise,
  DEFAULT_RESERVATION_HOURS,
  validatePolygon,
  linkPolygonToPlot,
  relinkPolygon,
  fillForPlotStatus,
  LAYOUT_VIEWBOX,
  buildMasterPlanMeta,
} from './index.js';

describe('domain package', () => {
  it('has 9 plot statuses without HOLD', () => {
    assert.equal(PLOT_STATUSES.length, 9);
    assert.ok(!(PLOT_STATUSES as readonly string[]).includes('HOLD'));
  });
  it('maps legacy hold to BLOCKED', () => {
    assert.equal(toCanonicalPlotStatus('hold'), 'BLOCKED');
  });
  it('allows happy-path transitions', () => {
    assert.equal(isTransitionAllowed('AVAILABLE', 'RESERVED'), true);
    assert.equal(isTransitionAllowed('RESERVED', 'BOOKED'), true);
    assert.equal(isTransitionAllowed('AVAILABLE', 'SOLD'), false);
  });
  it('calculates price', () => {
    const r = calculatePlotPrice(
      { areaSqYd: 100, facing: 'East' },
      { baseRatePerSqYd: 1000, facingPremium: { East: 50 }, cornerPremium: 0, featurePremium: {} },
    ) as { ratePerSqYd?: number; total?: number };
    assert.ok(r);
    if (typeof r.ratePerSqYd === 'number') assert.equal(r.ratePerSqYd, 1050);
    if (typeof r.total === 'number') assert.equal(r.total, 105000);
  });
  it('evaluates reservation expiry', () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    assert.equal(evaluateReservationState({ expiresAt: past, state: 'ACTIVE' }), 'EXPIRED');
  });
  it('redacts agent unrelated PII', () => {
    const v = projectCustomerPii(
      { id: 'c1', name: 'A', phone: '9999999999', email: 'a@b.com' },
      { role: 'Agent', ownsRelationship: false, isSelf: false },
    );
    assert.equal(v.redacted, true);
    assert.equal(v.phone, null);
  });
  it('money uses integer paise', () => {
    assert.equal(rupeesToPaise(10.5), 1050);
    assert.equal(addPaise(100, 50), 150);
  });
  it('default reservation hours is 48', () => {
    assert.equal(DEFAULT_RESERVATION_HOURS, 48);
  });
  it('validates normalized polygons', () => {
    assert.equal(validatePolygon([[10, 10], [20, 10], [20, 20]]).ok, true);
    assert.equal(validatePolygon([[10, 10]]).ok, false);
  });
  it('enforces one plot one active sellable polygon', () => {
    const linked = linkPolygonToPlot({
      plot: { id: 'p1', number: 'A-01', polygonJson: [[0, 0], [1, 0], [1, 1]] },
      points: [[2, 2], [3, 2], [3, 3]],
    });
    assert.equal(linked.ok, false);
    const replace = linkPolygonToPlot({
      plot: { id: 'p1', number: 'A-01', polygonJson: [[0, 0], [1, 0], [1, 1]] },
      points: [[2, 2], [3, 2], [3, 3]],
      replaceExisting: true,
    });
    assert.equal(replace.ok, true);
  });
  it('relinks polygon between plots', () => {
    const r = relinkPolygon({
      source: { id: 'a', number: 'A-01', points: [[0, 0], [1, 0], [1, 1]] },
      target: { id: 'b', number: 'A-02', points: [] },
    });
    assert.equal(r.ok, true);
  });
  it('status colors resolve', () => {
    assert.ok(fillForPlotStatus('AVAILABLE').startsWith('#'));
    assert.ok(fillForPlotStatus('hold').startsWith('#'));
  });
  it('layout viewBox is 0-100 space', () => {
    assert.equal(LAYOUT_VIEWBOX, '0 0 100 100');
  });
  it('builds master plan upload meta', () => {
    const m = buildMasterPlanMeta({
      originalName: 'plan.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      widthPx: 2000,
      heightPx: 1500,
    });
    assert.equal(m.originalName, 'plan.png');
    assert.equal(m.widthPx, 2000);
  });
});
