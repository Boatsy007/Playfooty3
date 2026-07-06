/**
 * Squadi / NetballConnect API probe (diagnostic, no DB writes)
 * ─────────────────────────────────────────────────────────────────────────────
 * Country Footy embeds a NetballConnect livescore iframe whose data comes from
 * api-netball.squadi.com. This probe hits that API directly for one org
 * (Hampden FNL) to lock the contract before writing the adapter:
 *   • list competitions for the org across years → find the CURRENT season
 *   • list that competition's divisions → see how "A Grade" senior women's is named
 *   • find the ladder/standings endpoint (or confirm we aggregate round matches)
 *
 * Plain HTTPS JSON — runnable on Actions (public internet). No Playwright.
 */

const API = 'https://api-netball.squadi.com'
const ORG = '90ee190a-b612-400c-bc11-3f0e220957a2' // Hampden FNL (from the CF embed)

async function get(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PlayFooty-Rankings/1.0 (hello@playfooty.com.au)', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(25000),
  })
  const text = await res.text()
  if (!res.ok) { console.log(`  HTTP ${res.status} for ${url}\n    ${text.slice(0, 200)}`); return null }
  try { return JSON.parse(text) } catch { console.log(`  non-JSON for ${url}: ${text.slice(0, 200)}`); return null }
}

async function main() {
  console.log('========== SQUADI API PROBE ==========')

  // 1) Year reference — find the current/latest year id
  const years = await get(`${API}/common/common/reference/year?organisationUniqueKey=${ORG}&scope=1`)
  if (Array.isArray(years)) {
    const sorted = years.map((y: any) => ({ id: y.id, desc: y.description })).sort((a, b) => Number(b.desc) - Number(a.desc))
    console.log(`years (latest first): ${sorted.slice(0, 8).map(y => `${y.desc}=id${y.id}`).join(', ')}`)
  }

  // 2) Competitions for the org, across a few recent year ids
  for (const yearId of [9, 8, 7]) {
    const comps = await get(`${API}/livescores/competitions/list?organisationUniqueKey=${ORG}&yearRefId=${yearId}`)
    if (Array.isArray(comps) && comps.length) {
      console.log(`\nyearRefId=${yearId}: ${comps.length} competitions`)
      for (const c of comps.slice(0, 8)) console.log(`   id=${c.id} key=${c.uniqueKey} name="${c.name}" status=${c.statusRefId}`)
    } else {
      console.log(`\nyearRefId=${yearId}: none`)
    }
  }

  // 3) For the most recent Hampden competition, list divisions + try a ladder
  //    Probe both the 2022 comp we know and whatever the latest list returns.
  const latestList = await get(`${API}/livescores/competitions/list?organisationUniqueKey=${ORG}&yearRefId=9`)
    ?? await get(`${API}/livescores/competitions/list?organisationUniqueKey=${ORG}&yearRefId=8`)
  const comp = Array.isArray(latestList) && latestList.length
    ? latestList.find((c: any) => /netball/i.test(c.name) || /football/i.test(c.name)) ?? latestList[0]
    : { id: 498, uniqueKey: '500c1920-b2a2-45d2-9f8c-0dc679134722', name: '2022 Hampden FNL (fallback)' }
  console.log(`\nUsing competition: id=${comp.id} key=${comp.uniqueKey} name="${comp.name}"`)

  const divisions = await get(`${API}/livescores/division?competitionKey=${comp.uniqueKey}`)
  if (Array.isArray(divisions)) {
    console.log(`\ndivisions (${divisions.length}):`)
    for (const d of divisions) console.log(`   id=${d.id} name="${d.name}" divisionName="${d.divisionName}" age=${d.age} grade="${d.grade}"`)
  }

  // 4) Try candidate ladder/standings endpoints for the first senior-looking division
  const senior = Array.isArray(divisions)
    ? divisions.find((d: any) => /a\s*grade|senior|open/i.test(`${d.name} ${d.divisionName} ${d.grade}`) && !/(1[0-9]|[0-9])\s*&?\s*under|mixed|boys|men/i.test(`${d.name}`))
    : null
  console.log(`\nsenior/A-grade division guess: ${senior ? `id=${senior.id} name="${senior.name}"` : '(none matched)'}`)
  const divId = senior?.id ?? (Array.isArray(divisions) && divisions[0]?.id)

  const candidates = [
    `${API}/livescores/ladder?competitionId=${comp.id}&divisionId=${divId}`,
    `${API}/livescores/ladder/web?competitionId=${comp.id}&divisionId=${divId}`,
    `${API}/livescores/teams/ladder?competitionKey=${comp.uniqueKey}&divisionId=${divId}`,
    `${API}/livescores/round/matches?competitionId=${comp.id}&divisionId=${divId}&teamIds=&ignoreStatuses=[1]`,
  ]
  for (const url of candidates) {
    console.log(`\n-- GET ${url}`)
    const data = await get(url)
    if (data) {
      const s = JSON.stringify(data)
      console.log(`   keys: ${Array.isArray(data) ? `array len ${data.length}` : Object.keys(data).join(', ')}`)
      console.log(`   sample: ${s.slice(0, 400)}`)
    }
  }

  console.log('\n========== END SQUADI PROBE ==========')
}

main().catch(e => { console.error('Squadi probe failed:', e); process.exit(1) })
