/**
 * Championship Hub UI.
 * Future-facing public teaser only — no registrations, draws, payments or tournament systems.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, HelpCircle, ListOrdered, MapPinned, Sparkles, Trophy, Users } from 'lucide-react'
import Nav from '../components/layout/Nav'
import Footer from '../components/layout/Footer'
import { useSeo } from '../lib/seo'

const NAVY = '#062a5f'
const NAVY_2 = '#0b3f86'
const PINK = '#ff2c91'
const GOLD = '#f4c14d'
const TEXT = '#111827'
const MUTED = '#65758b'
const LINE = '#dbe3ee'

const FORMAT_CARDS = [
  { icon: ListOrdered, title: 'National rankings pathway', body: 'The long-term concept is for rankings to help identify leading country netball clubs when a championship model is ready.' },
  { icon: Trophy, title: 'Invited clubs', body: 'Future invitations would be based on transparent criteria. No invitation process is currently open.' },
  { icon: Sparkles, title: 'Wildcards', body: 'Wildcard ideas may help recognise clubs on the edge of the national picture, but no wildcard system is live.' },
  { icon: Users, title: 'Regional representation', body: 'The future event concept is built around giving country and regional competitions national visibility.' },
  { icon: MapPinned, title: 'National event concept', body: 'A destination-style national event remains a future concept, not a confirmed fixture or travel package.' },
]

const PATHWAYS = [
  { title: 'National Rankings', body: 'See the current national ladder that Go Netty is focused on now.', to: '/rankings' },
  { title: 'League Rankings', body: 'Explore competition strength and league hubs around Australia.', to: '/leagues' },
  { title: 'Clubs', body: 'Browse club profiles, form and ranking movement.', to: '/directory' },
  { title: 'News', body: 'Follow ranking updates, league stories and country netball coverage.', to: '/news' },
]

const FAQS = [
  { q: 'Is the championship live yet?', a: 'No. The Championship Hub is a future-facing public teaser. Registrations, fixtures, draws and tournament operations are not currently live.' },
  { q: 'How will teams qualify?', a: 'Qualification rules have not been launched. Go Netty is rankings-first now, and any future pathway would be announced clearly before clubs are asked to act.' },
  { q: 'Will rankings matter?', a: 'The intention is that national rankings help identify leading country netball clubs over time, but no live qualification logic is currently operating.' },
  { q: 'Can clubs register now?', a: 'No. Club registration is not open. There are no payments, nomination forms or tournament management tools connected to this hub.' },
]

export default function Championship() {
  useSeo({
    title: 'Country Netball Championship — Coming Soon | Go Netty',
    description: 'A future-facing public hub for the Country Netball Championship concept. Go Netty is rankings-first now; championship registrations, fixtures and qualification are not live.',
    path: '/championship',
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Country Netball Championship — Coming Soon', description: 'Future-facing championship teaser for Australian country netball.' },
  })

  return (
    <div className="champ-page">
      <Nav />
      <main>
        <section className="champ-hero">
          <div className="champ-hero-copy">
            <span className="champ-live"><CalendarDays size={15} /> Coming soon</span>
            <h1>Country Netball Championship</h1>
            <p className="hero-lead">A future national country netball championship concept, built around the rankings-first platform Go Netty is creating today.</p>
            <div className="hero-actions">
              <button className="btn-primary" type="button" aria-disabled="true">Join updates · coming soon</button>
              <Link className="btn-secondary" to="/rankings">View rankings <ArrowRight size={16} /></Link>
              <Link className="btn-secondary" to="/directory">Browse clubs <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div className="countdown-card" aria-label="Championship status">
            <span>Status</span>
            <strong>Not live</strong>
            <p>No event date, venue, teams, registration or fixtures have been announced.</p>
          </div>
        </section>

        <section className="champ-section why-section">
          <div className="section-kicker">Why it exists</div>
          <div className="why-grid">
            <h2>Rankings first. Championship later.</h2>
            <div>
              <p>Go Netty is focused on building the most credible national picture of country netball through rankings, league strength, club profiles and weekly movement.</p>
              <p>The Championship is a future-facing idea: a way for that rankings ecosystem to eventually support a national event without pretending the event infrastructure is live today.</p>
            </div>
          </div>
        </section>

        <section className="champ-section">
          <SectionHead eyebrow="Future format" title="Concept cards" text="These are possible future championship concepts only — not live systems." />
          <div className="format-grid">
            {FORMAT_CARDS.map(card => <FormatCard key={card.title} {...card} />)}
          </div>
        </section>

        <section className="champ-section pathway-section">
          <SectionHead eyebrow="Current pathway" title="Follow the live platform now" text="Until championship details are real, the best pathway is to follow rankings, leagues, clubs and news." />
          <div className="pathway-grid">
            {PATHWAYS.map(item => <Link key={item.title} to={item.to} className="pathway-card"><strong>{item.title}</strong><p>{item.body}</p><span>Open <ArrowRight size={14} /></span></Link>)}
          </div>
        </section>


        <section className="champ-section faq-section">
          <SectionHead eyebrow="FAQ" title="What clubs need to know" text="Clear answers for a future-facing championship hub." />
          <div className="faq-grid">
            {FAQS.map(item => <article key={item.q} className="faq-card"><HelpCircle size={20} /><h3>{item.q}</h3><p>{item.a}</p></article>)}
          </div>
        </section>
      </main>
      <Footer />
      <ChampionshipStyles />
    </div>
  )
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className="section-head"><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>
}

function FormatCard({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return <article className="format-card"><div><Icon size={24} /></div><h3>{title}</h3><p>{body}</p></article>
}

function ChampionshipStyles() {
  return <style>{`
    .champ-page{background:#fff;color:${TEXT};min-height:100vh}.champ-hero{max-width:1180px;margin:0 auto;padding:34px 20px 30px;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:22px;align-items:stretch}.champ-hero-copy{position:relative;overflow:hidden;border:1px solid ${LINE};border-radius:28px;padding:clamp(28px,5vw,54px);background:linear-gradient(135deg,#fff,#f7faff);box-shadow:0 18px 48px rgba(6,42,95,.1)}.champ-hero-copy:after{content:"";position:absolute;right:-70px;bottom:-90px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(255,44,145,.14),transparent 68%)}.champ-live{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:${NAVY};color:#fff;padding:8px 12px;text-transform:uppercase;letter-spacing:.16em;font:900 11px/1 var(--font-condensed,inherit)}.champ-hero h1{position:relative;margin:18px 0 15px;color:${NAVY};font:950 clamp(3.3rem,8.5vw,7.2rem)/.82 var(--font-display,inherit);letter-spacing:-.075em;text-transform:uppercase;max-width:820px}.hero-lead{position:relative;margin:0;color:#42526a;font-size:clamp(1rem,1.8vw,1.25rem);line-height:1.6;max-width:660px}.hero-actions{position:relative;display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}.btn-primary,.btn-secondary{min-height:46px;border-radius:999px;padding:0 18px;display:inline-flex;align-items:center;gap:8px;font-weight:950;text-transform:uppercase;letter-spacing:.1em;font-size:12px;text-decoration:none}.btn-primary{border:0;background:${PINK};color:#fff;cursor:not-allowed}.btn-secondary{border:1px solid ${NAVY};color:${NAVY};background:#fff}.countdown-card{border-radius:28px;padding:24px;background:linear-gradient(135deg,#071832,${NAVY_2});color:#fff;display:flex;flex-direction:column;justify-content:flex-end;min-height:360px;box-shadow:0 18px 48px rgba(6,42,95,.16)}.countdown-card span,.section-kicker,.section-head span,.partner-section span{color:${PINK};font:950 11px/1 var(--font-condensed,inherit);letter-spacing:.18em;text-transform:uppercase}.countdown-card strong{display:block;margin:16px 0 12px;font:950 clamp(4rem,9vw,7rem)/.8 var(--font-display,inherit);letter-spacing:-.08em;color:${GOLD}}.countdown-card p{margin:0;color:#bfd0e5;line-height:1.55}.champ-section{max-width:1180px;margin:0 auto;padding:28px 20px}.why-section{border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}}.why-grid{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(0,1.2fr);gap:24px;align-items:start}.why-grid h2,.section-head h2,.partner-section h2{margin:10px 0 0;color:${NAVY};font:950 clamp(2.3rem,5vw,4.8rem)/.86 var(--font-display,inherit);letter-spacing:-.06em;text-transform:uppercase}.why-grid p{margin:0 0 14px;color:#42526a;font-size:17px;line-height:1.65}.section-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:16px}.section-head p{margin:0;color:${MUTED};max-width:540px;line-height:1.55}.format-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.format-card{border:1px solid ${LINE};border-radius:20px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.07);padding:18px;min-height:230px}.format-card div{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:rgba(255,44,145,.1);color:${PINK};margin-bottom:18px}.format-card h3{margin:0 0 10px;color:${NAVY};font-size:22px;line-height:.95;text-transform:uppercase;letter-spacing:-.04em}.format-card p,.pathway-card p,.partner-section p,.faq-card p{margin:0;color:${MUTED};line-height:1.55;font-size:14px}.pathway-section{padding-top:18px}.pathway-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.pathway-card{border:1px solid ${LINE};border-radius:20px;background:#fff;color:${TEXT};box-shadow:0 14px 34px rgba(6,42,95,.07);padding:18px;text-decoration:none;display:flex;flex-direction:column;gap:10px;min-height:180px;transition:transform .18s ease,box-shadow .18s ease}.pathway-card:hover{transform:translateY(-2px);box-shadow:0 20px 40px rgba(6,42,95,.12)}.pathway-card strong{color:${NAVY};font:950 24px/.95 var(--font-display,inherit);text-transform:uppercase}.pathway-card span{margin-top:auto;display:inline-flex;align-items:center;gap:7px;color:${PINK};font-weight:950;text-transform:uppercase;font-size:12px;letter-spacing:.1em}.partner-section{max-width:1140px;margin:22px auto;padding:26px;display:flex;justify-content:space-between;gap:20px;align-items:center;border-radius:28px;background:linear-gradient(135deg,#071832,${NAVY});color:#fff}.partner-section h2{color:#fff;margin-bottom:12px}.partner-section p{color:#bfd0e5;max-width:700px}.partner-section svg{color:${GOLD};flex-shrink:0}.faq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.faq-card{border:1px solid ${LINE};border-radius:20px;background:#fff;box-shadow:0 14px 34px rgba(6,42,95,.07);padding:18px}.faq-card svg{color:${PINK};margin-bottom:10px}.faq-card h3{margin:0 0 8px;color:${NAVY};font-size:21px;line-height:1;text-transform:uppercase}@media(max-width:980px){.champ-hero,.why-grid{grid-template-columns:1fr}.countdown-card{min-height:240px}.section-head{display:block}.format-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pathway-grid,.faq-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.champ-hero,.champ-section{padding-left:14px;padding-right:14px}.champ-hero-copy,.countdown-card,.partner-section{border-radius:20px}.format-grid,.pathway-grid,.faq-grid{grid-template-columns:1fr}.partner-section{margin:18px 14px;display:block}.partner-section svg{margin-top:18px}.btn-primary,.btn-secondary{width:100%;justify-content:center}.champ-hero h1{font-size:clamp(3.2rem,18vw,5.8rem)}}
  `}</style>
}
