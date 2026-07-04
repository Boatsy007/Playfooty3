/**
 * CNCA Admin Panel — hybrid data engine control surface.
 * Password-gated (admin key stored locally). Tabs: Leagues, Clubs, Image
 * Import, Rankings. Utilitarian internal-tool styling, not the public brand.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { admin, getKey, setKey, clearKey, type AdminLeague, type AdminClub, type OcrPreview, type OcrRow } from '../lib/admin'

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

export default function Admin() {
  const [authed, setAuthed] = useState(!!getKey())
  const [tab, setTab] = useState<'leagues' | 'clubs' | 'ocr' | 'rankings'>('leagues')
  const t = useToast()

  if (!authed) return <Login onIn={() => setAuthed(true)} />

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.5 }}>CNCA <span style={{ color: C.pink }}>Admin</span></h1>
          <button style={{ ...btn('#2a3145'), color: C.mute }} onClick={() => { clearKey(); setAuthed(false) }}>Sign out</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {(['leagues', 'clubs', 'ocr', 'rankings'] as const).map(x => (
            <button key={x} onClick={() => setTab(x)} style={{ ...btn(tab === x ? C.pink : '#1b2233'), color: tab === x ? '#fff' : C.mute }}>
              {x === 'ocr' ? 'Image Import' : x[0].toUpperCase() + x.slice(1)}
            </button>
          ))}
        </div>
        {tab === 'leagues' && <Leagues toast={t.show} />}
        {tab === 'clubs' && <Clubs toast={t.show} />}
        {tab === 'ocr' && <ImageImport toast={t.show} />}
        {tab === 'rankings' && <Rankings toast={t.show} />}
      </div>
      {t.node}
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
                <tr key={l.id} style={{ background: l.needsStrengthReview ? 'rgba(244,193,77,0.08)' : undefined }}>
                  <td style={td}>{l.name}{l.needsStrengthReview && <span title="needs review" style={{ color: C.gold, marginLeft: 6 }}>⚠</span>}</td>
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
                    <button style={btn(C.red)} onClick={() => { if (confirm(`Delete ${l.name}? This removes its clubs + ladder.`)) save(() => admin.deleteLeague(l.id)) }}>Del</button>
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
                <tr key={c.id}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.state?.code ?? '—'}</td>
                  <td style={td}>{c.region ?? '—'}</td>
                  <td style={td}>
                    <button style={{ ...btn('#2a3145'), color: C.mute, marginRight: 6 }} onClick={() => { const n = prompt('Rename club', c.name); if (n && n !== c.name) save(() => admin.editClub(c.id, { name: n })) }}>Edit</button>
                    <button style={{ ...btn('#2a3145'), color: C.mute, marginRight: 6 }} onClick={() => { const to = prompt('Move to leagueId'); if (to) save(() => admin.moveClub(c.id, to)) }}>Move</button>
                    <button style={btn(C.red)} onClick={() => { if (confirm(`Delete ${c.name}?`)) save(() => admin.deleteClub(c.id)) }}>Del</button>
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
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast(ok) } catch (e) { toast((e as Error).message, false) } finally { setBusy(false) } }
  return (
    <div style={{ ...box, display: 'grid', gap: 12, maxWidth: 460 }}>
      <b>Rankings</b>
      <p style={{ color: C.mute, fontSize: 13, margin: 0 }}>Re-run the national ranking, or lock it so imports/edits don't change the published standings.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={busy} style={btn()} onClick={() => run(() => admin.rerank().then(r => toast(`Re-ranked ${r.data.clubsRanked} clubs`)), 'done')}>Re-rank now</button>
        <button disabled={busy} style={btn(C.gold)} onClick={() => run(admin.lock, 'Rankings locked')}>Lock</button>
        <button disabled={busy} style={btn('#2a3145')} onClick={() => run(admin.unlock, 'Rankings unlocked')}>Unlock</button>
      </div>
    </div>
  )
}
