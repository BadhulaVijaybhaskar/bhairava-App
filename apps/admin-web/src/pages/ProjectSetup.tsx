import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

type AnyRow = Record<string, any>;

export function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const [bundle, setBundle] = useState<AnyRow | null>(null);
  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const reload = useCallback(() => {
    if (!projectId) return;
    (api.projects as any).setup(projectId).then(setBundle).catch((e: any) => setErr(String(e.message || e)));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const project = bundle?.project as AnyRow | undefined;

  async function saveSetup(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !project) return;
    setMsg(''); setErr('');
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await (api.projects as any).update(projectId, {
        name: fd.get('name'),
        city: fd.get('city'),
        state: fd.get('state'),
        location: fd.get('location'),
        address: fd.get('address'),
        description: fd.get('description'),
        reraNumber: fd.get('reraNumber'),
        projectType: fd.get('projectType'),
        pincode: fd.get('pincode'),
        lifecycleStatus: fd.get('lifecycleStatus'),
      });
      setMsg('Setup saved (DRAFT workspace — no forced full config on create)');
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }

  async function saveVisibility(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await (api.projects as any).update(projectId, {
        agentVisible: fd.get('agentVisible') === 'on',
        customerListed: fd.get('customerListed') === 'on',
        resaleAvailable: fd.get('resaleAvailable') === 'on',
        lifecycleStatus: fd.get('lifecycleStatus'),
      });
      setMsg('Visibility / publishing saved');
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }

  async function addPlotType(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await (api.projects as any).addPlotType(projectId, {
        name: fd.get('name'),
        code: fd.get('code') || undefined,
        areaSqYd: String(fd.get('areaSqYd') || '0'),
        category: fd.get('category') || undefined,
      });
      (e.target as HTMLFormElement).reset();
      setMsg('Plot type added');
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }

  async function savePricing(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await (api.projects as any).upsertPricing(projectId, {
        baseRatePerSqYd: String(fd.get('baseRatePerSqYd') || '0'),
        rulesJson: { facingPremiumPct: Number(fd.get('facingPremiumPct') || 0), cornerPremiumPct: Number(fd.get('cornerPremiumPct') || 0) },
      });
      setMsg('Pricing saved');
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }

  async function addAmenity(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await (api.projects as any).addAmenity(projectId, {
        name: fd.get('name'),
        groupName: fd.get('groupName') || undefined,
        description: fd.get('description') || undefined,
        status: fd.get('status') || 'PLANNED',
      });
      (e.target as HTMLFormElement).reset();
      setMsg('Amenity added');
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }


  async function addPhase(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await (api.projects as any).addPhase(projectId, {
        name: fd.get('name'),
        status: fd.get('status') || 'Planned',
        startDate: fd.get('startDate') || undefined,
        endDate: fd.get('endDate') || undefined,
      });
      (e.target as HTMLFormElement).reset();
      setMsg('Phase added');
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }

  async function addBlock(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await (api.projects as any).addBlock(projectId, {
        name: fd.get('name'),
        phaseId: fd.get('phaseId') || undefined,
      });
      (e.target as HTMLFormElement).reset();
      setMsg('Block added');
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }

  async function uploadMedia(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.target as HTMLFormElement);
    const fileInput = (e.target as HTMLFormElement).elements.namedItem('file') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    try {
      const kind = String(fd.get('kind') || 'gallery');
      const meta = await (api.projects as any).mediaUpload(projectId, {
        kind,
        originalName: file?.name || 'upload.bin',
        mimeType: file?.type || 'application/octet-stream',
        sizeBytes: file?.size || 0,
        label: fd.get('label') || undefined,
      });
      const url = meta?.upload?.uploadUrl;
      if (url && file) {
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      }
      setMsg('Media uploaded via presigned URL (' + kind + ')');
      (e.target as HTMLFormElement).reset();
      reload();
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }

  const tabs = ['overview', 'setup', 'phases', 'blocks', 'plot-types', 'pricing', 'amenities', 'media', 'visibility', 'layout', 'sales'];

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>{project?.name || 'Project workspace'}</h1>
          <p className="muted">{project?.code} · {project?.city} · <span className="chip">{project?.lifecycleStatus}</span></p>
        </div>
        <Link className="btn ghost" to="/projects">Back</Link>
      </div>
      {err ? <p className="err">{err}</p> : null}
      {msg ? <p className="ok">{msg}</p> : null}
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <p>Create basic project saves as <strong>DRAFT</strong>, then complete setup here — plot types, pricing, amenities, visibility, layout mapping.</p>
          <p className="muted">Plots: {(bundle as any)?._count?.plots ?? 'see Plots'} · Layouts: {(bundle?.layouts as AnyRow[] | undefined)?.length ?? 0}</p>
          <p><Link to={`/projects/${projectId}/plots`}>Open plot inventory →</Link> · <Link to="/layouts">Interactive layout editor →</Link></p>
        </div>
      )}

      {tab === 'setup' && project && (
        <form className="card" onSubmit={saveSetup}>
          <h2>Basic setup</h2>
          <div className="row">
            <div><label>Name</label><input name="name" defaultValue={project.name || ''} /></div>
            <div><label>City</label><input name="city" defaultValue={project.city || ''} /></div>
            <div><label>State</label><input name="state" defaultValue={project.state || ''} /></div>
            <div><label>Pincode</label><input name="pincode" defaultValue={project.pincode || ''} /></div>
            <div><label>Location</label><input name="location" defaultValue={project.location || ''} /></div>
            <div><label>Address</label><input name="address" defaultValue={project.address || ''} /></div>
            <div><label>RERA</label><input name="reraNumber" defaultValue={project.reraNumber || ''} /></div>
            <div><label>Type</label><input name="projectType" defaultValue={project.projectType || 'Plotted development'} /></div>
            <div><label>Lifecycle</label>
              <select name="lifecycleStatus" defaultValue={project.lifecycleStatus || 'DRAFT'}>
                {['DRAFT','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 100%' }}><label>Description</label><textarea name="description" rows={3} defaultValue={project.description || ''} /></div>
          </div>
          <button className="btn" type="submit">Save setup</button>
        </form>
      )}

      {tab === 'plot-types' && (
        <div className="card">
          <h2>Plot types</h2>
          <form className="row" onSubmit={addPlotType}>
            <div><label>Name</label><input name="name" required /></div>
            <div><label>Code</label><input name="code" /></div>
            <div><label>Area (sq yd)</label><input name="areaSqYd" required defaultValue="200" /></div>
            <div><label>Category</label><input name="category" /></div>
            <button className="btn" type="submit">Add</button>
          </form>
          <table>
            <thead><tr><th>Name</th><th>Code</th><th>Area</th><th>Category</th><th /></tr></thead>
            <tbody>
              {((bundle?.plotTypes as AnyRow[]) || []).map((pt) => (
                <tr key={pt.id}>
                  <td>{pt.name}</td><td>{pt.code}</td><td>{pt.areaSqYd}</td><td>{pt.category}</td>
                  <td><button type="button" className="btn ghost" onClick={() => void (api.projects as any).removePlotType(projectId, pt.id).then(reload)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pricing' && (
        <form className="card" onSubmit={savePricing}>
          <h2>Pricing rules</h2>
          <div className="row">
            <div><label>Base rate / sq yd</label><input name="baseRatePerSqYd" required defaultValue={(bundle?.pricingRules as AnyRow)?.baseRatePerSqYd || '25000'} /></div>
            <div><label>Facing premium %</label><input name="facingPremiumPct" defaultValue={String(((bundle?.pricingRules as AnyRow)?.rulesJson as AnyRow)?.facingPremiumPct ?? 5)} /></div>
            <div><label>Corner premium %</label><input name="cornerPremiumPct" defaultValue={String(((bundle?.pricingRules as AnyRow)?.rulesJson as AnyRow)?.cornerPremiumPct ?? 10)} /></div>
          </div>
          <button className="btn" type="submit">Save pricing</button>
        </form>
      )}

      {tab === 'amenities' && (
        <div className="card">
          <h2>Amenities</h2>
          <form className="row" onSubmit={addAmenity}>
            <div><label>Name</label><input name="name" required /></div>
            <div><label>Group</label><input name="groupName" placeholder="Lifestyle / Infra" /></div>
            <div><label>Status</label>
              <select name="status"><option>PLANNED</option><option>IN_PROGRESS</option><option>COMPLETED</option></select>
            </div>
            <div style={{ flex: '1 1 100%' }}><label>Description</label><input name="description" /></div>
            <button className="btn" type="submit">Add amenity</button>
          </form>
          <table>
            <thead><tr><th>Name</th><th>Group</th><th>Status</th><th /></tr></thead>
            <tbody>
              {((bundle?.amenities as AnyRow[]) || []).map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td><td>{a.groupName}</td><td><span className="chip">{a.status}</span></td>
                  <td><button type="button" className="btn ghost" onClick={() => void (api.projects as any).removeAmenity(projectId, a.id).then(reload)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'visibility' && project && (
        <form className="card" onSubmit={saveVisibility}>
          <h2>Visibility / publishing</h2>
          <div className="row">
            <div><label><input type="checkbox" name="agentVisible" defaultChecked={!!project.agentVisible} /> Agent visible</label></div>
            <div><label><input type="checkbox" name="customerListed" defaultChecked={!!project.customerListed} /> Customer listed</label></div>
            <div><label><input type="checkbox" name="resaleAvailable" defaultChecked={!!project.resaleAvailable} /> Resale available</label></div>
            <div><label>Lifecycle</label>
              <select name="lifecycleStatus" defaultValue={project.lifecycleStatus || 'DRAFT'}>
                {['DRAFT','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" type="submit">Publish settings</button>
        </form>
      )}


      {tab === 'phases' && (
        <div className="card">
          <h2>Phases</h2>
          <form className="row" onSubmit={addPhase}>
            <div><label>Name</label><input name="name" required placeholder="Phase 1" /></div>
            <div><label>Status</label><select name="status"><option>Planned</option><option>Active</option><option>Completed</option></select></div>
            <div><label>Start</label><input type="date" name="startDate" /></div>
            <div><label>End</label><input type="date" name="endDate" /></div>
            <button className="btn" type="submit">Add phase</button>
          </form>
          <table>
            <thead><tr><th>Name</th><th>Status</th><th>Order</th><th>Start</th><th>End</th><th /></tr></thead>
            <tbody>
              {((bundle?.phases as AnyRow[]) || []).map((ph) => (
                <tr key={ph.id}>
                  <td>{ph.name}</td><td><span className="chip">{ph.status}</span></td><td>{ph.sortOrder}</td>
                  <td>{ph.startDate ? String(ph.startDate).slice(0,10) : '—'}</td>
                  <td>{ph.endDate ? String(ph.endDate).slice(0,10) : '—'}</td>
                  <td><button type="button" className="btn ghost" onClick={() => void (api.projects as any).removePhase(projectId, ph.id).then(reload)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'blocks' && (
        <div className="card">
          <h2>Blocks</h2>
          <form className="row" onSubmit={addBlock}>
            <div><label>Name</label><input name="name" required placeholder="Block A" /></div>
            <div><label>Phase</label>
              <select name="phaseId">
                <option value="">— none —</option>
                {((bundle?.phases as AnyRow[]) || []).map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
            </div>
            <button className="btn" type="submit">Add block</button>
          </form>
          <table>
            <thead><tr><th>Name</th><th>Phase</th><th>Order</th><th /></tr></thead>
            <tbody>
              {((bundle?.blocks as AnyRow[]) || []).map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{((bundle?.phases as AnyRow[]) || []).find((ph) => ph.id === b.phaseId)?.name || '—'}</td>
                  <td>{b.sortOrder}</td>
                  <td><button type="button" className="btn ghost" onClick={() => void (api.projects as any).removeBlock(projectId, b.id).then(reload)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'media' && (
        <div className="card">
          <h2>Media</h2>
          <p className="muted">Cover, brochure, gallery via MinIO presigned upload. Master-plan layouts also under Layouts.</p>
          <form className="row" onSubmit={uploadMedia}>
            <div><label>Kind</label>
              <select name="kind"><option value="cover">Cover</option><option value="brochure">Brochure</option><option value="gallery">Gallery</option></select>
            </div>
            <div><label>Label</label><input name="label" placeholder="Optional label" /></div>
            <div><label>File</label><input name="file" type="file" required /></div>
            <button className="btn" type="submit">Upload</button>
          </form>
          <p className="muted">Cover key: {project?.coverImageKey || '—'} · Brochure: {project?.brochureKey || '—'}</p>
          <h3>Gallery</h3>
          <ul>
            {(Array.isArray((project?.settingsJson as AnyRow)?.gallery) ? ((project?.settingsJson as AnyRow).gallery as AnyRow[]) : []).map((g, i) => (
              <li key={i}>{String(g.label || g.key)} · {String(g.mimeType || '')}</li>
            ))}
          </ul>
          <h3>Layouts (master plans)</h3>
          <ul>
            {((bundle?.layouts as AnyRow[]) || []).map((l) => <li key={l.id}>{l.name} · {l.imageKey || 'no image'}</li>)}
          </ul>
          <p><Link to="/layouts">Open interactive layout editor →</Link></p>
        </div>
      )}

      {tab === 'layout' && (
        <div className="card">
          <p>Master plan upload + interactive polygon mapping live at <Link to="/layouts">Layouts</Link>.</p>
          <ul>
            {((bundle?.layouts as AnyRow[]) || []).map((l) => <li key={l.id}>{l.name} ({l.widthPx}×{l.heightPx})</li>)}
          </ul>
        </div>
      )}

      {tab === 'sales' && (
        <div className="card">
          <p><Link to="/leads">Leads</Link> · <Link to="/conversion">Conversion chain</Link> · <Link to={`/projects/${projectId}/plots`}>Plots</Link></p>
        </div>
      )}
    </div>
  );
}
