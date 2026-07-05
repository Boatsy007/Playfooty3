/** CLI: generate weekly article drafts from the latest ranking run. */
import { prisma } from '../db/client.js'
import { generateWeeklyDrafts } from './generate-articles.js'

async function main() {
  const r = await generateWeeklyDrafts()
  console.log('\n═══ ARTICLE GENERATION ═══')
  console.log(`Week ${r.weekLabel ?? '—'}: ${r.created} created, ${r.updated} updated, ${r.skipped} skipped (already approved/published)`)
  for (const d of r.drafts) console.log(`  · [${d.kind}] ${d.title}`)
  console.log('Review, approve and publish in the admin portal → AI Publishing.')
  await prisma.$disconnect()
}
main().catch(async e => { console.error('Article generation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
