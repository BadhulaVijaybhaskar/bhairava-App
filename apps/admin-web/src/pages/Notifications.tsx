import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

type AnyRow = Record<string, any>;

export function NotificationsPage() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const reload = useCallback(() => {
    setErr('');
    (api as any).notifications
      .list({ unreadOnly: tab === 'unread', take: 100 })
      .then(setRows)
      .catch((e: any) => setErr(String(e.message || e)));
  }, [tab]);

  useEffect(() => { reload(); }, [reload]);

  async function markOne(id: string) {
    setMsg('');
    try {
      await (api as any).notifications.markRead(id);
      setMsg('Marked read');
      reload();
    } catch (e: any) { setErr(String(e.message || e)); }
  }

  async function markAll() {
    setMsg('');
    try {
      const r = await (api as any).notifications.markAllRead();
      setMsg(`Marked ${r?.updated ?? 0} read`);
      reload();
    } catch (e: any) { setErr(String(e.message || e)); }
  }

  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Notifications</h1>
          <p className="muted">In-app events (payment, booking, docs, registration, resale). Email/SMS/WhatsApp/push adapters present — external credentials BLOCKED.</p>
        </div>
        <button className="btn secondary" data-testid="notifications-mark-all" onClick={() => void markAll()}>Mark all read</button>
      </div>
      <div className="tabs">
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All</button>
        <button className={tab === 'unread' ? 'active' : ''} onClick={() => setTab('unread')}>Unread ({unread})</button>
      </div>
      {err ? <p className="err">{err}</p> : null}
      {msg ? <p className="ok">{msg}</p> : null}
      <div className="card">
        {rows.map((n) => {
          const href = (n.payloadJson && (n.payloadJson as AnyRow).href) || null;
          const kind = (n.payloadJson && (n.payloadJson as AnyRow).kind) || n.channel;
          return (
            <div key={n.id} className={'notif-row' + (n.readAt ? '' : ' unread')} data-testid="notif-row">
              <div>
                <div className="v">{n.title}</div>
                <div className="muted">{n.body}</div>
                <div className="muted"><span className="chip">{String(kind)}</span> · {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}</div>
              </div>
              <div className="row" style={{ flex: '0 0 auto', minWidth: 0 }}>
                {href ? <Link className="btn ghost" to={String(href)}>Open</Link> : null}
                {!n.readAt ? <button className="btn secondary" onClick={() => void markOne(n.id)}>Mark read</button> : <span className="chip ok">Read</span>}
              </div>
            </div>
          );
        })}
        {!rows.length && !err ? <p className="muted">No notifications.</p> : null}
      </div>
    </div>
  );
}
