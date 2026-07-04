/**
 * CNCA Admin Panel — hybrid data engine control surface.
 * Password-gated (admin key stored locally). Tabs: Leagues, Clubs, Image
 * Import, Rankings. Utilitarian internal-tool styling, not the public brand.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { admin, getKey, setKey, clearKey, type AdminLeague, type AdminClub, type OcrPreview, type OcrRow, type DashboardData, type ReviewItem, type BackupRow, type AuditRow, type SettingRow, type ParsedUrl, type WorkflowRun, type EngineInfo } from '../lib/admin'

const C = { bg: '#0b0e17', panel: '#141926', line: '#232b3d', text: '#e8ecf5', mute: '#8a94ab', pink: '#ff2c91', gold: '#f4c14d', green: '#35c66b', red: '#ff5470' }
const box: CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }
const input: CSSProperties = { background: '#0d1220', border: `1px solid ${C.line}`, color: C.text, borderRadius: 6, padding: '7px 9px', fontSize: 13, width: '100%' }
const btn = (bg = C.pink): CSSProperties => ({ background: bg, color: bg === C.gold ? '#111' : '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' })
const th: CSSProperties = { textAlign: 'left', padding: '8px 10px', color: C.mute, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${C.line}` }
const td: CSSProperties = { padding: '8px 10px', borderBottom: `1px solid ${C.line}`, fontSize: 13 }

function useToast() {
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const show = (t: string, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 4000) }
  const node = msg && (
    <div style={{ position: 'fixed', bottom: 20, right: 20, background: msg.ok ? C.green : C.red, color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, zIndex: 100, maxWidth: 420 }}>{msg.t}</div>
  )
  return { show, node }
}

const TABS = [
  ['dashboard', 'Dashboard'], ['playhq', 'PlayHQ Import'], ['leagues', 'Leagues'], ['clubs', 'Clubs'],
  ['ocr', 'Image Import'], ['reviews', 'Pending Reviews'], ['rankings', 'Rankings'],
  ['audit', 'Audit Log'], ['backups', 'Backups'], ['settings', 'Settings'],
] as const
type Tab = typeof TABS[number][0]

export default function Admin() {
  const [authed, setAuthed] = useState(!!getKey())
  const [tab, setTab] = useState<Tab>('dashboard')
  const [pending, setPending] = useState(0)
  const t = useToast()

  useEffect(() => { if (authed) admin.listReviews('PENDING').then(r => setPending(r.length)).catch(() => {}) }, [authed, tab])

  if (!authed) return <Login onIn={() => setAuthed(true)} />

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.5 }}>CNCA <span style={{ color: C.pink }}>Admin</span></h1>
          <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => { clearKey(); setAuthed(false) }}>Sign out</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {TABS.map(([x, label]) => (
            <button key={x} onClick={() => setTab(x)} style={{ ...btn(tab === x ? C.pink : '#1b2233'), color: tab === x ? '#fff' : C.mute }}>
              {label}{x === 'reviews' && pending > 0 && <span style={{ marginLeft: 6, background: C.gold, color: '#111', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{pending}</span>}
            </button>
          ))}
        </div>
        {tab === 'dashboard' && <Dashboard toast={t.show} go={setTab} />}
        {tab === 'playhq' && <PlayHQImport toast={t.show} />}
        {tab === 'leagues' && <Leagues toast={t.show} />}
        {tab === 'clubs' && <Clubs toast={t.show} />}
        {tab === 'ocr' && <ImageImport toast={t.show} />}
        {tab === 'reviews' && <Reviews toast={t.show} />}
        {tab === 'rankings' && <Rankings toast={t.show} />}
        {tab === 'audit' && <AuditLog toast={t.show} />}
        {tab === 'backups' && <Backups toast={t.show} />}
        {tab === 'settings' && <Settings toast={t.show} />}
      </div>
      {t.node}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ toast, go }: { toast: (t: string, ok?: boolean) => void; go: (t: Tab) => void }) {
  const [d, setD] = useState<DashboardData | null>(null)
  useEffect(() => { admin.dashboard().then(setD).catch(e => toast(e.message, false)) }, [])
  if (!d) return <div style={box}>Loading…</div>
  const stat = (label: string, value: number | string, colour = C.text, onClick?: () => void) => (
    <div style={{ ...box, cursor: onClick ? 'pointer' : 'default', minWidth: 130 }} onClick={onClick}>
      <div style={{ fontSize: 28, fontWeight: 800, color: colour }}>{value}</div>
      <div style={{ color: C.mute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  )
  const fmt = (s?: string | null) => s ? new Date(s).toLocaleString() : '—'
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {stat('Active leagues', d.counts.leaguesActive, C.text, () => go('leagues'))}
        {stat('Archived leagues', d.counts.leaguesArchived, C.mute)}
        {stat('Clubs', d.counts.clubs, C.text, () => go('clubs'))}
        {stat('Teams', d.counts.teams)}
        {stat('Pending reviews', d.counts.pendingReviews, d.counts.pendingReviews ? C.gold : C.green, () => go('reviews'))}
        {stat('Image sources', d.counts.ocrImports)}
        {stat('Warnings', d.warnings, d.warnings ? C.red : C.green)}
      </div>
      <div style={box}>
        <b>Status</b>
        <div style={{ color: C.mute, fontSize: 13, marginTop: 8, display: 'grid', gap: 4 }}>
          <div>Last ranking run: <span style={{ color: C.text }}>{d.lastRun ? `${d.lastRun.weekLabel} · ${d.lastRun.clubCount} clubs · ${fmt(d.lastRun.completedAt)}` : '—'}</span></div>
          <div>Last scrape: <span style={{ color: C.text }}>{d.lastScrape ? `${d.lastScrape.sourceType} · ${fmt(d.lastScrape.lastScrapedAt)}` : '—'}</span></div>
        </div>
      </div>
      {d.flaggedLeagues.length > 0 && (
        <div style={box}>
          <b style={{ color: C.gold }}>⚠ Flagged leagues ({d.flaggedLeagues.length})</b>
          <div style={{ marginTop: 8 }}>
            {d.flaggedLeagues.map(l => (
              <div key={l.id} style={{ fontSize: 13, padding: '4px 0', borderBottom: `1px solid ${C.line}` }}>
                {l.name} — {l.syncError ? <span style={{ color: C.red }}>{l.syncError}</span> : <span style={{ color: C.gold }}>strength review (conf {l.strengthConfidence?.toFixed(2)})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={box}>
          <b>Recently updated leagues</b>
          <div style={{ marginTop: 8 }}>{d.recentLeagues.map(l => <div key={l.id} style={{ fontSize: 13, padding: '3px 0', color: C.mute }}>{l.name} <span style={{ float: 'right' }}>{fmt(l.lastManualUpdateAt)}</span></div>)}</div>
        </div>
        <div style={box}>
          <b>Recently updated clubs</b>
          <div style={{ marginTop: 8 }}>{d.recentClubs.map(c => <div key={c.id} style={{ fontSize: 13, padding: '3px 0', color: C.mute }}>{c.name} <span style={{ float: 'right' }}>{fmt(c.updatedAt)}</span></div>)}</div>
        </div>
      </div>
    </div>
  )
}

// ─── PlayHQ Import + Sync (Phase 1/10) — dispatched to GitHub Actions ─────────
const runColour = (r: WorkflowRun) =>
  r.status !== 'completed' ? C.gold : r.conclusion === 'success' ? C.green : C.red
const runLabel = (r: WorkflowRun) =>
  r.status !== 'completed' ? r.status.replace('_', ' ') : (r.conclusion ?? 'done')

function RunList({ runs, title }: { runs: WorkflowRun[]; title: string }) {
  return (
    <div style={box}>
      <b>{title}</b>
      {runs.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>No runs yet.</p>}
      <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
        {runs.map(r => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: `1px solid ${C.line}` }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: runColour(r), marginRight: 8 }} />{new Date(r.createdAt).toLocaleString()} <span style={{ color: C.mute }}>· {r.event}</span></span>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: runColour(r), fontWeight: 700, textTransform: 'capitalize' }}>{runLabel(r)}</span>
              <a href={r.htmlUrl} target="_blank" rel="noreferrer" style={{ color: C.pink, fontSize: 12 }}>view ↗</a>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayHQImport({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [url, setUrl] = useState('')
  const [parsed, setParsed] = useState<ParsedUrl | null>(null)
  const [busy, setBusy] = useState(false)
  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [runs, setRuns] = useState<WorkflowRun[]>([])

  const loadRuns = () => admin.engineRuns('playhq-url-import.yml').then(setRuns).catch(() => {})
  useEffect(() => { admin.engineInfo().then(setEngine).catch(() => {}); loadRuns() }, [])
  // Poll while any run is active.
  useEffect(() => {
    if (!runs.some(r => r.status !== 'completed')) return
    const t = setInterval(loadRuns, 6000)
    return () => clearInterval(t)
  }, [runs])

  const classify = async (u: string) => { setParsed(null); if (!u.trim()) return; try { setParsed(await admin.classifyUrl(u)) } catch { /* ignore preview errors */ } }
  const dispatch = async (fn: () => Promise<{ htmlUrl: string }>, msg: string) => {
    setBusy(true)
    try { const out = await fn(); toast(`${msg} — running on GitHub Actions`); setTimeout(loadRuns, 1500); return out }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const doImport = () => { if (!url.trim()) return toast('paste a PlayHQ URL', false); dispatch(() => admin.importUrl(url), 'Import dispatched') }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...box, borderColor: engine && !engine.configured ? C.red : C.line }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Execution engine — GitHub Actions</b>
          {engine && <span style={{ fontSize: 12, color: engine.configured ? C.green : C.red }}>{engine.configured ? `● connected · ${engine.repo} @ ${engine.ref}` : '● not configured'}</span>}
        </div>
        <p style={{ color: C.mute, fontSize: 12, margin: '6px 0 0' }}>PlayHQ scraping runs in a headless browser on GitHub's runners (not in the serverless API), then writes to the same database and re-ranks. Every action here dispatches a workflow and tracks it below.</p>
        {engine && !engine.configured && <p style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>Set <code>GITHUB_DISPATCH_TOKEN</code> (Actions: read &amp; write) in the API environment to enable one-click dispatch.</p>}
      </div>

      <div style={box}>
        <b>Import from PlayHQ URL</b>
        <p style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>Paste ANY PlayHQ URL — association, competition, season, grade or ladder. The workflow detects what it is, finds the A&nbsp;Grade Senior Women's ladder, imports the clubs + ladder, and re-ranks. Manual edits and overrides are never overwritten.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: 1, minWidth: 320 }} placeholder="https://www.playhq.com/netball-australia/org/…" value={url}
            onChange={e => { setUrl(e.target.value); classify(e.target.value) }} onKeyDown={e => e.key === 'Enter' && doImport()} />
          <button disabled={busy || !url.trim()} style={btn(C.green)} onClick={doImport}>{busy ? 'Dispatching…' : 'Import'}</button>
        </div>
        {parsed && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.mute }}>
            Detected: <span style={{ color: parsed.ok ? C.green : C.red, fontWeight: 700 }}>{parsed.kind}</span>
            {parsed.orgSlug && <> · org <span style={{ color: C.text }}>{parsed.orgSlug}</span></>}
            {parsed.gradeId && <> · grade <span style={{ color: C.text }}>{parsed.gradeId.slice(0, 10)}…</span></>}
            {parsed.warnings.map((w, i) => <div key={i} style={{ color: C.gold }}>⚠ {w}</div>)}
          </div>
        )}
      </div>

      <div style={{ ...box, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <b style={{ marginRight: 8 }}>Bulk</b>
        <button disabled={busy} style={btn()} onClick={() => dispatch(() => admin.syncAll(), 'Sync-all dispatched')}>↻ Sync all leagues (weekly)</button>
        <button disabled={busy} style={btn('#2a3145')} onClick={() => dispatch(() => admin.discover({}), 'Discovery dispatched')}>Discover new leagues</button>
        <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={loadRuns}>Refresh status</button>
      </div>

      <RunList runs={runs} title="Recent import / sync runs" />
    </div>
  )
}

// ─── Pending Reviews ──────────────────────────────────────────────────────────
function Reviews({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [status, setStatus] = useState('PENDING')
  const load = () => admin.listReviews(status).then(setItems).catch(e => toast(e.message, false))
  useEffect(() => { load() }, [status])
  const resolve = async (id: string, action: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED') => {
    try { await admin.resolveReview(id, action); toast(`Marked ${action}`); await load() } catch (e) { toast((e as Error).message, false) }
  }
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <b>Review queue ({items.length})</b>
        <select style={{ ...input, width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="PENDING">Pending</option><option value="ALL">All</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
        </select>
      </div>
      {items.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>Nothing to review — everything is clean. ✓</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(it => (
          <div key={it.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, background: '#0d1220' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <span style={{ background: '#1b2233', color: C.gold, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{it.kind}</span>
                <span style={{ color: C.mute, fontSize: 12, marginLeft: 8 }}>{it.entityType}{it.confidence != null ? ` · conf ${it.confidence.toFixed(2)}` : ''}</span>
                <div style={{ fontSize: 13, marginTop: 4 }}>{it.reason}</div>
              </div>
              {it.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={btn(C.green)} onClick={() => resolve(it.id, 'APPROVED')}>Approve</button>
                  <button style={btn(C.gold)} onClick={() => resolve(it.id, 'MERGED')}>Merge</button>
                  <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => resolve(it.id, 'IGNORED')}>Ignore</button>
                  <button style={btn(C.red)} onClick={() => resolve(it.id, 'REJECTED')}>Reject</button>
                </div>
              )}
              {it.status !== 'PENDING' && <span style={{ color: C.mute, fontSize: 12 }}>{it.status}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLog({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [rows, setRows] = useState<AuditRow[]>([])
  useEffect(() => { admin.listAudit().then(setRows).catch(e => toast(e.message, false)) }, [])
  return (
    <div style={box}>
      <b>Audit log ({rows.length})</b>
      <p style={{ color: C.mute, fontSize: 12, marginTop: 4 }}>Every change is recorded and never deleted.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>When</th><th style={th}>Action</th><th style={th}>Entity</th><th style={th}>Source</th><th style={th}>By</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ ...td, color: C.mute, whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleString()}</td>
                <td style={td}><span style={{ color: C.pink, fontWeight: 700 }}>{r.action}</span></td>
                <td style={td}>{r.entityType}{r.entityId ? <span style={{ color: C.mute }}> · {r.entityId.slice(0, 8)}</span> : ''}{r.reason ? <div style={{ color: C.mute, fontSize: 11 }}>{r.reason}</div> : null}</td>
                <td style={td}><span style={{ color: C.mute }}>{r.source ?? '—'}</span></td>
                <td style={{ ...td, color: C.mute }}>{r.user?.name ?? r.user?.email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Backups ──────────────────────────────────────────────────────────────────
function Backups({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [rows, setRows] = useState<BackupRow[]>([])
  const [busy, setBusy] = useState(false)
  const load = () => admin.listBackups().then(setRows).catch(e => toast(e.message, false))
  useEffect(() => { load() }, [])
  const create = async () => {
    const label = prompt('Backup label (optional)') ?? undefined
    setBusy(true)
    try { const r = await admin.createBackup(label || undefined); toast(`Backup created — ${Object.values(r.data.counts).reduce((a, b) => a + b, 0)} rows`); await load() }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const restore = async (b: BackupRow) => {
    if (!confirm(`Restore "${b.label}"? A safety snapshot of the current state is taken first. Nothing is permanently lost.`)) return
    setBusy(true)
    try { const r = await admin.restoreBackup(b.id); toast(`Restored from ${r.data.from}`); await load() }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <b>Backups &amp; restore points ({rows.length})</b>
        <button disabled={busy} style={btn(C.green)} onClick={create}>+ Create backup now</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>When</th><th style={th}>Label</th><th style={th}>Kind</th><th style={th}>Rows</th><th style={th}></th></tr></thead>
          <tbody>
            {rows.map(b => {
              const counts = (() => { try { return JSON.parse(b.counts) as Record<string, number> } catch { return {} } })()
              const total = Object.values(counts).reduce((a, c) => a + c, 0)
              return (
                <tr key={b.id}>
                  <td style={{ ...td, color: C.mute, whiteSpace: 'nowrap' }}>{new Date(b.createdAt).toLocaleString()}</td>
                  <td style={td}>{b.label}</td>
                  <td style={td}><span style={{ color: b.kind === 'PRE_RESTORE' ? C.gold : C.mute }}>{b.kind}</span></td>
                  <td style={td}>{total}</td>
                  <td style={td}><button disabled={busy} style={btn(C.gold)} onClick={() => restore(b)}>Restore</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [rows, setRows] = useState<SettingRow[]>([])
  const [key, setK] = useState(''); const [val, setV] = useState('')
  const load = () => admin.listSettings().then(setRows).catch(e => toast(e.message, false))
  useEffect(() => { load() }, [])
  const save = async (k: string, v: string) => { try { await admin.setSetting(k, v); toast('Saved'); await load() } catch (e) { toast((e as Error).message, false) } }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <b>Settings (key / value)</b>
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Key</th><th style={th}>Value</th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.key}>
                  <td style={td}>{s.key}</td>
                  <td style={td}><input style={input} defaultValue={s.value} onBlur={e => { if (e.target.value !== s.value) save(s.key, e.target.value) }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={box}>
        <b>Add / update setting</b>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input style={{ ...input, width: 220 }} placeholder="key" value={key} onChange={e => setK(e.target.value)} />
          <input style={{ ...input, width: 260 }} placeholder="value" value={val} onChange={e => setV(e.target.value)} />
          <button style={btn()} onClick={() => { if (key) { save(key, val); setK(''); setV('') } }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function Login({ onIn }: { onIn: () => void }) {
  const [k, setK] = useState('')
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>
      <div style={{ ...box, width: 340 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>CNCA <span style={{ color: C.pink }}>Admin</span></h1>
        <p style={{ color: C.mute, fontSize: 13, marginTop: 0 }}>Enter the admin key to continue.</p>
        <input style={input} type="password" placeholder="Admin key" value={k} onChange={e => setK(e.target.value)} onKeyDown={e => e.key === 'Enter' && k && (setKey(k), onIn())} />
        <button style={{ ...btn(), width: '100%', marginTop: 12 }} onClick={() => { if (k) { setKey(k); onIn() } }}>Unlock</button>
      </div>
    </div>
  )
}

// ─── Leagues ──────────────────────────────────────────────────────────────────
function Leagues({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [rows, setRows] = useState<AdminLeague[]>([])
  const [busy, setBusy] = useState(false)
  const [mergeA, setMergeA] = useState(''); const [mergeB, setMergeB] = useState('')
  const load = () => admin.listLeagues().then(setRows).catch(e => toast(e.message, false))
  useEffect(() => { load() }, [])

  const save = async (fn: () => Promise<{ note?: string }>) => {
    setBusy(true)
    try { const r = await fn(); toast(r?.note ? `Saved — ${r.note}` : 'Saved'); await load() }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <CreateLeague toast={toast} onDone={load} />
      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <b>Leagues ({rows.length})</b>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select style={{ ...input, width: 160 }} value={mergeA} onChange={e => setMergeA(e.target.value)}><option value="">merge: keep…</option>{rows.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            <select style={{ ...input, width: 160 }} value={mergeB} onChange={e => setMergeB(e.target.value)}><option value="">into…</option>{rows.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            <button disabled={busy || !mergeA || !mergeB} style={btn(C.gold)} onClick={() => save(() => admin.mergeLeagues(mergeA, mergeB))}>Merge</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>League</th><th style={th}>St</th><th style={th}>Teams</th><th style={th}>Strength</th><th style={th}>Override</th><th style={th}>Conf</th><th style={th}>Status</th><th style={th}></th></tr></thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} style={{ background: l.needsStrengthReview ? 'rgba(244,193,77,0.08)' : undefined, opacity: l.archivedAt ? 0.5 : 1 }}>
                  <td style={td}>{l.name}{l.needsStrengthReview && <span title="needs review" style={{ color: C.gold, marginLeft: 6 }}>⚠</span>}{l.archivedAt && <span style={{ color: C.mute, marginLeft: 6, fontSize: 11 }}>[archived]</span>}</td>
                  <td style={td}>{l.state?.code ?? '—'}</td>
                  <td style={td}>{l._count?.clubSeasons ?? '—'}</td>
                  <td style={td}>{Math.round(l.strengthScore)}</td>
                  <td style={td}>
                    <input style={{ ...input, width: 56 }} defaultValue={l.manualStrengthOverride ?? ''} placeholder="auto"
                      onBlur={e => { const v = e.target.value.trim(); const o = v === '' ? null : Number(v); if ((l.manualStrengthOverride ?? '') !== (o ?? '')) save(() => admin.setStrength(l.id, o)) }} />
                  </td>
                  <td style={{ ...td, color: l.strengthConfidence < 0.45 ? C.gold : C.mute }}>{l.strengthConfidence.toFixed(2)}</td>
                  <td style={td}>
                    <select style={{ ...input, width: 110 }} defaultValue={l.status} onChange={e => save(() => admin.editLeague(l.id, { status: e.target.value, enabled: e.target.value === 'ACTIVE' }))}>
                      <option>ACTIVE</option><option>DISABLED</option><option>NEEDS_REVIEW</option>
                    </select>
                  </td>
                  <td style={td}>
                    <button style={{ ...btn('#2a3145'), color: C.mute, marginRight: 6 }} onClick={() => { const n = prompt('Rename league', l.name); if (n && n !== l.name) save(() => admin.editLeague(l.id, { name: n })) }}>Edit</button>
                    <button title="Re-scrape stored PlayHQ URL on GitHub Actions" style={{ ...btn('#1b3a2a'), color: C.green, marginRight: 6 }} onClick={() => save(async () => { await admin.syncLeague(l.id); return { note: 'sync dispatched to GitHub Actions' } })}>Sync</button>
                    {l.approvalStatus === 'PENDING' && <button style={{ ...btn(C.green), marginRight: 6 }} onClick={() => save(() => admin.approveLeague(l.id))}>Approve</button>}
                    {l.archivedAt
                      ? <button style={btn(C.green)} onClick={() => save(() => admin.restoreLeague(l.id))}>Restore</button>
                      : <button style={btn(C.red)} onClick={() => { if (confirm(`Archive ${l.name}? It is recoverable — nothing is permanently deleted.`)) save(() => admin.deleteLeague(l.id)) }}>Archive</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CreateLeague({ toast, onDone }: { toast: (t: string, ok?: boolean) => void; onDone: () => void }) {
  const [f, setF] = useState<Record<string, string>>({ name: '', state: 'VIC', region: '', strength: '', website: '', facebook: '' })
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  const create = async () => {
    if (!f.name) return toast('name required', false)
    try { await admin.createLeague({ ...f, strength: f.strength ? Number(f.strength) : undefined }); toast('League created'); setF({ name: '', state: 'VIC', region: '', strength: '', website: '', facebook: '' }); onDone() }
    catch (e) { toast((e as Error).message, false) }
  }
  return (
    <details style={box}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Create manual league (not on PlayHQ)</summary>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
        <input style={input} placeholder="League name*" value={f.name} onChange={e => set('name', e.target.value)} />
        <input style={input} placeholder="State (VIC)" value={f.state} onChange={e => set('state', e.target.value)} />
        <input style={input} placeholder="Region" value={f.region} onChange={e => set('region', e.target.value)} />
        <input style={input} placeholder="Strength 0–5" value={f.strength} onChange={e => set('strength', e.target.value)} />
        <input style={input} placeholder="Website" value={f.website} onChange={e => set('website', e.target.value)} />
        <input style={input} placeholder="Facebook" value={f.facebook} onChange={e => set('facebook', e.target.value)} />
      </div>
      <button style={{ ...btn(), marginTop: 10 }} onClick={create}>Create league</button>
    </details>
  )
}

// ─── Clubs ──────────────────────────────────────────────────────────────────
function Clubs({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [leagues, setLeagues] = useState<AdminLeague[]>([])
  const [leagueId, setLeagueId] = useState('')
  const [clubs, setClubs] = useState<AdminClub[]>([])
  const load = () => admin.listClubs(leagueId || undefined).then(setClubs).catch(e => toast(e.message, false))
  useEffect(() => { admin.listLeagues().then(setLeagues).catch(() => {}) }, [])
  useEffect(() => { load() }, [leagueId])
  const save = async (fn: () => Promise<unknown>) => { try { await fn(); toast('Saved'); await load() } catch (e) { toast((e as Error).message, false) } }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={{ ...input, width: 240 }} value={leagueId} onChange={e => setLeagueId(e.target.value)}>
            <option value="">All clubs (first 500)</option>
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button style={btn()} onClick={() => { const n = prompt('New club name'); if (n) save(() => admin.createClub({ name: n, leagueId: leagueId || undefined })) }}>+ Add club</button>
        </div>
      </div>
      <div style={box}>
        <b>Clubs ({clubs.length})</b>
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Club</th><th style={th}>State</th><th style={th}>Region</th><th style={th}>Actions</th></tr></thead>
            <tbody>
              {clubs.map(c => (
                <tr key={c.id} style={{ opacity: c.archivedAt ? 0.5 : 1 }}>
                  <td style={td}>{c.name}{c.archivedAt && <span style={{ color: C.mute, marginLeft: 6, fontSize: 11 }}>[archived]</span>}</td>
                  <td style={td}>{c.state?.code ?? '—'}</td>
                  <td style={td}>{c.region ?? '—'}</td>
                  <td style={td}>
                    <button style={{ ...btn('#2a3145'), color: C.mute, marginRight: 6 }} onClick={() => { const n = prompt('Rename club', c.name); if (n && n !== c.name) save(() => admin.editClub(c.id, { name: n })) }}>Edit</button>
                    <button style={{ ...btn('#2a3145'), color: C.mute, marginRight: 6 }} onClick={() => { const to = prompt('Move to leagueId'); if (to) save(() => admin.moveClub(c.id, to)) }}>Move</button>
                    {c.archivedAt
                      ? <button style={btn(C.green)} onClick={() => save(() => admin.restoreClub(c.id))}>Restore</button>
                      : <button style={btn(C.red)} onClick={() => { if (confirm(`Archive ${c.name}? Recoverable — nothing permanently deleted.`)) save(() => admin.deleteClub(c.id)) }}>Archive</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Image Import (OCR) ───────────────────────────────────────────────────────
function ImageImport({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [leagues, setLeagues] = useState<AdminLeague[]>([])
  const [leagueId, setLeagueId] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<OcrPreview | null>(null)
  const [rows, setRows] = useState<OcrRow[]>([])
  useEffect(() => { admin.listLeagues().then(setLeagues).catch(() => {}) }, [])

  const onFile = (f: File | null) => { if (!f) return; const r = new FileReader(); r.onload = () => setImage(r.result as string); r.readAsDataURL(f) }
  const parse = async () => {
    if (!image) return toast('choose an image', false)
    setBusy(true); setPreview(null)
    try {
      const p = await admin.ocrParse(image, leagueId || undefined)
      setPreview(p); setRows(p.rows); if (p.matchedLeagueId) setLeagueId(p.matchedLeagueId)
      toast(`Detected ${p.rows.length} rows${p.uncertain ? `, ${p.uncertain} uncertain` : ''}`)
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const commit = async () => {
    if (!leagueId) return toast('select the target league', false)
    setBusy(true)
    try {
      const entries = rows.map(r => ({ team: r.match.matchedName && r.match.clubId ? r.match.matchedName : r.team, clubId: r.match.clubId, position: r.position, played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, points: r.points }))
      const res = await admin.ocrCommit(leagueId, entries)
      toast(`Imported ${res.data.teams} teams — ${res.note}`); setPreview(null); setImage(null); setRows([])
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const setCell = (i: number, k: keyof OcrRow, v: string) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: k === 'team' ? v : (v === '' ? undefined : Number(v)) } : r))
  const setMatch = (i: number, clubId: string | null, name: string | null) => setRows(rs => rs.map((r, j) => j === i ? { ...r, match: { ...r.match, clubId, matchedName: name, confident: true } } : r))

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <b>Upload ladder image</b>
        <p style={{ color: C.mute, fontSize: 13 }}>Facebook/Instagram graphic, screenshot, PNG/JPG. AI reads it, matches clubs, and shows a preview to confirm before anything changes.</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0] ?? null)} style={{ color: C.mute, fontSize: 13 }} />
          <select style={{ ...input, width: 240 }} value={leagueId} onChange={e => setLeagueId(e.target.value)}>
            <option value="">Auto-detect league</option>
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button disabled={busy || !image} style={btn()} onClick={parse}>{busy ? 'Reading…' : 'Parse image'}</button>
        </div>
        {image && <img src={image} alt="ladder" style={{ maxHeight: 220, marginTop: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />}
      </div>

      {preview && (
        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <b>Preview — {preview.detectedLeague ?? 'league not detected'} · {rows.length} rows{preview.uncertain ? ` · ${preview.uncertain} to check` : ''}</b>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={{ ...input, width: 220 }} value={leagueId} onChange={e => setLeagueId(e.target.value)}>
                <option value="">Select target league…</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button disabled={busy || !leagueId} style={btn(C.green)} onClick={commit}>Confirm &amp; import</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['#', 'Team (from image)', 'Matched club', 'P', 'W', 'L', 'D', 'F', 'A', 'Pts'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: r.match.confident ? undefined : 'rgba(244,193,77,0.10)' }}>
                    <td style={td}>{r.position ?? i + 1}</td>
                    <td style={td}><input style={{ ...input, width: 150 }} value={r.team} onChange={e => setCell(i, 'team', e.target.value)} /></td>
                    <td style={td}>
                      {r.match.clubId
                        ? <span>{r.match.matchedName} <span style={{ color: r.match.confident ? C.green : C.gold }}>({r.match.score})</span> <button style={{ ...btn('#2a3145'), color: C.mute, padding: '2px 6px', fontSize: 11 }} onClick={() => setMatch(i, null, null)}>new</button></span>
                        : <span style={{ color: C.pink }}>+ create “{r.team}”</span>}
                    </td>
                    {(['played', 'wins', 'losses', 'draws', 'goalsFor', 'goalsAgainst', 'points'] as (keyof OcrRow)[]).map(k => (
                      <td key={k} style={td}><input style={{ ...input, width: 44 }} value={(r[k] as number | undefined) ?? ''} onChange={e => setCell(i, k, e.target.value)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rankings ──────────────────────────────────────────────────────────────
function Rankings({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<Awaited<ReturnType<typeof admin.recalculate>> | null>(null)
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast(ok) } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  const recalc = async () => {
    setBusy(true)
    try { const r = await admin.recalculate(); setReport(r); toast(`Recalculated — ${r.clubsRanked} clubs, ${r.leagues.length} leagues`) }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...box, display: 'grid', gap: 12 }}>
        <b>National rankings</b>
        <p style={{ color: C.mute, fontSize: 13, margin: 0 }}>Recalculate rebuilds every league's multi-factor strength from its clubs' national ratings (manual overrides always win), then re-ranks. Lock to freeze the published standings.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button disabled={busy} style={btn(C.green)} onClick={recalc}>{busy ? 'Working…' : '↻ Recalculate national rankings'}</button>
          <button disabled={busy} style={btn()} onClick={() => run(() => admin.rerank().then(r => toast(`Re-ranked ${r.data.clubsRanked} clubs`)), 'done')}>Re-rank only</button>
          <button disabled={busy} style={btn(C.gold)} onClick={() => run(admin.lock, 'Rankings locked')}>Lock</button>
          <button disabled={busy} style={btn('#2a3145')} onClick={() => run(admin.unlock, 'Rankings unlocked')}>Unlock</button>
        </div>
      </div>
      {report && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={box}>
            <b>League strength (top 20)</b>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12 }}>
              <thead><tr><th style={th}>League</th><th style={th}>Before</th><th style={th}>After</th><th style={th}>Conf</th></tr></thead>
              <tbody>{report.leagues.slice(0, 20).map((l, i) => (
                <tr key={i} style={{ background: l.review ? 'rgba(244,193,77,0.08)' : undefined }}>
                  <td style={td}>{l.name}{l.review && <span style={{ color: C.gold }}> ⚠</span>}</td>
                  <td style={td}>{l.before}</td><td style={td}>{l.after}</td><td style={{ ...td, color: l.conf < 0.45 ? C.gold : C.mute }}>{l.conf.toFixed(2)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={box}>
            <b>Top 25 nationally</b>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12 }}>
              <thead><tr><th style={th}>#</th><th style={th}>Club</th><th style={th}>League</th><th style={th}>Rating</th></tr></thead>
              <tbody>{report.top.map(t => (
                <tr key={t.rank}><td style={td}>{t.rank}</td><td style={td}>{t.clubName}</td><td style={{ ...td, color: C.mute }}>{t.leagueName ?? '—'}</td><td style={td}>{t.powerRating.toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
