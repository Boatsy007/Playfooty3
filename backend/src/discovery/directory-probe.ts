/**
 * PlayHQ Directory Probe (diagnostic — writes nothing to the DB)
 * ─────────────────────────────────────────────────────────────────────────────
 * The association directory crawl started returning 0 associations, which caps
 * national coverage. PlayHQ almost certainly changed its markup or moved the
 * listing behind a search API. This probe loads the directory page and dumps
 * enough structure to derive the new selector / endpoint:
 *   • page title + rendered HTML size
 *   • every anchor href, grouped by path prefix (so we see the new org path)
 *   • counts for a range of candidate selectors
 *   • all captured JSON/XHR response URLs
 *   • association-shaped objects found anywhere in captured JSON
 *
 * Run under Playwright/Chromium on GitHub Actions (needs real internet).
 */

import { logger } from '../utils/logger.js'

const URL = 'https://www.playhq.com/netball-australia?page=1&types=ASSOCIATION'

export async function probeDirectory(): Promise<void> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  })
  try {
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()

    const jsonUrls: string[] = []
    const jsonBlobs: { url: string; json: unknown }[] = []
    page.on('response', async r => {
      const ct = r.headers()['content-type'] ?? ''
      if (!ct.includes('json')) return
      const u = r.url()
      if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs|sentry|pbstck|adtrafficquality/.test(u)) return
      jsonUrls.push(u)
      try { jsonBlobs.push({ url: u, json: await r.json() }) } catch { /* ignore */ }
    })

    console.log(`\n========== DIRECTORY PROBE ==========`)
    console.log(`URL: ${URL}`)
    try { await page.goto(URL, { waitUntil: 'networkidle', timeout: 45_000 }) }
    catch (e) { console.log(`goto note: ${String(e)}`) }
    await page.waitForTimeout(6000)

    // Scroll to trigger any lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {})
    await page.waitForTimeout(3000)

    const title = await page.title().catch(() => '')
    const html  = await page.content().catch(() => '')
    console.log(`\nTitle: ${title}`)
    console.log(`Rendered HTML size: ${html.length} chars`)

    // ── Anchor analysis ──────────────────────────────────────────────────────
    const hrefs = await page.$$eval('a[href]', els => els.map(e => (e as HTMLAnchorElement).getAttribute('href') || ''))
    console.log(`\nTotal anchors: ${hrefs.length}`)
    const prefixCounts = new Map<string, number>()
    for (const h of hrefs) {
      const path = h.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
      const seg = path.split('/').slice(0, 4).join('/')
      prefixCounts.set(seg, (prefixCounts.get(seg) ?? 0) + 1)
    }
    console.log(`\nAnchor path prefixes (top 30):`)
    for (const [p, n] of [...prefixCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
      console.log(`  ${String(n).padStart(4)}  ${p}`)
    }

    // ── Candidate selector counts ────────────────────────────────────────────
    const selectors = [
      'a[href*="/netball-australia/org/"]',
      'a[href*="/org/"]',
      'a[href*="/organisations/"]',
      'a[href*="/association"]',
      '[data-testid*="card"]',
      '[class*="Card"]',
      '[class*="result"]',
      'li a',
      'article a',
    ]
    console.log(`\nCandidate selector counts:`)
    for (const s of selectors) {
      const c = await page.locator(s).count().catch(() => -1)
      console.log(`  ${String(c).padStart(4)}  ${s}`)
    }

    // Sample the first 15 org-ish anchors with their text
    const sample = await page.$$eval('a[href*="/org"]', els =>
      els.slice(0, 15).map(e => ({ href: (e as HTMLAnchorElement).getAttribute('href') || '', text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) })))
    console.log(`\nSample /org anchors (${sample.length}):`)
    for (const s of sample) console.log(`  ${s.href}  ::  ${s.text}`)

    // ── Captured JSON ────────────────────────────────────────────────────────
    console.log(`\nCaptured JSON responses: ${jsonUrls.length}`)
    for (const u of [...new Set(jsonUrls)].slice(0, 40)) console.log(`  ${u.slice(0, 140)}`)

    // Look for association-shaped arrays in captured JSON
    console.log(`\nAssociation-shaped objects in JSON:`)
    let found = 0
    const visit = (node: unknown, depth: number): void => {
      if (found > 20 || depth > 9) return
      if (Array.isArray(node)) { node.forEach(n => visit(n, depth + 1)); return }
      if (node && typeof node === 'object') {
        const o = node as Record<string, unknown>
        const keys = Object.keys(o).map(k => k.toLowerCase())
        if ((keys.includes('name') || keys.includes('title')) &&
            (keys.some(k => /slug|url|tenant|organisation|association/.test(k)))) {
          const name = o.name ?? o.title
          const slug = o.slug ?? o.url ?? o.tenant
          if (typeof name === 'string' && name.length < 80) {
            console.log(`  { name: ${JSON.stringify(name)}, keys: [${Object.keys(o).slice(0, 10).join(', ')}] }  slug≈${JSON.stringify(slug)}`)
            found++
          }
        }
        for (const v of Object.values(o)) visit(v, depth + 1)
      }
    }
    jsonBlobs.forEach(b => visit(b.json, 0))
    if (found === 0) console.log('  (none found — listing likely server-rendered or behind a different endpoint)')

    // Also: does __NEXT_DATA__ exist?
    const hasNext = await page.locator('script#__NEXT_DATA__').count().catch(() => 0)
    console.log(`\n__NEXT_DATA__ script present: ${hasNext > 0}`)
    if (hasNext > 0) {
      const nd = await page.locator('script#__NEXT_DATA__').textContent().catch(() => '')
      console.log(`__NEXT_DATA__ size: ${(nd ?? '').length} chars`)
      const m = (nd ?? '').match(/"slug":"[^"]+"/g)
      console.log(`slugs in __NEXT_DATA__: ${m ? m.length : 0}${m ? ' — e.g. ' + m.slice(0, 8).join(', ') : ''}`)
    }

    console.log(`\n========== END PROBE ==========\n`)
    logger.info('DirectoryProbe: complete', { anchors: hrefs.length, jsonResponses: jsonUrls.length })
  } finally {
    await browser.close()
  }
}

probeDirectory().catch(e => { console.error('Probe failed:', e); process.exit(1) })
