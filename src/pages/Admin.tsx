/**
 * PlayFooty Admin Panel — simple league operations control centre.
 * Password-gated (admin key stored locally). Public-site inspired admin UI;
 * backend workflows and data actions are unchanged.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { admin, getKey, setKey, clearKey, type AdminLeague, type AdminClub, type FootballLeague, type OcrPreview, type OcrRow, type DashboardData, type ReviewItem, type BackupRow, type AuditRow, type SettingRow, type ParsedUrl, type WorkflowRun, type EngineInfo, type CsvEntity, type CsvPreview, type OcrHistoryRow, type OcrHistoryDetail, type ArticleRow, type ArticleFull } from '../lib/admin'

const C = { bg: '#f6f7fb', panel: '#ffffff', line: '#e6eaf2', text: '#172033', mute: '#68758a', pink: '#d71920', gold: '#f4c14d', green: '#128a4a', red: '#d71920', soft: '#fff4f4' }
const box: CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: 20, maxWidth: '100%', minWidth: 0, boxShadow: '0 16px 38px rgba(23,32,51,.08)' }
const input: CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, color: C.text, borderRadius: 12, padding: '10px 12px', fontSize: 14, width: '100%', maxWidth: '100%', boxSizing: 'border-box', outlineColor: C.pink }
const btn = (bg = C.pink): CSSProperties => ({ background: bg, color: bg === C.gold ? '#111' : bg === '#fff' ? C.text : '#fff', border: bg === '#fff' ? `1px solid ${C.line}` : 'none', borderRadius: 999, padding: '10px 15px', fontSize: 13, fontWeight: 850, cursor: 'pointer', boxShadow: bg === C.pink ? '0 10px 22px rgba(215,25,32,.18)' : 'none' })
const th: CSSProperties = { textAlign: 'left', padding: '10px 12px', color: C.mute, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' }
const td: CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${C.line}`, fontSize: 13 }

/**
 * Scoped mobile-safety CSS. Prevents horizontal page overflow, wraps long URLs,
 * scrolls wide tables inside their own container, and collapses any `.pf-grid`
 * multi-column layout to a single column at ≤640px (the !important beats the
 * inline grid-template so desktop templates still apply above the breakpoint).
 */
const ADMIN_CSS = `
.pf-admin { overflow-x: hidden; max-width: 100vw; }
.pf-admin *, .pf-admin *::before, .pf-admin *::after { box-sizing: border-box; }
.pf-admin img, .pf-admin table, .pf-admin pre, .pf-admin textarea { max-width: 100%; }
.pf-admin .pf-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
.pf-admin .pf-break { overflow-wrap: anywhere; word-break: break-word; }
.pf-admin table { border-collapse: collapse; }
.pf-admin button { max-width: 100%; white-space: normal; transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
.pf-admin button:hover { transform: translateY(-1px); }
.pf-admin summary { color: #172033; }
@media (max-width: 640px) {
  .pf-admin .pf-grid { grid-template-columns: 1fr !important; }
  .pf-admin .pf-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .pf-admin table { font-size: 12px; }
}
`

function useToast() {
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const show = (t: string, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 4000) }
  const node = msg && (
    <div style={{ position: 'fixed', bottom: 20, right: 20, background: msg.ok ? C.green : C.red, color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, zIndex: 100, maxWidth: 420 }}>{msg.t}</div>
  )
  return { show, node }
}

const TABS = [
  ['dashboard', 'Dashboard'], ['leagues', 'Leagues'], ['clubs', 'Clubs'], ['fixtures', 'Fixtures'], ['results', 'Results'],
  ['imports', 'Imports'], ['reviews', 'Reviews'], ['settings', 'Settings'],
] as const
type Tab = typeof TABS[number][0] | 'publishing'

export default function Admin() {
  const [authed, setAuthed] = useState(!!getKey())
  const [tab, setTab] = useState<Tab>('dashboard')
  const [pending, setPending] = useState(0)
  const t = useToast()

  useEffect(() => { if (authed) admin.listReviews('PENDING').then(r => setPending(r.data.length)).catch(() => {}) }, [authed, tab])

  if (!authed) return <Login onIn={() => setAuthed(true)} />

  return (
    <div className="pf-admin" style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <style>{ADMIN_CSS}</style>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px clamp(14px, 4vw, 28px) 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 10, flexWrap: 'wrap' }}>
          <div><div style={{ color: C.pink, fontSize: 11, fontWeight: 950, letterSpacing: '.16em', textTransform: 'uppercase' }}>PlayFooty Admin</div><h1 style={{ margin: '4px 0 0', fontSize: 'clamp(28px, 6vw, 44px)', letterSpacing: '-.055em', lineHeight: 1 }}>Control Centre</h1></div>
          <button style={{ ...btn('#fff'), color: C.mute, border: `1px solid ${C.line}`, boxShadow: 'none' }} onClick={() => { clearKey(); setAuthed(false) }}>Sign out</button>
        </div>
        <div className="pf-tabs" style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {TABS.map(([x, label]) => (
            <button key={x} onClick={() => setTab(x)} style={{ ...btn(tab === x ? C.pink : '#fff'), color: tab === x ? '#fff' : C.text, border: `1px solid ${tab === x ? C.pink : C.line}`, boxShadow: tab === x ? '0 10px 22px rgba(215,25,32,.18)' : 'none' }}>
              {label}{x === 'reviews' && pending > 0 && <span style={{ marginLeft: 6, background: C.gold, color: '#111', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{pending}</span>}
            </button>
          ))}
        </div>
        <AdminGlobalSearch toast={t.show} go={setTab} />
        {tab === 'dashboard' && <Dashboard toast={t.show} go={setTab} />}
        {tab === 'leagues' && <LeaguesOperations toast={t.show} />}
        {tab === 'clubs' && <Clubs toast={t.show} />}
        {tab === 'fixtures' && <FixtureResultsOps kind="fixtures" toast={t.show} />}
        {tab === 'results' && <FixtureResultsOps kind="results" toast={t.show} />}
        {tab === 'imports' && <ImportsOps toast={t.show} />}
        {tab === 'reviews' && <Reviews toast={t.show} />}
        {tab === 'settings' && <SystemOps toast={t.show} />}
        {tab === 'publishing' && <Publishing toast={t.show} />}
      </div>
      {t.node}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ toast, go }: { toast: (t: string, ok?: boolean) => void; go: (t: Tab) => void }) {
  const [d, setD] = useState<DashboardData | null>(null)
  const [football, setFootball] = useState<FootballLeague[]>([])
  const [articles, setArticles] = useState<ArticleRow[]>([])
  useEffect(() => { admin.dashboard().then(setD).catch(e => toast(e.message, false)) }, [])
  useEffect(() => {
    Promise.all([
      admin.listFootballLeagues().catch(() => [] as FootballLeague[]),
      admin.listArticles('ALL').then(r => r.data).catch(() => [] as ArticleRow[]),
    ]).then(([leagues, articleRows]) => { setFootball(leagues); setArticles(articleRows) })
  }, [])
  if (!d) return <div style={box}>Loading…</div>
  const footballClubs = football.reduce((n, l) => n + (l._count?.clubSeasons ?? 0), 0)
  const fixtures = football.reduce((n, l) => n + (l._count?.footballFixtures ?? 0), 0)
  const results = football.reduce((n, l) => n + (l._count?.footballResults ?? 0), 0)
  const lastSync = football.map(l => l.lastSuccessfulSyncAt ?? l.lastSyncAt).filter(Boolean).sort().at(-1)
  const latestImport = football.map(l => ({ name: l.name, count: l._count?.footballImports ?? 0, sync: l.lastSyncAt })).filter(x => x.count || x.sync).sort((a, b) => String(b.sync ?? '').localeCompare(String(a.sync ?? '')))[0]
  const waitingArticles = articles.filter(a => a.status !== 'PUBLISHED').length
  const fmt = (s?: string | null) => s ? new Date(s).toLocaleString() : '—'
  const actions: Array<{ icon: string; title: string; text: string; button: string; status?: string; tone?: string; tab: Tab }> = [
    { icon: '🏟️', title: 'Build a League', text: 'Create a league, choose the data source and open its control centre.', button: 'Start league', status: `${football.length} live`, tab: 'leagues' },
    { icon: '🛡️', title: 'Add Club', text: 'Add or review clubs connected to a football league.', button: 'Manage clubs', status: `${footballClubs || 0} clubs`, tab: 'clubs' },
    { icon: '👥', title: 'Add Team', text: 'Prepare team records through the club workspace before fixtures go live.', button: 'Open clubs', status: 'Club first', tab: 'clubs' },
    { icon: '📅', title: 'Add Fixture', text: 'Add upcoming matches from a league workspace or import feed.', button: 'View fixtures', status: `${fixtures} fixtures`, tab: 'fixtures' },
    { icon: '🏉', title: 'Add Result', text: 'Record scores, regenerate ladders and send conflicts to review.', button: 'Enter results', status: `${results} results`, tab: 'results' },
    { icon: '🔴', title: 'Import from PlayHQ', text: 'Dispatch or track PlayHQ imports without running scraping in Vercel.', button: 'Open imports', status: latestImport ? 'Recent import' : 'Ready', tab: 'imports' },
    { icon: '✅', title: 'Review Data', text: 'Approve conflicts, duplicate checks and items needing attention.', button: 'Review queue', status: `${d.counts.pendingReviews} pending`, tone: d.counts.pendingReviews ? C.gold : C.green, tab: 'reviews' },
    { icon: '🚀', title: 'Publish Updates', text: 'Review drafts and publish approved updates when data is ready.', button: 'Publish', status: `${waitingArticles} waiting`, tone: waitingArticles ? C.gold : C.green, tab: 'publishing' },
  ]
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ ...box, padding: '26px clamp(18px, 4vw, 34px)', background: 'linear-gradient(135deg,#fff,#fff7f7)' }}>
        <span style={{ display: 'inline-flex', borderRadius: 999, background: C.soft, color: C.pink, padding: '7px 10px', fontSize: 11, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>Today in PlayFooty</span>
        <h2 style={{ margin: '14px 0 8px', fontSize: 'clamp(32px,7vw,62px)', lineHeight: .9, letterSpacing: '-.07em' }}>What would you like to do?</h2>
        <p style={{ margin: 0, color: C.mute, fontSize: 16, maxWidth: 720 }}>Choose a simple action below. The technical import, review and publish tools stay available, but the first screen focuses on everyday league operations.</p>
      </section>
      <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16 }}>
        {actions.map(a => <ActionCard key={a.title} {...a} onClick={() => go(a.tab)} />)}
      </div>
      <div style={box}>
        <b>Operations status</b>
        <div style={{ color: C.mute, fontSize: 13, marginTop: 8, display: 'grid', gap: 4 }}>
          <div>Last ranking run: <span style={{ color: C.text }}>{d.lastRun ? `${d.lastRun.weekLabel} · ${d.lastRun.clubCount} clubs · ${fmt(d.lastRun.completedAt)}` : '—'}</span></div>
          <div>Last sync: <span style={{ color: C.text }}>{lastSync ? fmt(lastSync) : d.lastScrape ? `${d.lastScrape.sourceType} · ${fmt(d.lastScrape.lastScrapedAt)}` : '—'}</span></div>
          <div>Latest import: <span style={{ color: C.text }}>{latestImport ? `${latestImport.name} · ${latestImport.count} import record(s)` : 'No football imports yet'}</span></div>
          <div>System health: <span style={{ color: d.warnings || d.counts.pendingReviews ? C.gold : C.green }}>{d.warnings || d.counts.pendingReviews ? 'Attention required' : 'Ready'}</span></div>
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
      <details style={box}>
        <summary style={{ cursor: 'pointer', fontWeight: 900 }}>Advanced activity</summary>
        <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
        <div style={box}>
          <b>Recent football leagues</b>
          <div style={{ marginTop: 8 }}>{football.slice(0, 8).map(l => <div key={l.id} style={{ fontSize: 13, padding: '3px 0', color: C.mute }}>{l.name} <span style={{ float: 'right' }}>{l.syncStatus}</span></div>)}</div>
          {football.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>No football leagues yet. Add the first league from the Leagues workspace.</p>}
        </div>
        <div style={box}>
          <b>Recent published articles</b>
          <div style={{ marginTop: 8 }}>{articles.filter(a => a.status === 'PUBLISHED').slice(0, 8).map(a => <div key={a.id} style={{ fontSize: 13, padding: '3px 0', color: C.mute }}>{a.title} <span style={{ float: 'right' }}>{fmt(a.publishedAt)}</span></div>)}</div>
          {articles.filter(a => a.status === 'PUBLISHED').length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>No published articles yet.</p>}
        </div>
        </div>
      </details>
    </div>
  )
}

function ActionCard({ icon, title, text, button, status, tone = C.pink, onClick }: { icon: string; title: string; text: string; button: string; status?: string; tone?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...box, textAlign: 'left', cursor: 'pointer', minHeight: 210, display: 'flex', flexDirection: 'column', alignItems: 'stretch', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 44, height: 44, borderRadius: 16, background: C.soft, display: 'grid', placeItems: 'center', fontSize: 22 }}>{icon}</span>
        {status && <span style={{ borderRadius: 999, border: `1px solid ${C.line}`, color: tone, padding: '5px 8px', fontSize: 11, fontWeight: 900 }}>{status}</span>}
      </div>
      <h3 style={{ margin: '18px 0 8px', fontSize: 23, letterSpacing: '-.04em', lineHeight: 1.02 }}>{title}</h3>
      <p style={{ margin: 0, color: C.mute, fontSize: 13, lineHeight: 1.45 }}>{text}</p>
      <span style={{ marginTop: 'auto', color: C.pink, fontSize: 12, fontWeight: 950, letterSpacing: '.1em', textTransform: 'uppercase', paddingTop: 16 }}>{button} →</span>
    </button>
  )
}

function LeaguesOperations({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <b>League Operations</b>
        <p style={{ color: C.mute, fontSize: 13, margin: '6px 0 0' }}>
          The league is now the centre of the admin. Configure source settings, run dry syncs, import verified football rows, generate ladders, compare differences, publish approved data and trigger rankings from each selected league.
        </p>
      </div>
      <FootballSources toast={toast} />
      <details style={box}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Legacy league utilities</summary>
        <p style={{ color: C.mute, fontSize: 13 }}>Existing strength, archive, approval and ladder-edit tools are preserved here until each tool is moved inside the selected league workspace.</p>
        <Leagues toast={toast} />
      </details>
    </div>
  )
}

function FixtureResultsOps({ kind, toast }: { kind: 'fixtures' | 'results'; toast: (t: string, ok?: boolean) => void }) {
  const [leagues, setLeagues] = useState<FootballLeague[]>([])
  useEffect(() => { admin.listFootballLeagues().then(setLeagues).catch(e => toast(e.message, false)) }, [])
  const title = kind === 'fixtures' ? 'Fixtures' : 'Results'
  const total = leagues.reduce((n, l) => n + (kind === 'fixtures' ? (l._count?.footballFixtures ?? 0) : (l._count?.footballResults ?? 0)), 0)
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <b>{title}</b>
        <p style={{ color: C.mute, fontSize: 13, margin: '6px 0 0' }}>
          {kind === 'fixtures'
            ? 'Fixture management is driven from each league workspace. Import or manually enter fixtures from Leagues → selected league → Manual verified import.'
            : 'Result approval is driven from each league workspace. Enter scores, generate ladders from results, compare differences and publish from Leagues.'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...box, minWidth: 160 }}><div style={{ fontSize: 30, fontWeight: 900 }}>{total}</div><div style={{ color: C.mute, fontSize: 12 }}>{title} recorded</div></div>
        <div style={{ ...box, minWidth: 160 }}><div style={{ fontSize: 30, fontWeight: 900 }}>{leagues.length}</div><div style={{ color: C.mute, fontSize: 12 }}>Football leagues</div></div>
      </div>
      <div style={box}>
        <b>League status</b>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>League</th><th style={th}>Source</th><th style={th}>{title}</th><th style={th}>Sync</th></tr></thead>
            <tbody>
              {leagues.map(l => <tr key={l.id}><td style={td}>{l.name}</td><td style={td}>{l.primaryDataSource ?? '—'}</td><td style={td}>{kind === 'fixtures' ? (l._count?.footballFixtures ?? 0) : (l._count?.footballResults ?? 0)}</td><td style={td}>{l.syncStatus}</td></tr>)}
            </tbody>
          </table>
        </div>
        {leagues.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>No football leagues are available yet.</p>}
      </div>
    </div>
  )
}

function ImportsOps({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [section, setSection] = useState<'playhq' | 'csv' | 'image'>('playhq')
  const sections = [
    ['playhq', 'PlayHQ'], ['csv', 'CSV'], ['image', 'Image'],
  ] as const
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...box, background: 'linear-gradient(135deg,#fff,#fff7f7)' }}>
        <b style={{ fontSize: 22 }}>Imports</b>
        <p style={{ color: C.mute, fontSize: 14, margin: '8px 0 14px', maxWidth: 720 }}>Bring data into PlayFooty from PlayHQ, CSV files or image uploads. Imports stay separated from publishing so admins can review first.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{sections.map(([id, label]) => <button key={id} style={{ ...btn(section === id ? C.pink : '#fff'), color: section === id ? '#fff' : C.text, border: `1px solid ${section === id ? C.pink : C.line}`, boxShadow: section === id ? '0 10px 22px rgba(215,25,32,.18)' : 'none' }} onClick={() => setSection(id)}>{label}</button>)}</div>
      </div>
      {section === 'playhq' && <PlayHQImport toast={toast} />}
      {section === 'csv' && <CsvImport toast={toast} />}
      {section === 'image' && <ImageImport toast={toast} />}
    </div>
  )
}

function SystemOps({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [section, setSection] = useState<'audit' | 'backups' | 'settings' | 'rankings'>('settings')
  const sections = [
    ['settings', 'Settings'], ['rankings', 'Rankings'], ['audit', 'Audit Log'], ['backups', 'Backups'],
  ] as const
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <b style={{ fontSize: 22 }}>Settings</b>
        <p style={{ color: C.mute, fontSize: 13, margin: '6px 0 12px' }}>Advanced tools are tucked away here so day-to-day admin stays simple.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{sections.map(([id, label]) => <button key={id} style={{ ...btn(section === id ? C.pink : '#fff'), color: section === id ? '#fff' : C.text, border: `1px solid ${section === id ? C.pink : C.line}`, boxShadow: section === id ? '0 10px 22px rgba(215,25,32,.18)' : 'none' }} onClick={() => setSection(id)}>{label}</button>)}</div>
      </div>
      {section === 'rankings' && <Rankings toast={toast} />}
      {section === 'audit' && <AuditLog toast={toast} />}
      {section === 'backups' && <Backups toast={toast} />}
      {section === 'settings' && <Settings toast={toast} />}
    </div>
  )
}

// ─── PlayFooty football source control centre ────────────────────────────────
const DATA_SOURCES = ['PLAYHQ_API', 'PLAYHQ_SCRAPER', 'CSV_UPLOAD', 'OCR_UPLOAD', 'MANUAL_ENTRY']

function AdminGlobalSearch({ toast, go }: { toast: (t: string, ok?: boolean) => void; go: (t: Tab) => void }) {
  const [q, setQ] = useState('')
  const [leagues, setLeagues] = useState<FootballLeague[]>([])
  const [clubs, setClubs] = useState<AdminClub[]>([])
  const [articles, setArticles] = useState<ArticleRow[]>([])
  useEffect(() => {
    Promise.all([
      admin.listFootballLeagues().catch(() => [] as FootballLeague[]),
      admin.listClubs().catch(() => [] as AdminClub[]),
      admin.listArticles('ALL').then(r => r.data).catch(() => [] as ArticleRow[]),
    ]).then(([leagueRows, clubRows, articleRows]) => { setLeagues(leagueRows); setClubs(clubRows); setArticles(articleRows) }).catch(e => toast(e.message, false))
  }, [])
  const needle = q.trim().toLowerCase()
  const results = needle.length < 2 ? [] : [
    ...leagues.filter(l => l.name.toLowerCase().includes(needle)).slice(0, 5).map(l => ({ type: 'League', label: l.name, meta: `${l.state?.code ?? '—'} · ${l.syncStatus}`, tab: 'leagues' as Tab })),
    ...clubs.filter(c => c.name.toLowerCase().includes(needle)).slice(0, 5).map(c => ({ type: 'Club', label: c.name, meta: c.state?.code ?? '—', tab: 'clubs' as Tab })),
    ...articles.filter(a => a.title.toLowerCase().includes(needle)).slice(0, 5).map(a => ({ type: 'Article', label: a.title, meta: a.status, tab: 'publishing' as Tab })),
  ]
  return (
    <div style={{ ...box, marginBottom: 18, padding: 12 }}>
      <input style={{ ...input, maxWidth: 560 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search admin: leagues, clubs, fixtures, results, articles…" aria-label="Universal admin search" />
      {needle.length >= 2 && (
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {results.length === 0 && <div style={{ color: C.mute, fontSize: 13 }}>No matching admin records found.</div>}
          {results.map((r, i) => (
            <button key={`${r.type}-${r.label}-${i}`} onClick={() => { go(r.tab); setQ('') }} style={{ ...input, display: 'flex', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer' }}>
              <span><b style={{ color: C.text }}>{r.label}</b> <small style={{ color: C.mute }}>· {r.type}</small></span>
              <span style={{ color: C.mute }}>{r.meta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: 'block', minWidth: 0 }}><small style={{ color: C.mute }}>{label}</small>{children}</label>
}


type LeagueImportMode = 'MANUAL_ENTRY' | 'PLAYHQ_SCRAPER' | 'PLAYHQ_API'
type AdvancedPanel = 'source' | 'rounds' | 'ladder' | 'reviews' | null

const sourceLabel = (s?: string | null) => s === 'PLAYHQ_SCRAPER' ? 'PlayHQ ladder URL' : s === 'PLAYHQ_API' ? 'PlayHQ API' : 'Manual entry'
const ladderStatus = (n: number) => n > 0 ? `${n} row${n === 1 ? '' : 's'}` : 'Not imported'
const basePlayHqUrl = (url: string) => url.trim().replace(/\/ladder\/?$/i, '')

function FootballSources({ toast }: { toast: (t: string, ok?: boolean) => void }) {
  const [rows, setRows] = useState<FootballLeague[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', state: 'VIC', season: '2026', grade: 'Senior Football', mode: 'MANUAL_ENTRY' as LeagueImportMode, ladderUrl: '', playhqOrganisationId: '', playhqCompetitionId: '', playhqSeasonId: '', playhqGradeId: '' })

  const load = () => admin.listFootballLeagues().then(r => { setRows(r); setSelectedId(id => id ?? r[0]?.id ?? null) }).catch(e => toast(e.message, false))
  useEffect(() => { void load() }, [])
  const selected = rows.find(r => r.id === selectedId) ?? null
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const createOrImport = async () => {
    if (!form.name.trim()) return toast('Add a league name first', false)
    setBusy(true)
    try {
      if (form.mode === 'MANUAL_ENTRY') {
        const row = await admin.createFootballLeague({ name: form.name, state: form.state, primaryDataSource: 'MANUAL_ENTRY', sourceUrl: '' })
        toast('Empty league created')
        await load(); setSelectedId(row.id)
      } else if (form.mode === 'PLAYHQ_SCRAPER') {
        if (!form.ladderUrl.trim()) return toast('Paste the PlayHQ ladder URL first', false)
        const row = await admin.createFootballLeague({ name: form.name, state: form.state, primaryDataSource: 'PLAYHQ_SCRAPER', sourceUrl: basePlayHqUrl(form.ladderUrl) })
        const imported = await admin.importFootballLadderUrl(row.id, { season: form.season, grade: form.grade, ladderUrl: form.ladderUrl.trim() })
        toast(`League created · ${imported.importedRows} ladder row${imported.importedRows === 1 ? '' : 's'} imported`, imported.importedRows > 0)
        await load(); setSelectedId(row.id)
      } else {
        const row = await admin.createFootballLeague({ name: form.name, state: form.state, primaryDataSource: 'PLAYHQ_API', playhqOrganisationId: form.playhqOrganisationId, playhqCompetitionId: form.playhqCompetitionId, playhqSeasonId: form.playhqSeasonId, playhqGradeId: form.playhqGradeId })
        const sync = await admin.syncFootballLeague(row.id, { sourceType: 'PLAYHQ_API', dryRun: false })
        toast(sync.note ?? 'PlayHQ API import started')
        await load(); setSelectedId(row.id)
      }
      setForm({ name: '', state: 'VIC', season: '2026', grade: 'Senior Football', mode: 'MANUAL_ENTRY', ladderUrl: '', playhqOrganisationId: '', playhqCompetitionId: '', playhqSeasonId: '', playhqGradeId: '' })
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }

  const actionLabel = form.mode === 'PLAYHQ_SCRAPER' ? 'Import from ladder URL' : form.mode === 'PLAYHQ_API' ? 'Import from PlayHQ API' : 'Create empty league'

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={box}>
        <b style={{ fontSize: 18 }}>Create / Import League</b>
        <p style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>Start here. Choose how the league will get its data and only fill in the fields for that option.</p>
        <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 90px 120px 1.2fr', gap: 10, alignItems: 'end', marginTop: 12 }}>
          <Field label="League name"><input style={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Gippsland League Seniors" /></Field>
          <Field label="State"><select style={input} value={form.state} onChange={e => set('state', e.target.value)}>{['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Season"><input style={input} value={form.season} onChange={e => set('season', e.target.value)} /></Field>
          <Field label="Grade"><input style={input} value={form.grade} onChange={e => set('grade', e.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Data source"><select style={{ ...input, maxWidth: 320 }} value={form.mode} onChange={e => set('mode', e.target.value)}>
            <option value="MANUAL_ENTRY">Manual entry</option>
            <option value="PLAYHQ_SCRAPER">PlayHQ ladder URL</option>
            <option value="PLAYHQ_API">PlayHQ API</option>
          </select></Field>
        </div>
        {form.mode === 'PLAYHQ_SCRAPER' && <div style={{ marginTop: 10 }}><Field label="Paste PlayHQ ladder URL"><input className="pf-break" style={input} value={form.ladderUrl} onChange={e => set('ladderUrl', e.target.value)} placeholder="https://www.playhq.com/afl/org/.../ladder" /></Field></div>}
        {form.mode === 'PLAYHQ_API' && <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 10 }}>
          <Field label="Organisation ID"><input style={input} value={form.playhqOrganisationId} onChange={e => set('playhqOrganisationId', e.target.value)} /></Field>
          <Field label="Competition ID"><input style={input} value={form.playhqCompetitionId} onChange={e => set('playhqCompetitionId', e.target.value)} /></Field>
          <Field label="Season ID"><input style={input} value={form.playhqSeasonId} onChange={e => set('playhqSeasonId', e.target.value)} /></Field>
          <Field label="Grade ID"><input style={input} value={form.playhqGradeId} onChange={e => set('playhqGradeId', e.target.value)} /></Field>
        </div>}
        <div style={{ marginTop: 14 }}><button disabled={busy} style={btn(C.red)} onClick={createOrImport}>{busy ? 'Working…' : actionLabel}</button></div>
      </div>

      <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,.9fr) minmax(0,1.1fr)', gap: 16, alignItems: 'start' }}>
        <div style={box}>
          <b>Leagues</b>
          {rows.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>No football leagues yet. Create or import one above.</p>}
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {rows.map(r => <LeagueSummaryCard key={r.id} league={r} selected={selectedId === r.id} onOpen={() => setSelectedId(r.id)} />)}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          {!selected ? <div style={box}><p style={{ color: C.mute }}>Choose a league to manage clubs, fixtures, results and ladder.</p></div>
            : <LeagueControlCentre key={selected.id} league={selected} toast={toast} onChanged={load} />}
        </div>
      </div>
    </div>
  )
}

function LeagueSummaryCard({ league, selected, onOpen }: { league: FootballLeague; selected: boolean; onOpen: () => void }) {
  const fixtures = league._count?.footballFixtures ?? 0
  const results = league._count?.footballResults ?? 0
  const ladderRows = league._count?.footballLadderEntries ?? 0
  return (
    <div style={{ border: `1px solid ${selected ? C.pink : C.line}`, borderRadius: 14, padding: 14, background: '#fff', boxShadow: selected ? '0 12px 30px rgba(215,25,32,.12)' : '0 8px 24px rgba(15,23,42,.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <div><b className="pf-break">{league.name}</b><div style={{ color: C.mute, fontSize: 12, marginTop: 3 }}>{league.state?.code ?? '—'} · {sourceLabel(league.primaryDataSource)}</div></div>
        <button style={btn(selected ? C.pink : '#fff')} onClick={onOpen}>Open</button>
      </div>
      <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 12, fontSize: 12, color: C.mute }}>
        <span>Clubs: <b style={{ color: C.text }}>{league._count?.clubSeasons ?? 0}</b></span>
        <span>Fixtures: <b style={{ color: C.text }}>{fixtures}</b></span>
        <span>Results: <b style={{ color: C.text }}>{results}</b></span>
        <span>Ladder: <b style={{ color: C.text }}>{ladderStatus(ladderRows)}</b></span>
      </div>
      <div style={{ color: C.mute, fontSize: 12, marginTop: 8 }}>Last import: {league.lastSuccessfulSyncAt || league.lastSyncAt ? new Date(league.lastSuccessfulSyncAt ?? league.lastSyncAt ?? '').toLocaleString() : 'Never'}</div>
    </div>
  )
}

function SimpleActionCard({ title, count, action, onClick }: { title: string; count?: string | number; action: string; onClick: () => void }) {
  return <div style={{ ...box, boxShadow: '0 10px 26px rgba(15,23,42,.06)' }}><b>{title}</b>{count != null && <div style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>{count}</div>}<button style={{ ...btn(C.red), marginTop: 12 }} onClick={onClick}>{action}</button></div>
}

function LeagueControlCentre({ league, toast, onChanged }: { league: FootballLeague; toast: (t: string, ok?: boolean) => void; onChanged: () => void }) {
  const [season, setSeason] = useState(league.currentSeason ?? '2026')
  const [grade, setGrade] = useState('Senior Football')
  const [busy, setBusy] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedPanel, setAdvancedPanel] = useState<AdvancedPanel>('source')

  const results = league._count?.footballResults ?? 0
  const fixtures = league._count?.footballFixtures ?? 0
  const ladderRows = league._count?.footballLadderEntries ?? 0
  const publish = async (recalculate: boolean) => { if (!confirm(`Publish approved ${season} ${grade} results + ladder${recalculate ? ' and recalculate rankings' : ''}?`)) return; setBusy(true); try { const o = await admin.publishFootballLeague(league.id, { season, grade, recalculate }); toast(`Published ${o.publishedResults} results · ${o.publishedLadderRows} ladder rows`); onChanged() } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }

  const openAdvanced = (panel: AdvancedPanel) => { setAdvancedPanel(panel); setAdvancedOpen(true) }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={box}>
        <b className="pf-break" style={{ fontSize: 18 }}>{league.name}</b>
        <div style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>{league.state?.code ?? '—'} · {sourceLabel(league.primaryDataSource)} · Ladder {ladderStatus(ladderRows)}</div>
        <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <Field label="Season"><input style={input} value={season} onChange={e => setSeason(e.target.value)} /></Field>
          <Field label="Grade"><input style={input} value={grade} onChange={e => setGrade(e.target.value)} /></Field>
        </div>
      </div>

      <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <SimpleActionCard title="Clubs" count={`${league._count?.clubSeasons ?? 0} clubs`} action="Add club" onClick={() => toast('Use the Clubs workspace to add a club.')} />
        <SimpleActionCard title="Fixtures" count={`${fixtures} fixtures`} action="Add fixture" onClick={() => openAdvanced('rounds')} />
        <SimpleActionCard title="Results" count={`${results} results`} action="Add result" onClick={() => openAdvanced('rounds')} />
        <SimpleActionCard title="Ladder" count={ladderStatus(ladderRows)} action="Import ladder" onClick={() => openAdvanced('ladder')} />
        <SimpleActionCard title="Imports" count={league.lastSuccessfulSyncAt || league.lastSyncAt ? `Last import ${new Date(league.lastSuccessfulSyncAt ?? league.lastSyncAt ?? '').toLocaleDateString()}` : 'No imports yet'} action="Import settings" onClick={() => openAdvanced('source')} />
        <SimpleActionCard title="Publish" count={busy ? 'Publishing…' : 'Approved data only'} action="Publish" onClick={() => publish(true)} />
      </div>

      <details open={advancedOpen} onToggle={e => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)} style={box}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced import settings</summary>
        <p style={{ color: C.mute, fontSize: 12, margin: '8px 0 10px' }}>Source setup, round URL imports, review routing and provenance tools live here for operators who need them.</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(['source', 'rounds', 'ladder', 'reviews'] as const).map(p => <button key={p} style={btn(advancedPanel === p ? C.pink : '#fff')} onClick={() => setAdvancedPanel(p)}>{p === 'source' ? 'Source setup' : p === 'rounds' ? 'Round imports' : p === 'ladder' ? 'Ladder tools' : 'Reviews'}</button>)}
        </div>
        {advancedPanel === 'source' && <SourceSetup league={league} toast={toast} onChanged={onChanged} />}
        {advancedPanel === 'rounds' && <RoundBackfill league={league} season={season} grade={grade} toast={toast} onChanged={onChanged} goReviews={() => setAdvancedPanel('reviews')} />}
        {advancedPanel === 'ladder' && <LadderPanel league={league} season={season} grade={grade} toast={toast} onChanged={onChanged} />}
        {advancedPanel === 'reviews' && <LeagueReviews league={league} toast={toast} />}
      </details>
    </div>
  )
}

interface Round { key: string; name: string; resultsUrl: string; fixtureUrl: string; dateRange: string; selected: boolean; status: 'not imported' | 'imported' | 'needs review' | 'published'; note?: string }
const newRound = (n: number): Round => ({ key: Math.random().toString(36).slice(2), name: `Round ${n}`, resultsUrl: '', fixtureUrl: '', dateRange: '', selected: false, status: 'not imported' })

function SourceSetup({ league, toast, onChanged }: { league: FootballLeague; toast: (t: string, ok?: boolean) => void; onChanged: () => void }) {
  const [f, setF] = useState({ primaryDataSource: league.primaryDataSource ?? 'MANUAL_ENTRY', sourceUrl: league.sourceUrl ?? '', ladderUrl: '', fixtureUrl: '', playhqOrganisationId: league.playhqOrganisationId ?? '', playhqCompetitionId: league.playhqCompetitionId ?? '', playhqSeasonId: league.playhqSeasonId ?? '', playhqGradeId: league.playhqGradeId ?? '' })
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
  const save = async () => {
    setBusy(true)
    try {
      const fallbackDataSources = DATA_SOURCES.filter(x => x !== f.primaryDataSource && ['CSV_UPLOAD', 'OCR_UPLOAD', 'MANUAL_ENTRY'].includes(x))
      await admin.setFootballSource(league.id, { primaryDataSource: f.primaryDataSource, fallbackDataSources, sourceUrl: f.sourceUrl, playhqOrganisationId: f.playhqOrganisationId, playhqCompetitionId: f.playhqCompetitionId, playhqSeasonId: f.playhqSeasonId, playhqGradeId: f.playhqGradeId })
      toast('Source setup saved'); onChanged()
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const drySync = async () => { setBusy(true); try { const o = await admin.syncFootballLeague(league.id, { sourceType: f.primaryDataSource, dryRun: true }); toast(o.note ?? `Sync: ${o.status}`); onChanged() } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  return (
    <div style={box}>
      <b>Source Setup</b>
      <p style={{ color: C.mute, fontSize: 12, margin: '4px 0 10px' }}>Configure where this league's data comes from. Ladder/Fixture URLs are used as provenance on the rows you import in Round Backfill.</p>
      <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Primary data source"><select style={input} value={f.primaryDataSource} onChange={e => set('primaryDataSource', e.target.value)}>{DATA_SOURCES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="PlayHQ/source URL"><input className="pf-break" style={input} value={f.sourceUrl} onChange={e => set('sourceUrl', e.target.value)} /></Field>
        <Field label="Ladder URL"><input className="pf-break" style={input} value={f.ladderUrl} onChange={e => set('ladderUrl', e.target.value)} placeholder="results-derived ladder link" /></Field>
        <Field label="Fixture URL"><input className="pf-break" style={input} value={f.fixtureUrl} onChange={e => set('fixtureUrl', e.target.value)} placeholder="season fixtures link" /></Field>
        <Field label="Organisation ID"><input style={input} value={f.playhqOrganisationId} onChange={e => set('playhqOrganisationId', e.target.value)} /></Field>
        <Field label="Competition ID"><input style={input} value={f.playhqCompetitionId} onChange={e => set('playhqCompetitionId', e.target.value)} /></Field>
        <Field label="Season ID"><input style={input} value={f.playhqSeasonId} onChange={e => set('playhqSeasonId', e.target.value)} /></Field>
        <Field label="Grade ID"><input style={input} value={f.playhqGradeId} onChange={e => set('playhqGradeId', e.target.value)} /></Field>
      </div>
      <p style={{ color: C.mute, fontSize: 11, marginTop: 8 }}>Note: the source endpoint persists the primary source, PlayHQ IDs and source URL. A dedicated persisted Ladder/Fixture URL field is not stored server-side yet (see report) — these are applied as import provenance.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button disabled={busy} style={btn()} onClick={save}>Save source setup</button>
        <button disabled={busy} style={btn('#fff')} onClick={drySync}>Run dry sync</button>
      </div>
    </div>
  )
}

function RoundBackfill({ league, season, grade, toast, onChanged, goReviews }: { league: FootballLeague; season: string; grade: string; toast: (t: string, ok?: boolean) => void; onChanged: () => void; goReviews: () => void }) {
  const [rounds, setRounds] = useState<Round[]>([newRound(1), newRound(2), newRound(3)])
  const [source, setSource] = useState('PLAYHQ_SCRAPER')
  const [busy, setBusy] = useState(false)
  const upd = (key: string, patch: Partial<Round>) => setRounds(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r))
  const add = () => setRounds(rs => [...rs, newRound(rs.length + 1)])
  const remove = (key: string) => setRounds(rs => rs.filter(r => r.key !== key))
  const applyReport = (key: string, rep: { resultsImported: number; fixturesImported: number; reviews: number; clubsCreated: number }) =>
    upd(key, { status: rep.reviews > (rep.resultsImported + rep.fixturesImported) ? 'needs review' : (rep.resultsImported || rep.fixturesImported) ? 'imported' : 'needs review', note: `${rep.resultsImported} results · ${rep.fixturesImported} fixtures · ${rep.clubsCreated} clubs · ${rep.reviews} review` })

  // Import a set of rounds via the season endpoint (backend fetches every URL).
  const importRounds = async (list: Round[], label: string) => {
    const usable = list.filter(r => r.resultsUrl.trim() || r.fixtureUrl.trim())
    if (usable.length === 0) return toast('Add a Results or Fixture URL first', false)
    setBusy(true)
    try {
      const out = await admin.importFootballSeason(league.id, { season, grade, source, generateLadder: true, rounds: usable.map(r => ({ round: r.name, resultsUrl: r.resultsUrl.trim() || undefined, fixtureUrl: r.fixtureUrl.trim() || undefined })) })
      out.rounds.forEach(rep => { const r = usable.find(x => x.name === rep.round); if (r) applyReport(r.key, rep) })
      const t = out.totals
      toast(`${label}: ${t.resultsImported} results · ${t.fixturesImported} fixtures · ${t.clubsCreated} clubs created · ${t.ladderRows} ladder rows${t.reviews ? ` · ${t.reviews} to review` : ''}`, t.reviews === 0)
      onChanged()
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const importOne = async (r: Round) => {
    if (!r.resultsUrl.trim() && !r.fixtureUrl.trim()) return toast(`${r.name}: add a Results or Fixture URL`, false)
    setBusy(true)
    try {
      const rep = await admin.importFootballUrl(league.id, { round: r.name, season, grade, source, resultsUrl: r.resultsUrl.trim() || undefined, fixtureUrl: r.fixtureUrl.trim() || undefined, generateLadder: true })
      applyReport(r.key, rep)
      toast(`${r.name}: ${rep.resultsImported} results · ${rep.fixturesImported} fixtures · ${rep.clubsCreated} clubs${rep.warnings.length ? ` · ⚠ ${rep.warnings[0]}` : ''}`, rep.reviews === 0)
      onChanged()
    } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const previousRounds = () => { const idx = rounds.map((r, i) => ({ r, i })).filter(x => x.r.status === 'imported').map(x => x.i); const last = idx.length ? Math.max(...idx) : rounds.length - 1; return rounds.slice(0, last + 1) }

  const statusColour = (s: Round['status']) => s === 'imported' ? C.green : s === 'published' ? '#4dd9f4' : s === 'needs review' ? C.gold : C.mute
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={box}>
        <b>Round Backfill — paste URLs, we fetch &amp; import</b>
        <p style={{ color: C.mute, fontSize: 12, margin: '4px 0 10px' }}>Add every round and paste its Results URL (and Fixture URL for future rounds). The backend fetches each page, parses the football scores, auto-creates any missing clubs, stores provenance, routes conflicts to review, and regenerates the ladder from results. Idempotent — re-importing never duplicates. No row copying.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Field label="Import source"><select style={{ ...input, width: 170 }} value={source} onChange={e => setSource(e.target.value)}>{DATA_SOURCES.map(s => <option key={s}>{s}</option>)}</select></Field>
          <button style={btn('#fff')} onClick={add}>+ Add round</button>
          <button disabled={busy} style={btn(C.green)} onClick={() => importRounds(rounds, 'Entire season')}>Import entire season</button>
          <button disabled={busy} style={btn()} onClick={() => importRounds(rounds.filter(r => r.selected), 'Selected')}>Import selected</button>
          <button disabled={busy} style={btn()} onClick={() => importRounds(previousRounds(), 'Previous rounds')}>Import previous rounds</button>
        </div>
        {source === 'MANUAL_ENTRY' && <p style={{ color: C.gold, fontSize: 11, marginTop: 6 }}>MANUAL_ENTRY marks imported rows as verified. Use a PlayHQ/scraper source for URL fetches so manual overrides are never replaced.</p>}
      </div>

      {rounds.map(r => (
        <div key={r.key} style={box}>
          <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: '18px 1.2fr 2fr 2fr 1fr', gap: 8, alignItems: 'end' }}>
            <label style={{ paddingBottom: 8 }}><input type="checkbox" checked={r.selected} onChange={e => upd(r.key, { selected: e.target.checked })} /></label>
            <Field label="Round"><input style={input} value={r.name} onChange={e => upd(r.key, { name: e.target.value })} /></Field>
            <Field label="Results URL"><input className="pf-break" style={input} value={r.resultsUrl} onChange={e => upd(r.key, { resultsUrl: e.target.value })} placeholder="https://www.playhq.com/…/results" /></Field>
            <Field label="Fixture URL (future rounds)"><input className="pf-break" style={input} value={r.fixtureUrl} onChange={e => upd(r.key, { fixtureUrl: e.target.value })} placeholder="https://www.playhq.com/…/fixture" /></Field>
            <Field label="Date range"><input style={input} value={r.dateRange} onChange={e => upd(r.key, { dateRange: e.target.value })} placeholder="5–6 Apr" /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{ color: statusColour(r.status), fontSize: 12, fontWeight: 700 }}>● {r.status}</span>
            {r.note && <span style={{ color: C.mute, fontSize: 12 }}>{r.note}</span>}
            <span style={{ flex: 1 }} />
            <button disabled={busy} style={btn(C.green)} onClick={() => importOne(r)}>Import round</button>
            <button style={btn(C.gold)} onClick={goReviews}>Review</button>
            <button style={{ ...btn('#fff'), color: C.red }} onClick={() => remove(r.key)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function LadderPanel({ league, season, grade, toast, onChanged }: { league: FootballLeague; season: string; grade: string; toast: (t: string, ok?: boolean) => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [ladderUrl, setLadderUrl] = useState('')
  const [diffs, setDiffs] = useState<{ clubName: string; generatedPosition: number | null; importedPosition: number | null; differs: boolean }[] | null>(null)
  const [conflicts, setConflicts] = useState(0)
  const importLadderUrl = async () => {
    if (!ladderUrl.trim()) return toast('Paste a ladder URL to import + compare', false)
    setBusy(true)
    try { const o = await admin.importFootballLadderUrl(league.id, { season, grade, ladderUrl: ladderUrl.trim() }); setDiffs(o.diffs); setConflicts(o.conflictCount); toast(`Imported ${o.importedRows} ladder rows · ${o.conflictCount} difference(s) vs generated${o.warnings.length ? ` · ⚠ ${o.warnings[0]}` : ''}`, o.conflictCount === 0 && o.importedRows > 0); onChanged() }
    catch (e) { toast((e as Error).message, false) } finally { setBusy(false) }
  }
  const generate = async () => { setBusy(true); try { const o = await admin.generateFootballLadder(league.id, { season, grade }); toast(`Generated ${o.rows ?? o.ladder?.length ?? 0} ladder rows from results`); onChanged() } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  const compare = async () => { setBusy(true); try { const o = await admin.compareFootballLadder(league.id, season, grade); setDiffs((o.diffs as { clubName: string; generatedPosition: number | null; storedPosition: number | null; differs: boolean }[]).map(d => ({ clubName: d.clubName, generatedPosition: d.generatedPosition, importedPosition: d.storedPosition, differs: d.differs }))); setConflicts(o.conflictCount); toast(`${o.conflictCount} difference(s) between generated and stored ladder`) } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  const publish = async () => { if (!confirm('Publish the approved ladder + results and recalculate rankings?')) return; setBusy(true); try { const o = await admin.publishFootballLeague(league.id, { season, grade, recalculate: true }); toast(`Published ${o.publishedLadderRows} ladder rows · ${o.publishedResults} results`); onChanged() } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={box}>
        <b>Ladder workflow</b>
        <p style={{ color: C.mute, fontSize: 12, margin: '4px 0 10px' }}>Results drive the ladder. Generate rebuilds it from imported results; an imported ladder is validation/fallback. Compare, then publish the approved ladder. Differences are surfaced for review, never auto-applied over verified data.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button disabled={busy} style={btn(C.green)} onClick={generate}>Generate from results</button>
          <button disabled={busy} style={btn(C.gold)} onClick={compare}>Compare generated vs stored</button>
          <button disabled={busy} style={btn(C.red)} onClick={publish}>Publish + recalculate</button>
        </div>
      </div>
      <div style={box}>
        <b>Import ladder from URL (validation / fallback)</b>
        <p style={{ color: C.mute, fontSize: 12, margin: '4px 0 8px' }}>Paste a published ladder URL — the backend fetches it and shows the differences against the results-generated ladder. The generated ladder stays authoritative; approve the imported one only after review.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="pf-break" style={{ ...input, flex: 1, minWidth: 220 }} value={ladderUrl} onChange={e => setLadderUrl(e.target.value)} placeholder="https://www.playhq.com/…/ladder" />
          <button disabled={busy} style={btn()} onClick={importLadderUrl}>Import + compare</button>
        </div>
      </div>
      {diffs && (
        <div style={box}>
          <b>Comparison — {conflicts} conflict(s)</b>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
            <button style={btn(C.green)} disabled={busy} onClick={() => toast('Generated ladder is already the stored/authoritative ladder', true)}>Approve generated</button>
            <button style={btn(C.gold)} disabled={busy} onClick={() => toast('Imported ladder kept for review — publish generated, or resolve in Reviews', true)}>Approve imported (review)</button>
          </div>
          <div className="pf-scroll">
            <table style={{ width: '100%' }}>
              <thead><tr><th style={th}>Club</th><th style={th}>Generated</th><th style={th}>Imported</th><th style={th}>Match</th></tr></thead>
              <tbody>{diffs.map((d, i) => (
                <tr key={i} style={{ background: d.differs ? 'rgba(244,193,77,0.08)' : undefined }}>
                  <td style={td} className="pf-break">{d.clubName}</td><td style={td}>{d.generatedPosition ?? '—'}</td><td style={td}>{d.importedPosition ?? '—'}</td>
                  <td style={td}><span style={{ color: d.differs ? C.gold : C.green }}>{d.differs ? 'differs' : 'ok'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function LeagueReviews({ league, toast }: { league: FootballLeague; toast: (t: string, ok?: boolean) => void }) {
  const [items, setItems] = useState<ReviewItem[]>([])
  const load = () => admin.listReviews('PENDING').then(r => setItems(r.data.filter(i => i.entityId === league.id || (i.payload ?? '').includes(league.id)))).catch(e => toast(e.message, false))
  useEffect(() => { load() }, [])
  const resolve = async (id: string, action: 'APPROVED' | 'REJECTED' | 'IGNORED') => { try { await admin.resolveReview(id, action); toast(`Marked ${action}`); load() } catch (e) { toast((e as Error).message, false) } }
  return (
    <div style={box}>
      <b>Reviews for this league ({items.length})</b>
      {items.length === 0 && <p style={{ color: C.mute, fontSize: 13, marginTop: 6 }}>No pending reviews tied to this league. Conflicts and uncertain imports appear here.</p>}
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map(it => (
          <div key={it.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ background: '#fff', color: C.gold, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{it.kind}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btn(C.green)} onClick={() => resolve(it.id, 'APPROVED')}>Approve</button>
                <button style={{ ...btn('#fff'), color: C.mute }} onClick={() => resolve(it.id, 'IGNORED')}>Ignore</button>
                <button style={btn(C.red)} onClick={() => resolve(it.id, 'REJECTED')}>Reject</button>
              </div>
            </div>
            <div className="pf-break" style={{ fontSize: 13, marginTop: 6 }}>{it.reason}</div>
          </div>
        ))}
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
          <button style={{ ...btn('#fff'), color: C.mute }} onClick={() => setCsv(CSV_TEMPLATES[entity] + '\n')}>Insert header template</button>
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
  const [bulkState, setBulkState] = useState('VIC')
  const [bulkLimit, setBulkLimit] = useState('5')
  const [bulkDryRun, setBulkDryRun] = useState(true)

  const loadRuns = () => admin.engineRuns('playhq-url-import.yml').then(setRuns).catch(() => {})
  const loadBulkRuns = () => admin.engineRuns('playhq-football-bulk-discovery.yml').then(setRuns).catch(() => {})
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
  const doFootballBulk = () => dispatch(() => admin.footballBulkDiscover({ state: bulkState, limit: bulkLimit, dryRun: bulkDryRun, season: '2026', grade: 'Senior Football', roundLimit: '15' }), 'Football bulk discovery dispatched')

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...box, borderColor: engine && !engine.configured ? C.red : C.line }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Execution engine — GitHub Actions</b>
          {engine && <span style={{ fontSize: 12, color: engine.configured ? C.green : C.red }}>{engine.configured ? `● connected · ${engine.repo} @ ${engine.ref}` : '● not configured'}</span>}
        </div>
        <p style={{ color: C.mute, fontSize: 12, margin: '6px 0 0' }}>PlayHQ scraping runs in a headless browser on GitHub's runners (not in the serverless API), then writes to the same database and re-ranks. Every action here dispatches a workflow and tracks it below.</p>
        {engine && !engine.configured && <p style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>Set <code>GITHUB_DISPATCH_TOKEN</code> plus <code>GITHUB_REPO</code> and <code>GITHUB_REF=work</code> in the API environment to enable one-click dispatch.</p>}
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

      <div style={{ ...box, display: 'grid', gap: 10 }}>
        <b>Bulk</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button disabled={busy} style={btn()} onClick={() => dispatch(() => admin.syncAll(), 'Sync-all dispatched')}>↻ Sync all leagues (weekly)</button>
          <button disabled={busy} style={btn('#fff')} onClick={() => dispatch(() => admin.discover({}), 'Discovery dispatched')}>Discover new leagues</button>
          <button style={{ ...btn('#fff'), color: C.mute }} onClick={loadRuns}>Refresh status</button>
        </div>
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
          <b style={{ fontSize: 13 }}>Controlled football ladder discovery</b>
          <p style={{ color: C.mute, fontSize: 12, margin: '4px 0 8px' }}>Safe first run: VIC, limit 5, dry run. Creates/imports only when dry run is off.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={input} value={bulkState} onChange={e => setBulkState(e.target.value)}>{['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s => <option key={s}>{s}</option>)}</select>
            <input style={{ ...input, width: 90 }} value={bulkLimit} onChange={e => setBulkLimit(e.target.value)} aria-label="League limit" />
            <label style={{ color: C.mute, fontSize: 13 }}><input type="checkbox" checked={bulkDryRun} onChange={e => setBulkDryRun(e.target.checked)} /> Dry run</label>
            <button disabled={busy} style={btn(C.green)} onClick={doFootballBulk}>Run football discovery</button>
            <button style={{ ...btn('#fff'), color: C.mute }} onClick={loadBulkRuns}>Latest football runs</button>
          </div>
        </div>
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
            <button key={s} onClick={() => setStatus(s)} style={{ ...btn(status === s ? C.pink : '#fff'), color: status === s ? '#fff' : C.mute, padding: '5px 11px', fontSize: 12 }}>
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
          <button disabled={busy} style={{ ...btn('#fff'), color: C.mute }} onClick={() => bulk('ARCHIVED')}>Archive all</button>
        </div>
      )}

      <div style={box}>
        {items.length === 0 && <p style={{ color: C.mute, fontSize: 13 }}>No articles yet. Click “Generate weekly drafts” after importing this week's results.</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map(a => (
            <div key={a.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, background: '#f8fafc', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={sel.has(a.id)} onChange={() => toggle(a.id)} style={{ marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: '#fff', color: ART_STATUS_COLOUR[a.status], padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em' }}>{a.status}</span>
                  <span style={{ color: C.mute, fontSize: 11 }}>{a.kind.replace(/_/g, ' ').toLowerCase()}{a.weekLabel ? ` · ${a.weekLabel}` : ''}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 5 }}>{a.title}</div>
                <div style={{ color: C.mute, fontSize: 12.5, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.summary}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 260 }}>
                <button style={{ ...btn('#fff'), color: C.text }} onClick={async () => { try { setEditing(await admin.getArticle(a.id)) } catch (e) { toast((e as Error).message, false) } }}>Edit</button>
                {a.status !== 'PUBLISHED' && <button style={btn(C.green)} onClick={() => setStatusOne(a.id, 'PUBLISHED')}>Publish</button>}
                {a.status === 'PUBLISHED' && <button style={{ ...btn('#fff'), color: C.mute }} onClick={() => setStatusOne(a.id, 'DRAFT')}>Unpublish</button>}
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
        <button style={{ ...btn('#fff'), color: C.mute }} onClick={onClose}>← Back</button>
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
        <button style={{ ...btn(kind === '' ? C.pink : '#fff'), color: kind === '' ? '#fff' : C.mute, padding: '4px 10px', fontSize: 12 }} onClick={() => setKind('')}>All</button>
        {kinds.map(k => (
          <button key={k.kind} style={{ ...btn(kind === k.kind ? C.pink : '#fff'), color: kind === k.kind ? '#fff' : C.mute, padding: '4px 10px', fontSize: 12 }} onClick={() => setKind(kind === k.kind ? '' : k.kind)}>
            {k.kind.replace(/_/g, ' ').toLowerCase()} <span style={{ background: C.gold, color: '#111', borderRadius: 8, padding: '0 6px', marginLeft: 4 }}>{k.count}</span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <select style={{ ...input, width: 130 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="PENDING">Pending</option><option value="ALL">All</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="IGNORED">Ignored</option>
        </select>
        <button disabled={busy} style={btn('#fff')} onClick={sweep}>{busy ? 'Working…' : '⟳ Run quality sweep'}</button>
      </div>

      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <b>Review queue ({items.length}) <span style={{ color: C.mute, fontWeight: 400, fontSize: 12 }}>— least confident first</span></b>
          {selected.size > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: C.mute, fontSize: 12 }}>{selected.size} selected</span>
              <button disabled={busy} style={btn(C.green)} onClick={() => bulk('APPROVED')}>Approve all</button>
              <button disabled={busy} style={{ ...btn('#fff'), color: C.mute }} onClick={() => bulk('IGNORED')}>Ignore all</button>
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
            <div key={it.id} style={{ border: `1px solid ${selected.has(it.id) ? C.pink : C.line}`, borderRadius: 8, padding: 12, background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {it.status === 'PENDING' && <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} style={{ marginTop: 4 }} />}
                  <div>
                    <span style={{ background: '#fff', color: C.gold, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{it.kind}</span>
                    <span style={{ color: C.mute, fontSize: 12, marginLeft: 8 }}>{it.entityType} · {new Date(it.createdAt).toLocaleDateString()}</span>
                    {it.confidence != null && <span style={{ color: confColour(it.confidence), fontSize: 12, marginLeft: 8, fontWeight: 700 }}>conf {it.confidence.toFixed(2)}</span>}
                    <div style={{ fontSize: 13, marginTop: 4 }}>{it.reason}</div>
                  </div>
                </div>
                {it.status === 'PENDING' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btn(C.green)} onClick={() => resolve(it.id, 'APPROVED')}>Approve</button>
                    <button style={btn(C.gold)} onClick={() => resolve(it.id, 'MERGED')}>Merge</button>
                    <button style={{ ...btn('#fff'), color: C.mute }} onClick={() => resolve(it.id, 'IGNORED')}>Ignore</button>
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
                    <button style={{ ...btn('#fff'), color: C.mute, marginRight: 6 }} onClick={() => { const n = prompt('Rename league', l.name); if (n && n !== l.name) save(() => admin.editLeague(l.id, { name: n })) }}>Edit</button>
                    <button title="Re-scrape stored PlayHQ URL on GitHub Actions" style={{ ...btn('#1b3a2a'), color: C.green, marginRight: 6 }} onClick={() => save(async () => { await admin.syncLeague(l.id); return { note: 'sync dispatched to GitHub Actions' } })}>Sync</button>
                    {l.approvalStatus === 'PENDING' && <button style={{ ...btn(C.green), marginRight: 6 }} onClick={() => save(() => admin.approveLeague(l.id))}>Approve</button>}
                    {l.archivedAt
                      ? <button style={btn(C.green)} onClick={() => save(() => admin.restoreLeague(l.id))}>Restore</button>
                      : <button style={btn(C.red)} onClick={() => { if (confirm(`Archive ${l.name}? It is recoverable — nothing is permanently deleted.`)) save(() => admin.deleteLeague(l.id)) }}>Archive</button>}
                  </td>
                </tr>,
                ...(whyId === l.id && l.strengthReasoning ? [
                  <tr key={`${l.id}-why`}>
                    <td colSpan={8} style={{ ...td, background: '#f8fafc', color: C.mute, fontSize: 12, lineHeight: 1.6 }}>
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
      <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
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
                    <button style={{ ...btn('#fff'), color: C.mute, marginRight: 6 }} onClick={() => { const n = prompt('Rename club', c.name); if (n && n !== c.name) save(() => admin.editClub(c.id, { name: n })) }}>Edit</button>
                    <button style={{ ...btn('#fff'), color: C.mute, marginRight: 6 }} onClick={() => { const to = prompt('Move to leagueId'); if (to) save(() => admin.moveClub(c.id, to)) }}>Move</button>
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
                        ? <span>{r.match.matchedName} <span style={{ color: r.match.confident ? C.green : C.gold }}>({r.match.score})</span> <button style={{ ...btn('#fff'), color: C.mute, padding: '2px 6px', fontSize: 11 }} onClick={() => setMatch(i, null, null)}>new</button></span>
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
                    <button style={{ ...btn('#fff'), color: C.mute, marginRight: 6, padding: '3px 8px', fontSize: 11 }} onClick={async () => { try { setDetail(await admin.ocrHistoryDetail(h.id)) } catch (e) { toast((e as Error).message, false) } }}>View</button>
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
            <button style={{ ...btn('#fff'), color: C.mute }} onClick={() => setDetail(null)}>Close</button>
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
          <button disabled={busy} style={btn('#fff')} onClick={() => run(admin.unlock, 'Rankings unlocked')}>Unlock</button>
        </div>
      </div>
      {report && (
        <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                ...(explain[t.rank] ? [<tr key={`${t.rank}-why`}><td colSpan={5} style={{ ...td, background: '#f8fafc', color: C.mute, fontSize: 11, lineHeight: 1.6 }}>{explain[t.rank]}</td></tr>] : []),
              ])}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
