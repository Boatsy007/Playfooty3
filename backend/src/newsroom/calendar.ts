/**
 * Editorial calendar (Phase B3) — backend scheduling only.
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds and reads the recurring publishing plan. No frontend, no auto-publish —
 * this simply records WHEN each article kind is intended to run so a future
 * scheduler (or the weekly engine) can consult it.
 */

import { prisma } from '../db/client.js'

// dayOfWeek: 0=Sun … 6=Sat
const SLOTS: { dayOfWeek: number; slotKey: string; label: string; articleKind: string }[] = [
  { dayOfWeek: 1, slotKey: 'MONDAY_RANKINGS',        label: 'Monday Rankings',        articleKind: 'RANKING_ANALYSIS' },
  { dayOfWeek: 2, slotKey: 'TUESDAY_LEAGUE_ROUNDUPS', label: 'Tuesday League Roundups', articleKind: 'LEAGUE_ANALYSIS' },
  { dayOfWeek: 3, slotKey: 'WEDNESDAY_CLUB_SPOTLIGHTS', label: 'Wednesday Club Spotlights', articleKind: 'CLUB_SPOTLIGHT' },
  { dayOfWeek: 4, slotKey: 'THURSDAY_ANALYSIS',      label: 'Thursday Analysis',      articleKind: 'TOP_PERFORMERS' },
  { dayOfWeek: 5, slotKey: 'FRIDAY_WEEKEND_PREVIEW', label: 'Friday Weekend Preview',  articleKind: 'PREVIEW' },
  { dayOfWeek: 0, slotKey: 'SUNDAY_RESULTS',         label: 'Sunday Results Placeholder', articleKind: 'RESULTS_PLACEHOLDER' },
]

/** Idempotently seed the editorial calendar. Safe to call every run. */
export async function seedEditorialCalendar(): Promise<{ seeded: number }> {
  let seeded = 0
  for (const s of SLOTS) {
    await prisma.editorialCalendarSlot.upsert({
      where: { slotKey: s.slotKey },
      create: { ...s, enabled: true },
      update: { dayOfWeek: s.dayOfWeek, label: s.label, articleKind: s.articleKind },
    })
    seeded++
  }
  return { seeded }
}

export async function getEditorialCalendar() {
  return prisma.editorialCalendarSlot.findMany({ orderBy: { dayOfWeek: 'asc' } })
}
