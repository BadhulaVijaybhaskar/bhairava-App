import { ArrowLeft, Printer, Receipt } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  BrandLogo,
  Btn,
  DataTable,
  EmptyState,
  LinkBtn,
  PageHeader,
  type DataTableColumn,
} from '@bhairava/ui-web';
import { api } from '../api';
import { AsyncSection } from '../components';
import { formatArea, formatDate, formatDateTime, formatPaise, paymentMethodLabel } from '../lib/format';
import type { ReceiptDetail, ReceiptListItem } from '../lib/types';
import { useApi } from '../lib/use-api';
import { LOGO_SRC } from '../basePath';

export function ReceiptsPage() {
  const state = useApi(() => api.receipts.list() as unknown as Promise<ReceiptListItem[]>);

  const columns: DataTableColumn<ReceiptListItem>[] = [
    { key: 'number', header: 'Receipt', cell: (r) => <span className="numeric font-medium">{r.receiptNumber}</span> },
    { key: 'issued', header: 'Issued on', cell: (r) => <span className="numeric">{formatDate(r.issuedAt)}</span> },
    { key: 'method', header: 'Method', cell: (r) => paymentMethodLabel(r.payment?.method) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (r) => <span className="numeric font-medium">{formatPaise(r.payment?.amountPaise)}</span>,
    },
  ];

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Payments"
        title="Receipts"
        description="Official receipts for your payments. Open any receipt to view or print it on A4."
      />
      <AsyncSection state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No receipts yet"
              description="A receipt is issued automatically each time a payment is recorded."
            />
          ) : (
            <div data-testid="receipts-table">
              <DataTable rows={rows} columns={columns} linkTo="/receipts/:id" />
            </div>
          )
        }
      </AsyncSection>
    </div>
  );
}

export function ReceiptDetailPage() {
  const { receiptId = '' } = useParams();
  const state = useApi(() => api.receipts.get(receiptId) as unknown as Promise<ReceiptDetail>, [receiptId]);

  return (
    <div className="space-y-6 pt-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <LinkBtn to="/receipts" className="-ml-3">
          <ArrowLeft className="h-4 w-4" /> All receipts
        </LinkBtn>
        {state.data ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">Tip: choose “Save as PDF” in the print dialog.</span>
            <Btn variant="primary" onClick={() => window.print()} data-testid="receipt-print">
              <Printer className="h-4 w-4" /> Print receipt
            </Btn>
          </div>
        ) : null}
      </div>

      <AsyncSection state={state} loading="spinner" errorTitle="We couldn’t open this receipt">
        {(row) => (
          <article className="receipt-sheet" id="receipt-print">
            <header className="receipt-head">
              <div className="flex items-center gap-3">
                <BrandLogo size={48} logoSrc={LOGO_SRC} />
                <div>
                  <p className="receipt-brand">Bhairava Land Ventures</p>
                  <p className="text-xs text-muted-foreground">Hyderabad, Telangana · RERA registered</p>
                </div>
              </div>
              <div className="receipt-meta text-right">
                <p className="k">Receipt no</p>
                <p className="v numeric">{row.receiptNumber}</p>
                <p className="numeric text-xs text-muted-foreground">{formatDateTime(row.issuedAt)}</p>
              </div>
            </header>

            <div className="receipt-grid">
              <div>
                <p className="k">Received from</p>
                <p className="v">{row.customer?.name || '—'}</p>
                {row.customer?.phone ? <p className="text-xs text-muted-foreground">{row.customer.phone}</p> : null}
                {row.customer?.email ? <p className="text-xs text-muted-foreground">{row.customer.email}</p> : null}
              </div>
              <div>
                <p className="k">Plot / Project</p>
                <p className="v numeric">{row.plot?.number ? `Plot ${row.plot.number}` : '—'}</p>
                {row.project?.name ? <p className="text-xs text-muted-foreground">{row.project.name}</p> : null}
                {row.plot?.areaSqYd ? <p className="numeric text-xs text-muted-foreground">{formatArea(row.plot.areaSqYd)}</p> : null}
              </div>
            </div>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Instalment towards {row.project?.name || 'booking'}</td>
                  <td>{paymentMethodLabel(row.payment?.method)}</td>
                  <td className="numeric">{row.payment?.txnRef || '—'}</td>
                  <td className="numeric text-right font-medium">{formatPaise(row.payment?.amountPaise)}</td>
                </tr>
              </tbody>
            </table>

            <div className="receipt-total">
              <div className="min-w-0">
                <p className="k">Amount in words</p>
                <p className="pt-1 text-sm text-muted-foreground italic">{row.amountInWords || '—'}</p>
              </div>
              <div className="text-right">
                <p className="k">Total received</p>
                <p className="numeric pt-1 text-2xl font-semibold">{formatPaise(row.payment?.amountPaise)}</p>
              </div>
            </div>

            <footer className="receipt-foot">
              <div>
                <p>Payment date: <span className="numeric">{formatDate(row.payment?.paidAt)}</span></p>
                <p>Issued by: {row.generatedBy?.displayName || 'Bhairava accounts'}</p>
                <p className="text-muted-foreground">This receipt is generated from the recorded payment and cannot be edited.</p>
              </div>
              <div className="receipt-sign">
                <span className="ghost-line block h-px w-40" />
                <p className="pt-2 text-xs text-muted-foreground">Authorised signatory</p>
              </div>
            </footer>
          </article>
        )}
      </AsyncSection>
    </div>
  );
}
