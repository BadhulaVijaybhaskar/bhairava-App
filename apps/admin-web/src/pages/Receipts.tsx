import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

type AnyRow = Record<string, any>;

function paiseToInr(paise: string | number | null | undefined) {
  const n = Number(paise ?? 0) / 100;
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

export function ReceiptsListPage() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    (api as any).receipts.list().then(setRows).catch((e: any) => setErr(String(e.message || e)));
  }, []);
  return (
    <div>
      <div className="topbar"><h1>Receipts</h1><span className="muted">Immutable payment receipts from live API</span></div>
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <table data-testid="receipts-table">
          <thead>
            <tr>
              <th>Receipt #</th><th>Issued</th><th>Amount</th><th>Method</th><th>Booking</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.receiptNumber}</td>
                <td>{r.issuedAt ? new Date(r.issuedAt).toLocaleString('en-IN') : '—'}</td>
                <td>{paiseToInr(r.payment?.amountPaise)}</td>
                <td>{r.payment?.method || '—'}</td>
                <td>{r.bookingId || r.booking?.id || '—'}</td>
                <td><Link to={`/receipts/${r.id}`}>Open / Print</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !err ? <p className="muted">No receipts yet.</p> : null}
      </div>
    </div>
  );
}

export function ReceiptDetailPage() {
  const { receiptId } = useParams();
  const nav = useNavigate();
  const [row, setRow] = useState<AnyRow | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!receiptId) return;
    (api as any).receipts.get(receiptId).then(setRow).catch((e: any) => setErr(String(e.message || e)));
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

  if (err) return <div><p className="err">{err}</p><button className="btn ghost" onClick={() => nav('/receipts')}>Back</button></div>;
  if (!row) return <div className="muted">Loading receipt…</div>;

  return (
    <div>
      <div className="topbar no-print">
        <div>
          <h1>Receipt {row.receiptNumber}</h1>
          <p className="muted">Amounts from immutable payment row only</p>
        </div>
        <div className="row" style={{ flex: '0 0 auto', minWidth: 0 }}>
          <button className="btn" onClick={printReceipt} data-testid="receipt-print">Print</button>
          <button className="btn secondary" onClick={downloadHtml}>Download HTML</button>
          <span className="muted no-print">Tip: use browser Print → Save as PDF (A4).</span>
          <Link className="btn ghost" to="/receipts">Back</Link>
        </div>
      </div>
      <div className="card receipt-sheet" id="receipt-print">
        <div className="receipt-head">
          <div>
            <div className="receipt-brand">Bhairava Land Ventures</div>
            <div className="muted">Hyderabad, Telangana · RERA registered</div>
          </div>
          <div className="receipt-meta">
            <div className="k">Receipt No</div>
            <div className="v">{row.receiptNumber}</div>
            <div className="muted">{row.issuedAt ? new Date(row.issuedAt).toLocaleString('en-IN') : ''}</div>
          </div>
        </div>
        <div className="receipt-grid">
          <div>
            <div className="k">Received from</div>
            <div className="v">{row.customer?.name || '—'}</div>
            <div className="muted">{row.customer?.phone}</div>
            <div className="muted">{row.customer?.email}</div>
          </div>
          <div>
            <div className="k">Plot / Project</div>
            <div className="v">{row.plot?.number || '—'}</div>
            <div className="muted">{row.project?.name}</div>
            <div className="muted">Booking {row.booking?.id}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Description</th><th>Mode</th><th>Reference</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Instalment towards {row.project?.name || 'booking'}</td>
              <td>{row.payment?.method || '—'}</td>
              <td>{row.payment?.txnRef || '—'}</td>
              <td style={{ textAlign: 'right' }}>{paiseToInr(row.payment?.amountPaise)}</td>
            </tr>
          </tbody>
        </table>
        <div className="receipt-foot">
          <div>Payment date: {row.payment?.paidAt ? new Date(row.payment.paidAt).toLocaleDateString('en-IN') : '—'}</div>
          <div>Generated by: {row.generatedBy?.displayName || row.generatedBy?.email || 'system'}</div>
          <div className="muted">This receipt is generated from immutable payment data. Soft-voided payments are excluded from new issues.</div>
        </div>
      </div>
    </div>
  );
}
