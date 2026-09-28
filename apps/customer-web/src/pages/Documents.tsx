import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { Btn, Chip, DataTable, EmptyState, PageHeader, type DataTableColumn } from '@bhairava/ui-web';
import { api } from '../api';
import { AsyncSection } from '../components';
import { errorMessage, formatDate, humanize } from '../lib/format';
import type { CustomerDocument } from '../lib/types';
import { useApi } from '../lib/use-api';

export function DocumentsPage() {
  const state = useApi(() => api.documents.list() as Promise<CustomerDocument[]>);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');

  async function openDocument(doc: CustomerDocument) {
    setBusyId(doc.id);
    setDownloadError('');
    try {
      const res = await api.documents.download(doc.id);
      window.open(res.download.downloadUrl, '_blank', 'noopener');
    } catch (e) {
      setDownloadError(errorMessage(e) || 'Download failed');
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<CustomerDocument>[] = [
    {
      key: 'title',
      header: 'Document',
      cell: (d) => (
        <span className="flex min-w-0 items-center gap-3">
          <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-low text-primary md:grid">
            <FileText className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <span className="truncate font-medium">{d.title}</span>
        </span>
      ),
    },
    { key: 'type', header: 'Type', cell: (d) => (d.docType ? <Chip tone="neutral">{humanize(d.docType)}</Chip> : '—') },
    { key: 'version', header: 'Version', cell: (d) => <span className="numeric">{d.version != null ? `v${d.version}` : '—'}</span> },
    { key: 'added', header: 'Added on', cell: (d) => <span className="numeric">{formatDate(d.createdAt)}</span> },
    {
      key: 'open',
      header: '',
      align: 'right',
      cell: (d) => (
        <Btn variant="tonal" onClick={() => void openDocument(d)} disabled={busyId === d.id}>
          <Download className="h-4 w-4" /> {busyId === d.id ? 'Opening…' : 'Open'}
        </Btn>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Account"
        title="My documents"
        description="Agreements, allotment letters and other papers the Bhairava team has shared with you."
      />
      {downloadError ? (
        <p role="alert" className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {downloadError}
        </p>
      ) : null}
      <AsyncSection state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents shared yet"
              description="When your agreement or other papers are ready, they’ll be available here to open and download."
            />
          ) : (
            <DataTable rows={rows} columns={columns} />
          )
        }
      </AsyncSection>
    </div>
  );
}
