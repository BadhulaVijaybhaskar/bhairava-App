import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  canonicalPlotStatusFill,
  canonicalPlotStatusInk,
  canonicalPlotStatusSolid,
} from '../../domain/src/plot-status-colors';
import {
  PLOT_STATUS_KEYS,
  brand,
  chart,
  cssVar,
  gradients,
  palette,
  plotStatusFill,
  plotStatusInk,
  plotStatusSolid,
  surfaces,
} from './index';

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('.dark'));

function rootVar(name: string): string | undefined {
  const match = new RegExp(`\\s${name}:\\s*([^;]+);`).exec(rootBlock);
  return match?.[1]?.trim();
}

test('logo-extracted brand blues/gold — no green identity', () => {
  assert.deepEqual(surfaces, {
    base: '#F2F6FA',
    section: '#EBF1F7',
    card: '#E1EAF4',
    selected: '#D1E0EE',
    white: '#FFFFFF',
  });
  assert.equal(brand.primary, '#0250A1');
  assert.equal(brand.primaryDark, '#002C68');
  assert.equal(brand.primaryLight, '#90C8F8');
  assert.equal(brand.accent, '#F0B038');
  assert.equal(brand.accentSoft, '#FCF2DF');
  assert.equal(brand.surface, '#F2F6FA');
  assert.equal(brand.selected, '#D1E0EE');
  assert.equal(brand.foreground, '#001F49');
  assert.equal(brand.luminous, brand.primaryLight);
  assert.equal(palette.primaryForeground, '#FFFFFF');
  assert.equal(palette.secondary, '#3F5061');
  assert.equal(palette.gold, brand.accent);
  assert.equal(palette.success, '#00884B');
  // Brand lock: no legacy green identity hues
  const brandBlob = [
    brand.primary,
    brand.primaryDark,
    brand.primaryLight,
    brand.accent,
    brand.accentSoft,
    brand.surface,
    brand.selected,
    brand.foreground,
    ...Object.values(surfaces),
    palette.secondary,
    palette.gold,
    ...Object.values(chart),
  ].join(' ');
  assert.ok(!/#(?:006D32|00D166|BAECCA|E8F0EB|F4F7F5|C8DCD0|DCE8E0|3D5A4A|0F1F17)/i.test(brandBlob));
});

test('tokens.css matches TS surfaces, brand vars, and palette', () => {
  assert.equal(rootVar('--brand-primary'), brand.primary);
  assert.equal(rootVar('--brand-primary-dark'), brand.primaryDark);
  assert.equal(rootVar('--brand-primary-light'), brand.primaryLight);
  assert.equal(rootVar('--brand-accent'), brand.accent);
  assert.equal(rootVar('--brand-accent-soft'), brand.accentSoft);
  assert.equal(rootVar('--brand-surface'), brand.surface);
  assert.equal(rootVar('--brand-selected'), brand.selected);
  assert.equal(rootVar('--brand-foreground'), brand.foreground);

  assert.equal(rootVar('--surface'), 'var(--brand-surface)');
  assert.equal(rootVar('--surface-lowest'), surfaces.white);
  assert.equal(rootVar('--surface-low'), surfaces.section);
  assert.equal(rootVar('--surface-c'), surfaces.card);
  assert.equal(rootVar('--surface-high'), 'var(--brand-selected)');
  assert.equal(rootVar('--surface-highest'), 'var(--brand-selected)');
  assert.equal(rootVar('--primary'), 'var(--brand-primary)');
  assert.equal(rootVar('--primary-luminous'), 'var(--brand-primary-light)');
  assert.equal(rootVar('--secondary'), palette.secondary);
  assert.equal(rootVar('--gold'), 'var(--brand-accent)');
  assert.equal(rootVar('--success'), palette.success);
  assert.equal(rootVar('--destructive'), palette.destructive);
  assert.equal(rootVar('--foreground'), 'var(--brand-foreground)');
  assert.equal(rootVar('--muted-foreground'), palette.mutedForeground);
  assert.equal(rootVar('--chart-1'), chart[1]);
  assert.equal(rootVar('--chart-4'), chart[4]);
  assert.ok(gradients.gold.includes(brand.accent));
});

test('plot status colors mirror @bhairava/domain and tokens.css', () => {
  assert.deepEqual(plotStatusSolid, canonicalPlotStatusSolid);
  assert.deepEqual(plotStatusFill, canonicalPlotStatusFill);
  assert.deepEqual(plotStatusInk, canonicalPlotStatusInk);
  for (const status of PLOT_STATUS_KEYS) {
    assert.equal(rootVar(cssVar.plotStatus(status)), plotStatusSolid[status], status);
    assert.equal(rootVar(cssVar.plotStatus(status, 'fill')), plotStatusFill[status], status);
    assert.equal(rootVar(cssVar.plotStatus(status, 'ink')), plotStatusInk[status], status);
  }
  // AVAILABLE remains functional green; brand chrome does not
  assert.equal(plotStatusSolid.AVAILABLE, '#4CAF7D');
});
