import {
  linkPolygonToPlot,
  normalizePolygon,
  LAYOUT_VIEWBOX,
  validatePolygon,
} from '@bhairava/domain';

describe('layout polygon uniqueness', () => {
  it('viewBox is 0-100 space', () => {
    expect(LAYOUT_VIEWBOX).toBe('0 0 100 100');
  });

  it('rejects second active mapping without replaceExisting', () => {
    const linked = linkPolygonToPlot({
      plot: { id: 'p1', number: 'A-01', polygonJson: [[0, 0], [1, 0], [1, 1]] },
      points: [[2, 2], [3, 2], [3, 3]],
    });
    expect(linked.ok).toBe(false);
  });

  it('allows replaceExisting to swap polygon on same plot', () => {
    const replace = linkPolygonToPlot({
      plot: { id: 'p1', number: 'A-01', polygonJson: [[0, 0], [1, 0], [1, 1]] },
      points: [[2, 2], [3, 2], [3, 3]],
      replaceExisting: true,
    });
    expect(replace.ok).toBe(true);
  });

  it('validates normalized polygons', () => {
    expect(validatePolygon([[10, 10], [20, 10], [20, 20]]).ok).toBe(true);
    const n = normalizePolygon([[0, 0], [50, 0], [50, 50], [0, 50]]);
    expect(n).not.toBeNull();
    expect(n!.length).toBeGreaterThanOrEqual(3);
  });
});
