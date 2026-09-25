/**
 * Plot status colors — canonical 9 (Portfolio OS).
 * No HOLD; administrative unavailability uses BLOCKED.
 */
import {
  type CanonicalPlotStatus,
  toCanonicalPlotStatus,
  PLOT_STATUS_LABEL,
} from './plot-status';

export const canonicalPlotStatusSolid: Record<CanonicalPlotStatus, string> = {
  AVAILABLE: '#4CAF7D',
  RESERVED: '#F2B84B',
  BOOKED: '#3B82F6',
  UNDER_DOCUMENTATION: '#0EA5E9',
  SOLD: '#6366F1',
  REGISTERED: '#7657D5',
  RESALE_AVAILABLE: '#D85C8A',
  BLOCKED: '#94A3B8',
  CANCELLED: '#EF4444',
};

export const canonicalPlotStatusFill: Record<CanonicalPlotStatus, string> = {
  AVAILABLE: '#BFE5D1',
  RESERVED: '#F6D89A',
  BOOKED: '#A9D2FF',
  UNDER_DOCUMENTATION: '#BAE6FD',
  SOLD: '#C7D2FE',
  REGISTERED: '#C4B5F4',
  RESALE_AVAILABLE: '#F0B6CB',
  BLOCKED: '#E2E8F0',
  CANCELLED: '#FECACA',
};

export const canonicalPlotStatusInk: Record<CanonicalPlotStatus, string> = {
  AVAILABLE: '#2E7A52',
  RESERVED: '#8A6414',
  BOOKED: '#1D4ED8',
  UNDER_DOCUMENTATION: '#0369A1',
  SOLD: '#4338CA',
  REGISTERED: '#4F3AA8',
  RESALE_AVAILABLE: '#9A3A62',
  BLOCKED: '#475569',
  CANCELLED: '#B91C1C',
};

export const canonicalPlotStatusLabel = PLOT_STATUS_LABEL;

export function fillForPlotStatus(raw: unknown): string {
  return canonicalPlotStatusFill[toCanonicalPlotStatus(raw)];
}
export function labelForPlotStatus(raw: unknown): string {
  return canonicalPlotStatusLabel[toCanonicalPlotStatus(raw)];
}
export function solidForPlotStatus(raw: unknown): string {
  return canonicalPlotStatusSolid[toCanonicalPlotStatus(raw)];
}
export function inkForPlotStatus(raw: unknown): string {
  return canonicalPlotStatusInk[toCanonicalPlotStatus(raw)];
}
