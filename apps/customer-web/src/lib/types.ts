import type {
  BookingSummary,
  DocumentSummary,
  PaymentSummary,
  PlotSummary,
  ProjectSummary,
} from '@bhairava/api-client';

/**
 * Customer-facing views of the ownership-scoped API responses. The server
 * returns a few more fields than the shared summary types declare; these
 * describe only what the customer screens read.
 */

export type CustomerProject = ProjectSummary & { description?: string | null };

export type CustomerPlot = PlotSummary;

export type CustomerBooking = BookingSummary & {
  projectId?: string;
  bookedAt?: string | null;
  advancePaise?: string | null;
  cancelRequestStatus?: string | null;
  plot?: { id: string; number: string; status: string } | null;
  responsibleAgent?: { id: string; code: string; name: string } | null;
};

export type CustomerPayment = PaymentSummary & {
  txnRef?: string | null;
  receiptNumber?: string | null;
};

export type ScheduleItem = {
  id: string;
  bookingId: string;
  installmentNumber?: number | null;
  name: string;
  dueDate: string;
  amountDuePaise: string;
  status: string;
};

export type ReceiptListItem = {
  id: string;
  receiptNumber: string;
  issuedAt: string | null;
  bookingId?: string | null;
  payment?: { id: string; amountPaise: string; method: string; paidAt: string | null; txnRef?: string | null } | null;
  booking?: { id: string; plotId: string; projectId: string } | null;
};

export type ReceiptDetail = {
  id: string;
  receiptNumber: string;
  issuedAt: string | null;
  amountInWords?: string | null;
  payment?: { id: string; amountPaise: string; method: string; paidAt: string | null; txnRef?: string | null } | null;
  booking?: { id: string; state: string } | null;
  customer?: { id: string; name: string; phone?: string | null; email?: string | null; city?: string | null } | null;
  plot?: { id: string; number: string; status: string; areaSqYd?: string | null } | null;
  project?: { id: string; name: string; code?: string | null; city?: string | null } | null;
  generatedBy?: { id: string; displayName: string | null; email: string | null } | null;
};

export type CustomerDocument = DocumentSummary & {
  version?: number | null;
  mimeType?: string | null;
  sizeBytes?: string | null;
};

export type CustomerNotification = {
  id: string;
  channel?: string | null;
  title: string;
  body?: string | null;
  readAt: string | null;
  createdAt: string;
};
