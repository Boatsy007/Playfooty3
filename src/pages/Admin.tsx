/**
 * PlayFooty Admin Panel — hybrid data engine control surface.
 * Password-gated (admin key stored locally). Tabs: Leagues, Clubs, Image
 * Import, Rankings. Utilitarian internal-tool styling, not the public brand.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { admin, getKey, setKey, clearKey, type AdminLeague, type AdminClub, type OcrPreview, type OcrRow, type DashboardData, type ReviewItem, type BackupRow, type AuditRow, type SettingRow, type ParsedUrl, type WorkflowRun, type EngineInfo, type CsvEntity, type CsvPreview, type OcrHistoryRow, type OcrHistoryDetail, type ArticleRow, type ArticleFull } from '../lib/admin'

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
  ['dashboard', 'Dashboard'], ['playhq', 'PlayHQ Import'], ['csv', 'CSV Import'], ['leagues', 'Leagues'], ['clubs', 'Clubs'],
  ['ocr', 'Image Import'], ['publishing', 'AI Publishing'], ['reviews', 'Pending Reviews'], ['rankings', 'Rankings'],
  ['audit', 'Audit Log'], ['backups', 'Backups'], ['settings', 'Settings'],
] as const
type Tab = typeof TABS[number][0]

export default function Admin() {
  const [authed, setAuthed] = useState(!!getKey())
  const [tab, setTab] = useState<Tab>('dashboard')
  const [pending, setPending] = useState(0)
  const t = useToast()

  useEffect(() => { if (authed) admin.listReviews('PENDING').then(r => setPending(r.data.length)).catch(() => {}) }, [authed, tab])

  if (!authed) return <Login onIn={() => setAuthed(true)} />

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.5 }}>PlayFooty <span style={{ color: C.pink }}>Admin</span></h1>
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
        {tab === 'csv' && <CsvImport toast={t.show} />}
        {tab === 'leagues' && <Leagues toast={t.show} />}
        {tab === 'clubs' && <Clubs toast={t.show} />}
        {tab === 'ocr' && <ImageImport toast={t.show} />}
        {tab === 'publishing' && <Publishing toast={t.show} />}
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

// ─── CSV Import (Phase 4) — validate → preview → commit ──────────────────────
const CSV_TEMPLATES: Record<CsvEntity, string> = {
  leagues:  'League,State,Region,Strength,Website,Facebook',
  clubs:    'Name,State,Town,League,Logo,Website',
  teams:    'Club,League,Season,Grade',
  ladders:  'League,Team,Position,Played,Wins,Losses,Draws,GoalsFor,GoalsAgainst,Percentage,Points,Season,Grade',
  mappings: 'Alias,Canonical,Source',
  rankings: 'Club,BestRank',
}
const CSV_ENTITIES: CsvEntity[] = ['leagues', 'clubs', 'teams', 'ladders', 'mappings', 'rankings']

function CsvImport({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [entity, setEntity] = useState<CsvEntity>('ladders')
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = (f: File | null) => { if (!f) return; const r = new FileReader(); r.onload = () => setCsv(r.result as string); r.readAsText(f) }
  const doPreview = async () => {
    if (!csv.trim()) return toast('paste or upload CSV', false)
    setBusy(true); setPreview(null)
    try { const p = await admin.csvPreview(entity, csv); setPreview(p); toast(`${p.okCount} ok · ${p.warnCount} warn · ${p.errorCount} error`) }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const doCommit = async () => {
    if (!preview) return
    if (preview.errorCount && !confirm(`${preview.errorCount} error row(s) will be skipped. Import the ${preview.okCount + preview.warnCount} valid row(s)?`)) return
    setBusy(true)
    try { const r = await admin.csvCommit(entity, preview.rows); toast(`Imported — ${r.created} created, ${r.updated} updated, ${r.skipped} skipped`); setPreview(null); setCsv('') }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const colour = (s: string) => s === 'ok' ? C.green : s === 'warn' ? C.gold : C.red

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <b>CSV Import</b>
        <p style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>Bulk-import leagues, clubs, teams, ladders, alias mappings or rankings. Every row is validated and previewed before anything is written. Error rows are skipped; anonymous club names are flagged. Manual overrides are never overwritten.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={{ ...input, width: 150 }} value={entity} onChange={e => { setEntity(e.target.value as CsvEntity); setPreview(null) }}>
            {CSV_ENTITIES.map(x => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
          </select>
          <input type="file" accept=".csv,text/csv" onChange={e => onFile(e.target.files?.[0] ?? null)} style={{ color: C.mute, fontSize: 13 }} />
          <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => setCsv(CSV_TEMPLATES[entity] + '\n')}>Insert header template</button>
        </div>
        <textarea style={{ ...input, marginTop: 10, minHeight: 120, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} placeholder={CSV_TEMPLATES[entity]} value={csv} onChange={e => setCsv(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button disabled={busy || !csv.trim()} style={btn()} onClick={doPreview}>{busy ? 'Validating…' : 'Validate & preview'}</button>
          {preview && <button disabled={busy || (preview.okCount + preview.warnCount) === 0} style={btn(C.green)} onClick={doCommit}>Import {preview.okCount + preview.warnCount} valid row(s)</button>}
        </div>
      </div>

      {preview && (
        <div style={box}>
          <b>Preview — {preview.total} rows · <span style={{ color: C.green }}>{preview.okCount} ok</span> · <span style={{ color: C.gold }}>{preview.warnCount} warn</span> · <span style={{ color: C.red }}>{preview.errorCount} error</span></b>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr><th style={th}>#</th>{Object.keys(preview.rows[0]?.data ?? {}).map(k => <th key={k} style={th}>{k}</th>)}<th style={th}>Status</th></tr></thead>
              <tbody>
                {preview.rows.slice(0, 300).map(r => (
                  <tr key={r.index} style={{ background: r.status === 'error' ? 'rgba(255,84,112,0.08)' : r.status === 'warn' ? 'rgba(244,193,77,0.06)' : undefined }}>
                    <td style={td}>{r.index}</td>
                    {Object.keys(preview.rows[0].data).map(k => <td key={k} style={td}>{r.data[k]}</td>)}
                    <td style={td}><span style={{ color: colour(r.status), fontWeight: 700 }}>{r.status}</span><div style={{ color: C.mute, fontSize: 11 }}>{r.messages.join('; ')}</div></td>
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
          <input style={{ ...input, flex: 1, minWidth: 320 }} placeholder="https://www.playhq.com/football-australia/org/…" value={url}
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

// ─── AI Publishing ────────────────────────────────────────────────────────────
const ART_STATUS_COLOUR: Record<string, string> = { DRAFT: C.gold, APPROVED: '#4dd9f4', PUBLISHED: C.green, ARCHIVED: C.mute }
function Publishing({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [items, setItems] = useState<ArticleRow[]>([])
  const [counts, setCounts] = useState<{ status: string; count: number }[]>([])
  const [status, setStatus] = useState('ALL')
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ArticleFull | null>(null)
  const load = () => admin.listArticles(status).then(r => { setItems(r.data); setCounts(r.meta.counts); setSel(new Set()) }).catch(e => toast(e.message, false))
  useEffect(() => { load() }, [status])

  const generate = async () => {
    setBusy(true)
    try { const r = await admin.genArticles(); toast(`Generated ${r.created} new + ${r.updated} refreshed draft(s) for ${r.weekLabel ?? 'latest'}${r.skipped ? `, ${r.skipped} left (approved/published)` : ''}`); await load() }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const setStatusOne = async (id: string, s: string) => { try { await admin.setArticleStatus(id, s); toast(s === 'PUBLISHED' ? 'Published' : s.toLowerCase()); await load() } catch (e) { toast((e as Error).message, false) } }
  const bulk = async (s: string) => { if (sel.size === 0) return toast('select articles first', false); setBusy(true); try { const r = await admin.bulkArticles([...sel], s); toast(`${r.updated} article(s) ${s.toLowerCase()}`); await load() } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  const toggle = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const countOf = (s: string) => counts.find(c => c.status === s)?.count ?? 0

  if (editing) return <ArticleEditor article={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} toast={toast} />

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <b>AI Publishing</b>
            <p style={{ color: C.mute, fontSize: 13, margin: '4px 0 0' }}>Every Monday: import results and ladders, then generate drafts here. Each article is written from real ranking data. Review, edit, approve and publish.</p>
          </div>
          <button disabled={busy} style={btn(C.pink)} onClick={generate}>{busy ? 'Generating…' : '✎ Generate weekly drafts'}</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {['ALL', 'DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED'].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ ...btn(status === s ? C.pink : '#1b2233'), color: status === s ? '#fff' : C.mute, padding: '5px 11px', fontSize: 12 }}>
              {s[0] + s.slice(1).toLowerCase()}{s !== 'ALL' && countOf(s) > 0 && <span style={{ marginLeft: 6, background: ART_STATUS_COLOUR[s], color: '#111', borderRadius: 8, padding: '0 6px', fontSize: 11 }}>{countOf(s)}</span>}
            </button>
          ))}
        </div>
      </div>

      {sel.size > 0 && (
        <div style={{ ...box, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: C.mute, fontSize: 13 }}>{sel.size} selected</span>
          <button disabled={busy} style={btn('#4dd9f4')} onClick={() => bulk('APPROVED')}>Approve all</button>
          <button disabled={busy} style={btn(C.green)} onClick={() => bulk('PUBLISHED')}>Publish all</button>
          <button disabled={busy} style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => bulk('ARCHIVED')}>Archive all</button>
        </div>
      )}

      <div style={box}>
        {items.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>No articles yet. Click “Generate weekly drafts” after importing this week's results.</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map(a => (
            <div key={a.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, background: '#0d1220', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={sel.has(a.id)} onChange={() => toggle(a.id)} style={{ marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: '#1b2233', color: ART_STATUS_COLOUR[a.status], padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em' }}>{a.status}</span>
                  <span style={{ color: C.mute, fontSize: 11 }}>{a.kind.replace(/_/g, ' ').toLowerCase()}{a.weekLabel ? ` · ${a.weekLabel}` : ''}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 5 }}>{a.title}</div>
                <div style={{ color: C.mute, fontSize: 12.5, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.summary}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 260 }}>
                <button style={{ ...btn('#2a3145'), color: C.text }} onClick={async () => { try { setEditing(await admin.getArticle(a.id)) } catch (e) { toast((e as Error).message, false) } }}>Edit</button>
                {a.status !== 'PUBLISHED' && <button style={btn(C.green)} onClick={() => setStatusOne(a.id, 'PUBLISHED')}>Publish</button>}
                {a.status === 'PUBLISHED' && <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => setStatusOne(a.id, 'DRAFT')}>Unpublish</button>}
                {a.status === 'DRAFT' && <button style={btn('#4dd9f4')} onClick={() => setStatusOne(a.id, 'APPROVED')}>Approve</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface Blk { type: string; text: string }
function ArticleEditor({ article, onClose, onSaved, toast }: { article: ArticleFull; onClose: () => void; onSaved: () => void; toast: (t: string, ok?: boolean) => void }) {
  const [title, setTitle] = useState(article.title)
  const [summary, setSummary] = useState(article.summary)
  const [blocks, setBlocks] = useState<Blk[]>(() => { try { return JSON.parse(article.body) } catch { return [] } })
  const [busy, setBusy] = useState(false)
  const save = async (thenPublish?: boolean) => {
    setBusy(true)
    try {
      await admin.editArticle(article.id, { title, summary, body: blocks })
      if (thenPublish) await admin.setArticleStatus(article.id, 'PUBLISHED')
      toast(thenPublish ? 'Saved & published' : 'Saved'); onSaved()
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const setBlk = (i: number, text: string) => setBlocks(bs => bs.map((b, j) => j === i ? { ...b, text } : b))

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b>Edit article <span style={{ color: C.mute, fontWeight: 400, fontSize: 12 }}>· {article.kind.replace(/_/g, ' ').toLowerCase()}</span></b>
        <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={onClose}>← Back</button>
      </div>
      <div style={box}>
        <label style={{ color: C.mute, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Headline</label>
        <input style={{ ...input, marginTop: 6, fontSize: 16 }} value={title} onChange={e => setTitle(e.target.value)} />
        <label style={{ color: C.mute, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginTop: 14 }}>Summary</label>
        <textarea style={{ ...input, marginTop: 6, minHeight: 60 }} value={summary} onChange={e => setSummary(e.target.value)} />
        <label style={{ color: C.mute, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginTop: 14 }}>Body</label>
        <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
          {blocks.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: C.mute, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', width: 46, paddingTop: 9 }}>{b.type === 'h' ? 'Head' : b.type === 'quote' ? 'Quote' : 'Para'}</span>
              <textarea style={{ ...input, minHeight: b.type === 'h' ? 36 : 60, fontWeight: b.type === 'h' ? 700 : 400 }} value={b.text} onChange={e => setBlk(i, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...box, display: 'flex', gap: 8 }}>
        <button disabled={busy} style={btn()} onClick={() => save(false)}>Save draft</button>
        <button disabled={busy} style={btn(C.green)} onClick={() => save(true)}>Save &amp; publish</button>
      </div>
    </div>
  )
}

// ─── Pending Reviews ──────────────────────────────────────────────────────────
function Reviews({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [kinds, setKinds] = useState<{ kind: string; count: number }[]>([])
  const [status, setStatus] = useState('PENDING')
  const [kind, setKind] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const load = () => admin.listReviews(status, kind || undefined).then(r => { setItems(r.data); setKinds(r.meta?.kinds ?? []); setSelected(new Set()) }).catch(e => toast(e.message, false))
  useEffect(() => { load() }, [status, kind])
  const resolve = async (id: string, action: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED') => {
    try { await admin.resolveReview(id, action); toast(`Marked ${action}`); await load() } catch (e) { toast((e as Error).message, false) }
  }
  const bulk = async (action: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED') => {
    if (selected.size === 0) return toast('select items first', false)
    setBusy(true)
    try { const r = await admin.resolveReviewsBulk([...selected], action); toast(`${r.data.resolved} item(s) marked ${action}`); await load() }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const sweep = async () => {
    setBusy(true)
    try { const r = await admin.qualitySweep(); toast(`Sweep: ${r.raised} new item(s) raised (${r.duplicateClubs} dup groups, ${r.missingLogos} no-logo, ${r.orphanClubs} orphans, ${r.staleLeagues} stale)`); await load() }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const toggle = (id: string) => setSelected(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allSelected = items.length > 0 && items.every(i => i.status !== 'PENDING' || selected.has(i.id))
  const confColour = (c: number | null) => c == null ? C.mute : c < 0.4 ? C.red : c < 0.7 ? C.gold : C.green

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...box, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <b style={{ marginRight: 4 }}>Filter</b>
        <button style={{ ...btn(kind === '' ? C.pink : '#1b2233'), color: kind === '' ? '#fff' : C.mute, padding: '4px 10px', fontSize: 12 }} onClick={() => setKind('')}>All</button>
        {kinds.map(k => (
          <button key={k.kind} style={{ ...btn(kind === k.kind ? C.pink : '#1b2233'), color: kind === k.kind ? '#fff' : C.mute, padding: '4px 10px', fontSize: 12 }} onClick={() => setKind(kind === k.kind ? '' : k.kind)}>
            {k.kind.replace(/_/g, ' ').toLowerCase()} <span style={{ background: C.gold, color: '#111', borderRadius: 8, padding: '0 6px', marginLeft: 4 }}>{k.count}</span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <select style={{ ...input, width: 130 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="PENDING">Pending</option><option value="ALL">All</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="IGNORED">Ignored</option>
        </select>
        <button disabled={busy} style={btn('#2a3145')} onClick={sweep}>{busy ? 'Working…' : '⟳ Run quality sweep'}</button>
      </div>

      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <b>Review queue ({items.length}) <span style={{ color: C.mute, fontWeight: 400, fontSize: 12 }}>— least confident first</span></b>
          {selected.size > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: C.mute, fontSize: 12 }}>{selected.size} selected</span>
              <button disabled={busy} style={btn(C.green)} onClick={() => bulk('APPROVED')}>Approve all</button>
              <button disabled={busy} style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => bulk('IGNORED')}>Ignore all</button>
              <button disabled={busy} style={btn(C.red)} onClick={() => bulk('REJECTED')}>Reject all</button>
            </div>
          )}
        </div>
        {items.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>Nothing to review — everything is clean. ✓</p>}
        {items.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mute, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.filter(i => i.status === 'PENDING').map(i => i.id)))} />
            Select all pending
          </label>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map(it => (
            <div key={it.id} style={{ border: `1px solid ${selected.has(it.id) ? C.pink : C.line}`, borderRadius: 8, padding: 12, background: '#0d1220' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {it.status === 'PENDING' && <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} style={{ marginTop: 4 }} />}
                  <div>
                    <span style={{ background: '#1b2233', color: C.gold, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{it.kind}</span>
                    <span style={{ color: C.mute, fontSize: 12, marginLeft: 8 }}>{it.entityType} · {new Date(it.createdAt).toLocaleDateString()}</span>
                    {it.confidence != null && <span style={{ color: confColour(it.confidence), fontSize: 12, marginLeft: 8, fontWeight: 700 }}>conf {it.confidence.toFixed(2)}</span>}
                    <div style={{ fontSize: 13, marginTop: 4 }}>{it.reason}</div>
                  </div>
                </div>
                {it.status === 'PENDING' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btn(C.green)} onClick={() => resolve(it.id, 'APPROVED')}>Approve</button>
                    <button style={btn(C.gold)} onClick={() => resolve(it.id, 'MERGED')}>Merge</button>
                    <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => resolve(it.id, 'IGNORED')}>Ignore</button>
                    <button style={btn(C.red)} onClick={() => resolve(it.id, 'REJECTED')}>Reject</button>
                  </div>
                ) : <span style={{ color: C.mute, fontSize: 12 }}>{it.status}</span>}
              </div>
            </div>
          ))}
        </div>
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
        <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>PlayFooty <span style={{ color: C.pink }}>Admin</span></h1>
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
  const [whyId, setWhyId] = useState<string | null>(null)
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
              {rows.flatMap(l => [
                <tr key={l.id} style={{ background: l.needsStrengthReview ? 'rgba(244,193,77,0.08)' : undefined, opacity: l.archivedAt ? 0.5 : 1 }}>
                  <td style={td}>
                    {l.name}{l.needsStrengthReview && <span title="needs review" style={{ color: C.gold, marginLeft: 6 }}>⚠</span>}{l.archivedAt && <span style={{ color: C.mute, marginLeft: 6, fontSize: 11 }}>[archived]</span>}
                    {l.strengthReasoning && <button title="Why this strength?" style={{ background: 'none', border: 'none', color: whyId === l.id ? C.pink : C.mute, cursor: 'pointer', marginLeft: 6, fontSize: 12 }} onClick={() => setWhyId(whyId === l.id ? null : l.id)}>why?</button>}
                  </td>
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
                </tr>,
                ...(whyId === l.id && l.strengthReasoning ? [
                  <tr key={`${l.id}-why`}>
                    <td colSpan={8} style={{ ...td, background: '#0d1220', color: C.mute, fontSize: 12, lineHeight: 1.6 }}>
                      <b style={{ color: C.gold }}>Why {l.name} is rated {l.finalStrengthRating.toFixed(1)}★:</b> {l.strengthReasoning}
                      {l.strengthCalculatedAt && <span style={{ color: C.mute }}> — calculated {new Date(l.strengthCalculatedAt).toLocaleString()}</span>}
                    </td>
                  </tr>,
                ] : []),
              ])}
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
  const [history, setHistory] = useState<OcrHistoryRow[]>([])
  const [detail, setDetail] = useState<OcrHistoryDetail | null>(null)
  const loadHistory = () => admin.ocrHistory().then(setHistory).catch(() => {})
  useEffect(() => { admin.listLeagues().then(setLeagues).catch(() => {}); loadHistory() }, [])

  const onFile = (f: File | null) => { if (!f) return; const r = new FileReader(); r.onload = () => setImage(r.result as string); r.readAsDataURL(f) }
  const parse = async () => {
    if (!image) return toast('choose an image', false)
    setBusy(true); setPreview(null)
    try {
      const p = await admin.ocrParse(image, leagueId || undefined)
      setPreview(p); setRows(p.rows); if (p.matchedLeagueId) setLeagueId(p.matchedLeagueId)
      toast(`Detected ${p.rows.length} rows${p.uncertain ? `, ${p.uncertain} uncertain` : ''}`)
      loadHistory()
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const commit = async () => {
    if (!leagueId) return toast('select the target league', false)
    setBusy(true)
    try {
      const entries = rows.map(r => ({ team: r.match.matchedName && r.match.clubId ? r.match.matchedName : r.team, clubId: r.match.clubId, position: r.position, played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, points: r.points }))
      const res = await admin.ocrCommit(leagueId, entries, preview?.importId)
      toast(`Imported ${res.data.teams} teams — ${res.note}`); setPreview(null); setImage(null); setRows([])
      loadHistory()
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

      <div style={box}>
        <b>Import history ({history.length})</b>
        <p style={{ color: C.mute, fontSize: 12, marginTop: 4 }}>Every image ever uploaded is kept — original image, extraction, confidence and what was committed. Discarded imports are archived, never deleted.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th style={th}>When</th><th style={th}>League</th><th style={th}>Rows</th><th style={th}>Conf</th><th style={th}>Status</th><th style={th}></th></tr></thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td style={{ ...td, color: C.mute, whiteSpace: 'nowrap' }}>{new Date(h.createdAt).toLocaleString()}</td>
                  <td style={td}>{h.leagueName ?? h.detectedLeague ?? '—'}{h.detectedGrade ? <span style={{ color: C.mute }}> · {h.detectedGrade}</span> : null}</td>
                  <td style={td}>{h.rowCount}{h.uncertainCount ? <span style={{ color: C.gold }}> ({h.uncertainCount} unsure)</span> : null}</td>
                  <td style={{ ...td, color: (h.confidence ?? 1) < 0.75 ? C.gold : C.mute }}>{h.confidence != null ? h.confidence.toFixed(2) : '—'}</td>
                  <td style={td}><span style={{ color: h.status === 'COMMITTED' ? C.green : h.status === 'DISCARDED' ? C.mute : C.gold, fontWeight: 700 }}>{h.status}</span></td>
                  <td style={td}>
                    <button style={{ ...btn('#2a3145'), color: C.mute, marginRight: 6, padding: '3px 8px', fontSize: 11 }} onClick={async () => { try { setDetail(await admin.ocrHistoryDetail(h.id)) } catch (e) { toast((e as Error).message, false) } }}>View</button>
                    {h.status === 'PREVIEWED' && <button style={{ ...btn(C.red), padding: '3px 8px', fontSize: 11 }} onClick={async () => { try { await admin.ocrDiscard(h.id); toast('Discarded (kept in history)'); loadHistory() } catch (e) { toast((e as Error).message, false) } }}>Discard</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>Import {new Date(detail.createdAt).toLocaleString()} — {detail.status}</b>
            <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => setDetail(null)}>Close</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <img src={detail.image} alt="original upload" style={{ maxHeight: 280, maxWidth: '48%', borderRadius: 8, border: `1px solid ${C.line}` }} />
            <div style={{ flex: 1, minWidth: 260, fontSize: 12, color: C.mute, lineHeight: 1.8 }}>
              <div>Detected: <span style={{ color: C.text }}>{detail.detectedLeague ?? '—'}{detail.detectedGrade ? ` · ${detail.detectedGrade}` : ''}</span></div>
              <div>Rows: <span style={{ color: C.text }}>{detail.rowCount}</span> · Uncertain: <span style={{ color: detail.uncertainCount ? C.gold : C.text }}>{detail.uncertainCount}</span> · Confidence: <span style={{ color: C.text }}>{detail.confidence?.toFixed(2) ?? '—'}</span></div>
              <div>By: <span style={{ color: C.text }}>{detail.createdBy}</span>{detail.committedAt && <> · Committed: <span style={{ color: C.green }}>{new Date(detail.committedAt).toLocaleString()}</span></>}</div>
              {detail.notes && <div>Notes: {detail.notes}</div>}
            </div>
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
  const [explain, setExplain] = useState<Record<number, string>>({})
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast(ok) } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  const whyClub = async (rank: number, clubId: string) => {
    if (explain[rank]) { setExplain(p => { const n = { ...p }; delete n[rank]; return n }); return }
    try { const e = await admin.explainClub(clubId); setExplain(p => ({ ...p, [rank]: e.reasoning + (e.league?.reasoning ? ` League: ${e.league.reasoning}` : '') })) }
    catch (err) { toast((err as Error).message, false) }
  }
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
            <b>League strength (top 20) — click a league for its reasoning</b>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12 }}>
              <thead><tr><th style={th}>League</th><th style={th}>Before</th><th style={th}>After</th><th style={th}>Conf</th></tr></thead>
              <tbody>{report.leagues.slice(0, 20).map((l, i) => (
                <tr key={i} style={{ background: l.review ? 'rgba(244,193,77,0.08)' : undefined }}>
                  <td style={td}>
                    <details>
                      <summary style={{ cursor: 'pointer' }}>{l.name}{l.review && <span style={{ color: C.gold }}> ⚠</span>}</summary>
                      <div style={{ color: C.mute, fontSize: 11, lineHeight: 1.6, paddingTop: 4 }}>{l.reasoning}</div>
                    </details>
                  </td>
                  <td style={td}>{l.before}</td><td style={td}>{l.after}</td><td style={{ ...td, color: l.conf < 0.45 ? C.gold : C.mute }}>{l.conf.toFixed(2)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={box}>
            <b>Top 25 nationally</b>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12 }}>
              <thead><tr><th style={th}>#</th><th style={th}>Club</th><th style={th}>League</th><th style={th}>Rating</th><th style={th}></th></tr></thead>
              <tbody>{report.top.flatMap(t => [
                <tr key={t.rank}>
                  <td style={td}>{t.rank}</td><td style={td}>{t.clubName}</td><td style={{ ...td, color: C.mute }}>{t.leagueName ?? '—'}</td><td style={td}>{t.powerRating.toFixed(2)}</td>
                  <td style={td}>{t.clubId && <button style={{ background: 'none', border: 'none', color: explain[t.rank] ? C.pink : C.mute, cursor: 'pointer', fontSize: 11 }} onClick={() => whyClub(t.rank, t.clubId!)}>why?</button>}</td>
                </tr>,
                ...(explain[t.rank] ? [<tr key={`${t.rank}-why`}><td colSpan={5} style={{ ...td, background: '#0d1220', color: C.mute, fontSize: 11, lineHeight: 1.6 }}>{explain[t.rank]}</td></tr>] : []),
              ])}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
