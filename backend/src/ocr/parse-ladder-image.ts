/**
 * Ladder image OCR via Claude vision (no SDK — direct Messages API)
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends a ladder screenshot (Facebook/Instagram graphic, PNG/JPG, photo) to
 * Claude and gets back a structured ladder + a best-guess league name. Reads
 * every column that is present (position, team, played, W/L/D, goals for/
 * against, percentage, points) and omits ones the image doesn't show.
 *
 * Requires ANTHROPIC_API_KEY. Model via ANTHROPIC_MODEL (default claude-opus-4-8).
 */

const API = 'https://api.anthropic.com/v1/messages'

export interface OcrLadderRow {
  position?: number; team: string; played?: number; wins?: number; losses?: number
  draws?: number; goalsFor?: number; goalsAgainst?: number; percentage?: number; points?: number
}
export interface OcrLadderResult {
  league: string | null
  grade:  string | null
  rows:   OcrLadderRow[]
  notes:  string | null
}

const PROMPT = `You are reading an Australian country netball LADDER (standings table) from an image.
Extract it EXACTLY as shown. Return ONLY valid minified JSON, no prose, shaped:
{"league": string|null, "grade": string|null, "rows": [{"position": number, "team": string, "played": number, "wins": number, "losses": number, "draws": number, "goalsFor": number, "goalsAgainst": number, "percentage": number, "points": number}], "notes": string|null}
Rules:
- One object per ladder row, in ladder order.
- "team" is the club/team name exactly as printed.
- Include only the numeric columns actually visible; omit any key you cannot read (do NOT guess).
- "goalsFor"/"goalsAgainst" map to For/Against (F/A) goal columns; "percentage" is the % column.
- "league" = the league/competition name if visible (e.g. "Hampden", "Gippsland League"), else null.
- "grade" = the grade if shown (e.g. "A Grade"), else null.
- If the image is not a ladder, return {"league":null,"grade":null,"rows":[],"notes":"not a ladder"}.`

/** Parse a `data:image/...;base64,...` URL or raw base64 into parts. */
function imageSource(image: string): { media_type: string; data: string } {
  const m = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/)
  if (m) return { media_type: m[1], data: m[2] }
  return { media_type: 'image/png', data: image.replace(/^base64,/, '') }
}

export async function parseLadderImage(image: string): Promise<OcrLadderResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured')
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8'
  const src = imageSource(image)

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: src.media_type, data: src.data } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const body = await res.json() as { content?: { type: string; text?: string }[] }
  const text = (body.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('').trim()
  const json = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let parsed: OcrLadderResult
  try { parsed = JSON.parse(json) } catch { throw new Error(`Vision returned non-JSON: ${text.slice(0, 200)}`) }

  // Normalise + sanity-check.
  const rows = (parsed.rows ?? [])
    .filter(r => r && typeof r.team === 'string' && r.team.trim().length > 0)
    .map((r, i) => ({ ...r, team: r.team.trim(), position: r.position ?? i + 1 }))
  return { league: parsed.league ?? null, grade: parsed.grade ?? null, rows, notes: parsed.notes ?? null }
}
