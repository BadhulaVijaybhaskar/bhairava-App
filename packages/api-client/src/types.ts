/** Privacy-safe response DTOs — never include panEncrypted/aadhaarEncrypted. */

export type PublicUser = {
  id: string;
  organizationId: string;
  email: string | null;
  displayName: string;
  roleCode: string;
  status: string;
};

export type AuthSession = {
  user: PublicUser;
  accessToken: string;
  refreshToken?: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  location: string | null;
  lifecycleStatus: string;
  agentVisible: boolean;
  customerListed: boolean;
  resaleAvailable: boolean;
  coverImageKey: string | null;
  _count?: { plots: number };
};

export type PlotSummary = {
  id: string;
  projectId: string;
  number: string;
  status: string;
  areaSqYd: string | number;
  totalPrice: string | number | null;
  facing: string | null;
  polygonJson: unknown;
  layoutId: string | null;
};

export type CustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  redacted?: boolean;
};

export type LeadSummary = {
  id: string;
  projectId: string;
  name: string;
  phone: string | null;
  stage: string;
  source: string | null;
};

export type VisitSummary = {
  id: string;
  projectId: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
};

export type ReservationSummary = {
  id: string;
  plotId: string;
  customerId: string;
  state: string;
  expiresAt: string;
};

export type BookingSummary = {
  id: string;
  plotId: string;
  customerId: string;
  state: string;
  agreementValuePaise: string;
};

export type PaymentSummary = {
  id: string;
  bookingId: string;
  amountPaise: string;
  paidAt: string;
  method: string;
  voidedAt: string | null;
};

export type DocumentSummary = {
  id: string;
  title: string;
  visibility: string;
  docType: string | null;
  createdAt: string;
};

export type LayoutSummary = {
  id: string;
  projectId: string;
  name: string;
  imageKey: string | null;
  widthPx: number | null;
  heightPx: number | null;
  metaJson: unknown;
};
