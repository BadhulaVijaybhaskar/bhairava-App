import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, Printer } from 'lucide-react';
import {
  Btn,
  BrandWordmark,
  DataTable,
  ErrorState,
  FilterBar,
  LinkBtn,
  LoadingState,
  PageHeader,
  Panel,
} from '@bhairava/ui-web';
import { api } from '../api';
import { Mono, Muted, StatusChip } from '../components/common';
import { DASH, display, errMsg, formatDateTime, matchesQuery, shortId, useAsyncList, withIds, type AnyRow } from '../lib/data';
import { LOGO_SRC } from '../basePath';

type Row = AnyRow & { id: string | number };

function paiseToInr(paise: string | number | null | undefined) {
  const n = Number(paise ?? 0) / 100;
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

export function ReceiptsListPage() {
  const { rows, err, loading, reload } = useAsyncList(() => api.receipts.list());
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      withIds(rows).filter(
        (r) => matchesQuery(r, query, ['receiptNumber', 'bookingId']) || matchesQuery(r.payment ?? {}, query, ['method', 'txnRef']),
      ),
    [rows, query],
  );

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Receipts"
        description="Immutable payment receipts issued by the production API. Open one to print an A4 copy."
      />
      {err ? (
        <ErrorState title="Couldn't load receipts" error={err} onRetry={reload} />
      ) : loading ? (
        <LoadingState variant="rows" />
      ) : (
        <>
          <FilterBar
            query={query}
            onQuery={setQuery}
            placeholder="Search receipts…"
            right={<span className="numeric px-2 text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>}
          />
          <div data-testid="receipts-table">
            <DataTable<Row>
              rows={filtered}
              linkTo={(r) => `/receipts/${r.id}`}
              emptyMessage={rows.length ? 'Nothing matches this search.' : 'No receipts yet.'}
              columns={[
                { key: 'number', header: 'Receipt #', cell: (r) => <span className="numeric text-sm font-medium">{display(r.receiptNumber)}</span> },
                { key: 'issued', header: 'Issued', cell: (r) => <Mono>{formatDateTime(r.issuedAt)}</Mono> },
                { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <Mono className="font-medium">{paiseToInr(r.payment?.amountPaise)}</Mono> },
                { key: 'method', header: 'Method', cell: (r) => <StatusChip value={r.payment?.method} tone="neutral" /> },
                { key: 'booking', header: 'Booking', cell: (r) => <Mono className="text-muted-foreground">{shortId(r.bookingId || r.booking?.id)}</Mono> },
              ]}
            />
          </div>
        </>
      )}
    </>
  );
}

export function ReceiptDetailPage() {
  const { receiptId } = useParams();
  const [row, setRow] = useState<AnyRow | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!receiptId) return;
    api.receipts.get(receiptId).then(setRow).catch((e) => setErr(errMsg(e)));
  }, [receiptId]);

  function printReceipt() {
    window.print();
  }

  function downloadHtml() {
    if (!row) return;
    const el = document.getElementById('receipt-print');
    if (!el) return;
    const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>${row.receiptNumber}</title>
<style>body{font-family:Segoe UI,sans-serif;padding:24px} table{width:100%;border-collapse:collapse} td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}</style>
</head><body>${el.innerHTML}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${row.receiptNumber || 'receipt'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (err) {
    return (
      <ErrorState
        className="mt-6"
        title="Receipt not available"
        error={err}
        action={<LinkBtn to="/receipts" variant="tonal"><ArrowLeft className="h-4 w-4" /> Back to receipts</LinkBtn>}
      />
    );
  }
  if (!row) return <LoadingState label="Loading receipt…" />;

  return (
    <>
      <PageHeader
        className="no-print"
        eyebrow="Receipt"
        title={`Receipt ${display(row.receiptNumber)}`}
        description="Amounts come from the immutable payment row only. Use Print → Save as PDF for an A4 copy."
        actions={
          <>
            <LinkBtn to="/receipts"><ArrowLeft className="h-4 w-4" /> Back</LinkBtn>
            <Btn variant="tonal" onClick={downloadHtml}><FileDown className="h-4 w-4" /> Download HTML</Btn>
            <Btn variant="primary" onClick={printReceipt} data-testid="receipt-print"><Printer className="h-4 w-4" /> Print</Btn>
          </>
        }
      />
      <Panel className="receipt-sheet mb-10 sm:p-10" id="receipt-print">
        <div className="receipt-head">
          <div>
            <BrandWordmark size={40} title="Bhairava Land Ventures" subtitle="Hyderabad, Telangana · RERA registered" className="receipt-brand" logoSrc={LOGO_SRC} />
          </div>
          <div className="receipt-meta text-right">
            <div className="k">Receipt No</div>
            <div className="v numeric">{display(row.receiptNumber)}</div>
            <Muted>{row.issuedAt ? new Date(row.issuedAt).toLocaleString('en-IN') : ''}</Muted>
          </div>
        </div>
        <div className="receipt-grid">
          <div>
            <div className="k">Received from</div>
            <div className="v">{display(row.customer?.name)}</div>
            <div className="text-sm text-muted-foreground">{row.customer?.phone}</div>
            <div className="text-sm text-muted-foreground">{row.customer?.email}</div>
          </div>
          <div>
            <div className="k">Plot / Project</div>
            <div className="v">{display(row.plot?.number)}</div>
            <div className="text-sm text-muted-foreground">{row.project?.name}</div>
            <div className="text-sm text-muted-foreground">Booking {row.booking?.id}</div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              <th className="py-2.5 pr-3">Description</th>
              <th className="py-2.5 pr-3">Mode</th>
              <th className="py-2.5 pr-3">Reference</th>
              <th className="py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-outline-variant/40">
              <td className="py-3 pr-3">Instalment towards {row.project?.name || 'booking'}</td>
              <td className="py-3 pr-3">{row.payment?.method || DASH}</td>
              <td className="numeric py-3 pr-3">{row.payment?.txnRef || DASH}</td>
              <td className="numeric py-3 text-right font-semibold">{paiseToInr(row.payment?.amountPaise)}</td>
            </tr>
          </tbody>
        </table>
        <div className="receipt-foot">
          <div>Payment date: {row.payment?.paidAt ? new Date(row.payment.paidAt).toLocaleDateString('en-IN') : DASH}</div>
          <div>Generated by: {row.generatedBy?.displayName || row.generatedBy?.email || 'system'}</div>
          <div className="text-muted-foreground">
            This receipt is generated from immutable payment data. Soft-voided payments are excluded from new issues.
          </div>
        </div>
      </Panel>
    </>
  );
}
