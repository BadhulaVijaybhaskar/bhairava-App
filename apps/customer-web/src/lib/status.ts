import type { ChipTone } from '@bhairava/ui-web';

/*
 * Explicit tones for non-plot statuses. Without a tone, `Chip` paints labels
 * like "Cancelled" or "Under documentation" with plot-status colors.
 */

const BOOKING: Record<string, ChipTone> = {
  ACTIVE: 'positive',
  UNDER_DOCUMENTATION: 'info',
  COMPLETED: 'positive',
  CANCEL_REQUESTED: 'warning',
  CANCELLED: 'danger',
};

const INSTALLMENT: Record<string, ChipTone> = {
  UPCOMING: 'neutral',
  DUE: 'warning',
  PARTIALLY_PAID: 'info',
  PAID: 'positive',
  OVERDUE: 'danger',
  WAIVED: 'neutral',
};

const PROJECT: Record<string, ChipTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'positive',
  ON_HOLD: 'warning',
  COMPLETED: 'info',
  ARCHIVED: 'neutral',
};

export const bookingTone = (state: string | null | undefined): ChipTone => BOOKING[state ?? ''] ?? 'neutral';
export const installmentTone = (status: string | null | undefined): ChipTone => INSTALLMENT[status ?? ''] ?? 'neutral';
export const projectTone = (status: string | null | undefined): ChipTone => PROJECT[status ?? ''] ?? 'neutral';

/** Customer-friendly project lifecycle labels. */
export function projectStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'ACTIVE':
      return 'Now selling';
    case 'ON_HOLD':
      return 'On hold';
    case 'COMPLETED':
      return 'Completed';
    case 'DRAFT':
      return 'Coming soon';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status ? status.replace(/_/g, ' ').toLowerCase() : '—';
  }
}
