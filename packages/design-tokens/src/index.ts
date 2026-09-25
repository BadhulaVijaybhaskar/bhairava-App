/** Shared design tokens — web + mobile consume; do not force React components into RN. */
export const colors = {
  brand: { primary: '#1B4D3E', accent: '#C4A35A', danger: '#B42318' },
  plotStatus: {
    AVAILABLE: '#16A34A',
    RESERVED: '#CA8A04',
    BOOKED: '#2563EB',
    UNDER_DOCUMENTATION: '#7C3AED',
    SOLD: '#0F766E',
    REGISTERED: '#115E59',
    RESALE_AVAILABLE: '#D97706',
    BLOCKED: '#6B7280',
    CANCELLED: '#9CA3AF',
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
