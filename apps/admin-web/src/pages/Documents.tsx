import { useMemo, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Btn, DataTable, ErrorState, FilterBar, LoadingState, PageHeader, SectionTitle } from '@bhairava/ui-web';
import { api } from '../api';
import { Mono, Muted, Notice, StatusChip } from '../components/common';
import { display, errMsg, formatDate, humanize, matchesQuery, useAsyncList, withIds, type AnyRow } from '../lib/data';

type Row = AnyRow & { id: string | number };

export function DocumentsPage({ projectId }: { projectId?: string }) {
  const { rows, err, loading, reload } = useAsyncList(
    () => api.documents.list(projectId ? { projectId } : undefined) as Promise<AnyRow[]>,
    [projectId],
  );
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('All');
  const [query, setQuery] = useState('');

  async function createDoc() {
    setMsg(null);
    setBusy(true);
    try {
      const created = await api.documents.create({
        title: 'Admin upload ' + new Date().toISOString(),
        visibility: 'INTERNAL',
        originalName: 'note.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 16,
        projectId,
      });
      const url = (created as AnyRow)?.upload?.uploadUrl;
      if (url) {
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: '%PDF-1.4 admin' });
      }
      setMsg({ tone: 'ok', text: 'Uploaded via presigned URL' });
      reload();
    } catch (e) {
      setMsg({ tone: 'err', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    setMsg(null);
    try {
      const res = await api.documents.download(id);
      const url = (res as AnyRow)?.download?.downloadUrl;
      if (url) window.open(url, '_blank');
    } catch (e) {
      setMsg({ tone: 'err', text: errMsg(e) });
    }
  }

  const views = useMemo(() => {
    const set = new Set<string>();
    for (const d of rows) if (d.visibility) set.add(humanize(d.visibility));
    return set.size > 1 ? ['All', ...Array.from(set).sort()] : undefined;
  }, [rows]);

  const filtered = useMemo(
    () =>
      withIds(rows).filter(
        (d) => (view === 'All' || humanize(d.visibility) === view) && matchesQuery(d, query, ['title', 'docType', 'visibility']),
      ),
    [rows, view, query],
  );

  const uploadButton = (
    <Btn variant="primary" onClick={() => void createDoc()} disabled={busy}>
      <Upload className="h-4 w-4" /> {busy ? 'Uploading…' : 'Create + upload test PDF'}
    </Btn>
  );

  return (
    <>
      {projectId ? (
        <SectionTitle aside={uploadButton}>Documents</SectionTitle>
      ) : (
        <PageHeader
          eyebrow="Operations"
          title="Documents"
          description="Agreements, KYC and project files stored in object storage via presigned URLs."
          actions={uploadButton}
        />
      )}
      {msg ? <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice> : null}
      {err ? (
        <ErrorState title="Couldn't load documents" error={err} onRetry={reload} />
      ) : loading ? (
        <LoadingState variant="rows" />
      ) : (
        <>
          <FilterBar
            views={views}
            active={view}
            onSelect={setView}
            query={query}
            onQuery={setQuery}
            placeholder="Search documents…"
            right={<span className="numeric px-2 text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>}
          />
          <DataTable<Row>
            rows={filtered}
            emptyMessage={rows.length ? 'Nothing matches these filters.' : 'No documents yet.'}
            columns={[
              { key: 'title', header: 'Title', cell: (d) => <span className="text-sm font-medium">{display(d.title)}</span> },
              { key: 'type', header: 'Type', cell: (d) => <Muted>{display(d.docType)}</Muted> },
              { key: 'visibility', header: 'Visibility', cell: (d) => <StatusChip value={d.visibility} /> },
              { key: 'version', header: 'Version', align: 'right', cell: (d) => <Mono>{display(d.version)}</Mono> },
              { key: 'created', header: 'Created', cell: (d) => <Mono>{formatDate(d.createdAt)}</Mono> },
              {
                key: 'download',
                header: '',
                align: 'right',
                cell: (d) => (
                  <Btn className="min-h-9 px-3 text-xs" onClick={() => void download(String(d.id))}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Btn>
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
