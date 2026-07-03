/**
 * NetballConnect livescore widget probe (diagnostic, no DB writes)
 * ─────────────────────────────────────────────────────────────────────────────
 * Country Footy embeds NetballConnect's livescore SPA, whose Squadi API is
 * auth-gated (401 to plain fetch). This renders the widget in a real browser
 * (which authenticates itself) so we can:
 *   • capture the Authorization token the SPA sends to api-netball.squadi.com
 *     (unblocks calling the API directly), and
 *   • find + dump the Ladder/standings view it renders (unblocks DOM scraping),
 *   • see the division/grade labels so we can pick the top open women's grade.
 *
 * We drive TWO urls: the exact (stale-2022) embed from Country Footy, and the
 * same org's livescore landing (which the SPA may default to the current season).
 */

const HAMPDEN_EMBED =
  'https://registration.netballconnect.com/livescoreSeasonFixture?organisationKey=90ee190a-b612-400c-bc11-3f0e220957a2&competitionId=498&yearId=7&competitionUniqueKey=500c1920-b2a2-45d2-9f8c-0dc679134722&divisionId=All'
const HAMPDEN_LIVESCORE =
  'https://registration.netballconnect.com/liveScore?organisationKey=90ee190a-b612-400c-bc11-3f0e220957a2'

async function drive(url: string) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' })
    const page = await ctx.newPage()

    const apiCalls: { url: string; auth: string; sample: string }[] = []
    page.on('request', req => {
      const u = req.url()
      if (!/squadi\.com/.test(u)) return
      const h = req.headers()
      apiCalls.push({ url: u, auth: (h['authorization'] || h['Authorization'] || '').slice(0, 40), sample: '' })
    })
    page.on('response', async r => {
      if (!/squadi\.com/.test(r.url())) return
      const ct = r.headers()['content-type'] ?? ''
      if (!ct.includes('json')) return
      const hit = apiCalls.find(a => a.url === r.url() && !a.sample)
      if (hit) { try { hit.sample = (await r.text()).slice(0, 220).replace(/\s+/g, ' ') } catch { /* */ } }
    })

    console.log(`\n########## WIDGET: ${url.slice(0, 90)} ##########`)
    try { await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 }) } catch (e) { console.log(`  goto: ${String(e)}`) }
    await page.waitForTimeout(8000)

    // Tab/nav labels the SPA offers (Fixtures / Ladder / Results …)
    const tabs = await page.$$eval('a,button,[role="tab"],.ant-tabs-tab,li', els =>
      [...new Set(els.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 1 && t.length < 30))]
        .filter(t => /ladder|fixture|result|standing|round|grade|division|team|open|senior|final/i.test(t)))
    console.log(`  tabs/labels: ${tabs.slice(0, 40).join(' | ')}`)

    // Try to open a Ladder view
    for (const label of ['Ladder', 'Ladders', 'Standings']) {
      const el = page.getByText(label, { exact: false }).first()
      if (await el.count() > 0) { try { await el.click({ timeout: 3000 }); console.log(`  clicked "${label}"`); await page.waitForTimeout(5000); break } catch { /* */ } }
    }

    // Dump tables across all frames
    for (const fr of [page, ...page.frames()]) {
      const rows = await (fr as any).$$eval('table tr', (trs: any[]) => trs.slice(0, 16).map(r => Array.from(r.querySelectorAll('th,td')).map((c: any) => (c.textContent || '').trim().slice(0, 16)).join(' | '))).catch(() => [])
      if (rows.length) { console.log(`  — table rows (${(fr as any).url ? (fr as any).url() : 'main'}):`); rows.forEach((r: string) => console.log(`      ${r}`)) }
    }

    console.log(`  squadi requests: ${apiCalls.length}`)
    const withAuth = apiCalls.find(a => a.auth)
    console.log(`  auth header present: ${!!withAuth}${withAuth ? ` e.g. "${withAuth.auth}…"` : ''}`)
    for (const a of apiCalls.slice(0, 18)) console.log(`      ${a.url.slice(0, 120)}${a.sample ? `\n         ${a.sample.slice(0, 140)}` : ''}`)

    console.log(`########## END WIDGET ##########`)
  } finally { await browser.close() }
}

async function main() {
  await drive(HAMPDEN_LIVESCORE)
  await drive(HAMPDEN_EMBED)
}
main().catch(e => { console.error('Widget probe failed:', e); process.exit(1) })
