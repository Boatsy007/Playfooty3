/**
 * Country Footy Scores — Netball Scoreboard probe (diagnostic, writes nothing)
 * ─────────────────────────────────────────────────────────────────────────────
 * We're about to add https://www.countryfootyscores.com/netball-scoreboard.html
 * as a second ladder source. Before writing the adapter we need to know exactly
 * what the page serves: is it static HTML tables or JS-rendered? Does it expose
 * league/round dropdowns or an API? What leagues + teams appear (so we can judge
 * overlap with the PlayHQ data and dedupe)? This dumps all of that.
 *
 * Run under Playwright/Chromium on GitHub Actions (needs real internet).
 */

import { logger } from '../utils/logger.js'

const URL = 'https://www.countryfootyscores.com/netball-scoreboard.html'

export async function probeCountryFooty(): Promise<void> {
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

    const xhr: { url: string; ct: string; sample: string }[] = []
    page.on('response', async r => {
      const ct = r.headers()['content-type'] ?? ''
      const u = r.url()
      if (/google|gstatic|doubleclick|analytics|font|\.css|\.png|\.jpg|\.svg|\.woff/i.test(u)) return
      if (/json|javascript|text\/plain/i.test(ct) && !/\.js($|\?)/.test(u)) {
        let sample = ''
        try { sample = (await r.text()).slice(0, 300).replace(/\s+/g, ' ') } catch { /* ignore */ }
        xhr.push({ url: u, ct, sample })
      }
    })

    console.log(`\n========== COUNTRY FOOTY PROBE ==========`)
    console.log(`URL: ${URL}`)
    try { await page.goto(URL, { waitUntil: 'networkidle', timeout: 45_000 }) }
    catch (e) { console.log(`goto note: ${String(e)}`) }
    await page.waitForTimeout(6000)

    const title = await page.title().catch(() => '')
    const html  = await page.content().catch(() => '')
    console.log(`\nTitle: ${title}`)
    console.log(`Rendered HTML size: ${html.length} chars`)

    // Dropdowns / selectors (league, round, season) ───────────────────────────
    const selects = await page.$$eval('select', els => els.map(s => ({
      id: s.id || s.getAttribute('name') || '(anon)',
      options: Array.from(s.options).slice(0, 40).map(o => `${o.value}=${(o.textContent || '').trim()}`),
    })))
    console.log(`\n<select> dropdowns: ${selects.length}`)
    for (const s of selects) { console.log(`  • ${s.id} (${s.options.length} opts):`); for (const o of s.options.slice(0, 25)) console.log(`      ${o}`) }

    // Tables (ladders/scoreboards) ────────────────────────────────────────────
    const tables = await page.$$eval('table', els => els.slice(0, 6).map(t => {
      const rows = Array.from(t.querySelectorAll('tr')).slice(0, 6)
      return rows.map(r => Array.from(r.querySelectorAll('th,td')).map(c => (c.textContent || '').trim().slice(0, 24)).join(' | '))
    }))
    console.log(`\n<table> count: ${(await page.$$('table')).length}. First tables (up to 6 rows each):`)
    tables.forEach((t, i) => { console.log(`  — table ${i} —`); t.forEach(r => console.log(`      ${r}`)) })

    // iframes (embeds — could be PlayHQ or a widget) ──────────────────────────
    const iframes = await page.$$eval('iframe', els => els.map(f => f.getAttribute('src') || '(no src)'))
    console.log(`\niframes: ${iframes.length}`); iframes.slice(0, 20).forEach(s => console.log(`      ${s}`))

    // Script srcs + any obvious data/API references ───────────────────────────
    const scripts = await page.$$eval('script[src]', els => els.map(s => s.getAttribute('src') || ''))
    console.log(`\nexternal scripts: ${scripts.length}`)
    scripts.filter(s => !/google|gtag|analytics|jquery|bootstrap|font/i.test(s)).slice(0, 25).forEach(s => console.log(`      ${s}`))

    // Links that look like league/competition pages ───────────────────────────
    const links = await page.$$eval('a[href]', els => els.map(a => a.getAttribute('href') || ''))
    const compLinks = [...new Set(links.filter(h => /league|competition|ladder|netball|comp|round|fixture|result/i.test(h)))]
    console.log(`\ncompetition-ish links: ${compLinks.length}`); compLinks.slice(0, 30).forEach(h => console.log(`      ${h}`))
    const hostGroups = new Map<string, number>()
    for (const h of links) { const m = h.match(/^https?:\/\/([^/]+)/); const host = m ? m[1] : '(relative)'; hostGroups.set(host, (hostGroups.get(host) ?? 0) + 1) }
    console.log(`\nlink hosts:`); for (const [h, n] of [...hostGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`      ${String(n).padStart(4)}  ${h}`)

    // Captured XHR/JSON (the real data feed, if any) ──────────────────────────
    console.log(`\nCaptured data responses (json/text): ${xhr.length}`)
    for (const x of xhr.slice(0, 25)) console.log(`      [${x.ct.split(';')[0]}] ${x.url.slice(0, 130)}\n         ${x.sample.slice(0, 160)}`)

    // Visible body text sample (to eyeball league/team names) ─────────────────
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || ''
    console.log(`\nBody text sample (first 1200 chars):\n${bodyText.slice(0, 1200)}`)

    // ── Drill into a few league pages to learn the ladder format ──────────────
    const sampleLeagues = ['/hampden-netball.html', '/north-gippsland-netball.html', '/ballarat-fl-netball.html']
    for (const path of sampleLeagues) {
      const u = `https://www.countryfootyscores.com${path}`
      console.log(`\n---------- LEAGUE PAGE: ${path} ----------`)
      try { await page.goto(u, { waitUntil: 'networkidle', timeout: 45_000 }) }
      catch (e) { console.log(`  goto note: ${String(e)}`); continue }
      await page.waitForTimeout(3500)

      // Headings tell us grade/section names (A Grade, Senior, etc.)
      const heads = await page.$$eval('h1,h2,h3,h4,strong', els => els.map(h => (h.textContent || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 1 && t.length < 60))
      console.log(`  headings: ${[...new Set(heads)].slice(0, 25).join(' | ')}`)

      const lts = await page.$$('table')
      console.log(`  tables: ${lts.length}`)
      const dump = await page.$$eval('table', els => els.slice(0, 8).map(t => {
        const caption = (t.querySelector('caption')?.textContent || t.previousElementSibling?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50)
        const rows = Array.from(t.querySelectorAll('tr')).slice(0, 12)
        return { caption, rows: rows.map(r => Array.from(r.querySelectorAll('th,td')).map(c => (c.textContent || '').trim().slice(0, 20)).join(' | ')) }
      }))
      dump.forEach((t, i) => { console.log(`  — table ${i} — caption="${t.caption}"`); t.rows.forEach(r => console.log(`      ${r}`)) })
    }

    console.log(`\n========== END PROBE ==========\n`)
    logger.info('CountryFootyProbe: complete', { tables: tables.length, selects: selects.length, xhr: xhr.length })
  } finally {
    await browser.close()
  }
}

probeCountryFooty().catch(e => { console.error('Probe failed:', e); process.exit(1) })
