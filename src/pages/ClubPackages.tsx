import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  CheckCircle, Users, FileText, Building, Plane, Bus, Star,
  Trophy, Ticket, Heart, Clock, ChevronDown, ChevronRight, MapPin,
  Utensils, Camera, Waves, ShoppingBag, Plus, ArrowRight, Calendar,
  Zap
} from 'lucide-react'
import Nav from '../components/layout/Nav'
import Ticker from '../components/layout/Ticker'
import Footer from '../components/layout/Footer'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

// ─── Why Book Through CNCA ──────────────────────────────────────────────────
const benefits = [
  { icon: FileText,     title: 'One Organiser',              desc: 'Your club deals with one contact for the entire trip — accommodation, transport, activities and more.',  accent: '#ff2c91' },
  { icon: FileText,     title: 'One Invoice',                desc: 'One clean invoice for the entire club package. No chasing multiple suppliers across the Gold Coast.',    accent: '#f4c14d' },
  { icon: Building,     title: 'Official Partners',          desc: 'Every accommodation partner is vetted, approved and exclusive to CNCA clubs. No surprises.',            accent: '#ff2c91' },
  { icon: Star,         title: 'Exclusive Club Rates',       desc: 'Group rates unavailable to the public. Your club saves money and travels better.',                       accent: '#4dd9f4' },
  { icon: Plane,        title: 'Airport Transfers',          desc: 'Seamless arrival and departure transfers from Gold Coast Airport for your entire group.',                 accent: '#f4c14d' },
  { icon: Bus,          title: 'Team Transport',             desc: 'Dedicated team transport between accommodation and the championship venue throughout the weekend.',        accent: '#ff2c91' },
  { icon: Ticket,       title: 'Theme Park Discounts',       desc: 'Exclusive group pricing at Movie World, Dreamworld, Wet\'n\'Wild and Sea World for the whole club.',     accent: '#4dd9f4' },
  { icon: Trophy,       title: 'Awards Night Tickets',       desc: 'Your club package includes tickets to the CNCA Awards Night — the centrepiece of the weekend.',          accent: '#f4c14d' },
  { icon: Clock,        title: 'Priority Booking',           desc: 'Club packages are booked first. Earlier confirmation means better rates and better availability.',        accent: '#ff2c91' },
  { icon: Heart,        title: 'Less Work for Volunteers',   desc: 'Stop the committee from running a travel agency. We handle it so they can enjoy the weekend.',           accent: '#f4c14d' },
]

// ─── Package Builder ─────────────────────────────────────────────────────────
const builderSteps = [
  {
    label: 'Group Size',
    key: 'size',
    options: ['20 – 40 people', '40 – 80 people', '80 – 120 people', '120+ people'],
  },
  {
    label: 'Accommodation',
    key: 'accommodation',
    options: ['Hotel', 'Apartments', 'Holiday Park', 'Luxury Resort'],
  },
  {
    label: 'Transport',
    key: 'transport',
    options: ['Flights', 'Coach', 'Airport Transfers', 'Rental Vehicles'],
    multi: true,
  },
  {
    label: 'Activities',
    key: 'activities',
    options: ['Movie World', 'Dreamworld', 'Wet\'n\'Wild', 'TopGolf', 'Surf Lessons', 'Harbour Cruise', 'Shopping', 'Private Club Dinner'],
    multi: true,
  },
  {
    label: 'Meals',
    key: 'meals',
    options: ['Breakfast', 'Lunch', 'Dinner', 'Function Packages'],
    multi: true,
  },
  {
    label: 'Championship Extras',
    key: 'extras',
    options: ['Opening Function', 'Awards Night', 'Official Merchandise', 'VIP Seating'],
    multi: true,
  },
  {
    label: 'Preferred Budget',
    key: 'budget',
    options: ['Value', 'Comfortable', 'Premium', 'Luxury — No Limits'],
  },
]

// ─── Hotels ──────────────────────────────────────────────────────────────────
const hotels = [
  {
    name: 'Surfers Paradise Marriott',
    type: 'Luxury Hotel',
    stars: 5,
    venueKm: '2.4',
    beachKm: '0.1',
    features: ['Pool', 'Breakfast', 'Parking', 'Club Friendly'],
    accent: '#ff2c91',
  },
  {
    name: 'RACV Royal Pines Resort',
    type: 'Resort & Conference',
    stars: 5,
    venueKm: '1.8',
    beachKm: '3.2',
    features: ['Pool', 'Restaurant', 'Conference', 'Golf'],
    accent: '#f4c14d',
  },
  {
    name: 'Mantra on View',
    type: 'Apartment Hotel',
    stars: 4,
    venueKm: '3.1',
    beachKm: '0.3',
    features: ['Pool', 'Kitchenette', 'Parking', 'Family Rooms'],
    accent: '#4dd9f4',
  },
  {
    name: 'Broadbeach Island Apartments',
    type: 'Self-Contained',
    stars: 4,
    venueKm: '2.8',
    beachKm: '0.4',
    features: ['Full Kitchen', 'Laundry', 'BBQ', 'Balconies'],
    accent: '#ff2c91',
  },
  {
    name: 'Gold Coast Holiday Park',
    type: 'Holiday Park',
    stars: 3,
    venueKm: '4.2',
    beachKm: '0.8',
    features: ['Cabins', 'Pool', 'Communal BBQ', 'Budget Friendly'],
    accent: '#f4c14d',
  },
  {
    name: 'Peppers Soul Surfers Paradise',
    type: 'Ultra Luxury',
    stars: 5,
    venueKm: '2.2',
    beachKm: '0.05',
    features: ['Infinity Pool', 'Spa', 'Concierge', 'Beachfront'],
    accent: '#4dd9f4',
  },
]

// ─── Experiences ─────────────────────────────────────────────────────────────
const experiences = [
  { title: 'Movie World',     cat: 'Theme Park',    icon: Star,       accent: '#f4c14d', desc: 'Hollywood blockbuster rides, shows and characters. The Gold Coast\'s most iconic theme park — a full day for all ages.' },
  { title: 'Dreamworld',      cat: 'Theme Park',    icon: Zap,        accent: '#ff2c91', desc: 'Australia\'s biggest theme park. Thrill rides, Tiger Island and BigBaby Tom. Massive fun for the whole club.' },
  { title: 'Wet\'n\'Wild',    cat: 'Water Park',    icon: Waves,      accent: '#4dd9f4', desc: 'Australia\'s largest waterpark. Slides, wave pools and lazy rivers — perfect for a warm October day.' },
  { title: 'TopGolf',         cat: 'Entertainment', icon: Trophy,     accent: '#f4c14d', desc: 'Multi-level driving range with food, drinks and serious fun. The go-to for club nights out — golfer or not.' },
  { title: 'Surf Lessons',    cat: 'Beach',         icon: Waves,      accent: '#4dd9f4', desc: 'Learn to ride the Gold Coast\'s famous breaks with qualified instructors. A memorable experience for any club.' },
  { title: 'Whale Watching',  cat: 'Marine',        icon: Camera,     accent: '#ff2c91', desc: 'October is peak whale season. Witness humpbacks on a guided ocean cruise — unforgettable for families.' },
  { title: 'SkyPoint',        cat: 'Attraction',    icon: MapPin,     accent: '#f4c14d', desc: 'Climb to the top of the Q1 tower — 270° views of the Gold Coast, hinterland and Pacific Ocean from 230m.' },
  { title: 'Harbour Cruises', cat: 'Waterway',      icon: Waves,      accent: '#4dd9f4', desc: 'Explore the stunning Broadwater by boat. Sunset cruises, island transfers and private charter options.' },
  { title: 'Pacific Fair',    cat: 'Shopping',      icon: ShoppingBag,accent: '#ff2c91', desc: 'Australia\'s biggest fashion destination. 400+ stores, restaurants and entertainment — a full day on its own.' },
  { title: 'Mini Golf',       cat: 'Entertainment', icon: Trophy,     accent: '#f4c14d', desc: 'Putt Putt Golf at Mermaid Beach — a CNCA classic for clubs wanting a fun, competitive afternoon together.' },
  { title: 'Escape Rooms',    cat: 'Entertainment', icon: Zap,        accent: '#ff2c91', desc: 'Team bonding at its finest. Work together to solve puzzles and beat the clock — perfect for club groups.' },
  { title: 'Karting',         cat: 'Motorsport',    icon: Zap,        accent: '#4dd9f4', desc: 'Race your teammates at Slideways Go Karting — great fun and fierce competition guaranteed.' },
]

// ─── Dining ──────────────────────────────────────────────────────────────────
const dining = [
  { title: 'Steakhouse',        sub: 'Argentine Grill & Australian Beef', desc: 'Premium cuts, open flames and a dining room that understands a hungry club. Perfect for the post-match dinner.', accent: '#f4c14d' },
  { title: 'Beachfront',        sub: 'Oceanside Breakfast & Brunch',      desc: 'Start the day with the Pacific at your feet. Fresh juices, big breakfasts and coffee worth the walk.', accent: '#4dd9f4' },
  { title: 'Italian',           sub: 'Pasta, Pizza & Wine',                desc: 'Shared plates, great wine and the kind of atmosphere that turns dinner into a three-hour celebration.', accent: '#ff2c91' },
  { title: 'Buffet',            sub: 'Club-Friendly Group Dining',         desc: 'Feed the whole club without the hassle. Premium buffet options for large groups with dietary requirements covered.', accent: '#f4c14d' },
  { title: 'Awards Dinner',     sub: 'Private Function Room',              desc: 'A dedicated private dining space for your club\'s official CNCA celebration. Setup, AV and menu all included.', accent: '#ff2c91' },
  { title: 'Sunset Dining',     sub: 'Rooftop Bar & Restaurant',           desc: 'Watch the Gold Coast sun disappear into the hinterland over drinks and a premium shared menu.', accent: '#4dd9f4' },
]

// ─── Transport ───────────────────────────────────────────────────────────────
const transport = [
  { icon: Plane,  title: 'Airport Transfers',  desc: 'Private coaches and minibuses from Gold Coast Airport directly to your accommodation. No confusion, no delays.', accent: '#ff2c91' },
  { icon: Bus,    title: 'Private Coaches',     desc: 'Dedicated coaches for large club groups. Fully managed transfers between accommodation, the venue and activities.', accent: '#f4c14d' },
  { icon: Users,  title: 'Mini Buses',          desc: 'Flexible mini-bus options for smaller group movement. Split the club into activity groups with ease.', accent: '#4dd9f4' },
  { icon: MapPin, title: 'Club Shuttle',        desc: 'Regular shuttle service running between your hotel and the championship precinct throughout the event.', accent: '#ff2c91' },
]

// ─── Itinerary ───────────────────────────────────────────────────────────────
const itinerary = [
  {
    day: 'Friday',
    date: '7 Oct',
    label: 'Arrival Day',
    accent: '#ff2c91',
    events: [
      { time: 'Morning',   label: 'Flights Arrive', desc: 'Club lands at Gold Coast Airport — transfers waiting.' },
      { time: 'Midday',    label: 'Check In',       desc: 'Settle into your accommodation and get your bearings.' },
      { time: 'Afternoon', label: 'Beach Walk',     desc: 'First swim, first coffee, first Gold Coast moment.' },
      { time: 'Evening',   label: 'Welcome Function', desc: 'Official CNCA opening event. Meet the clubs, feel the energy.' },
    ],
  },
  {
    day: 'Saturday',
    date: '8 Oct',
    label: 'Championship Day 1',
    accent: '#f4c14d',
    events: [
      { time: 'Morning',   label: 'Championship Begins', desc: 'Pool play opens. Club on court. Supporters into the precinct.' },
      { time: 'Midday',    label: 'Food Village',        desc: 'Championship food zone open all day. Live entertainment between matches.' },
      { time: 'Afternoon', label: 'More Pool Play',      desc: 'The competition heats up. Every game matters.' },
      { time: 'Evening',   label: 'Club Dinner',         desc: 'Celebrate the day together. Restaurant reservations organised.' },
    ],
  },
  {
    day: 'Sunday',
    date: '9 Oct',
    label: 'Finals & Awards',
    accent: '#4dd9f4',
    events: [
      { time: 'Morning',   label: 'Semi Finals',    desc: 'The best four clubs fight for a spot in the final.' },
      { time: 'Afternoon', label: 'Grand Final',    desc: 'One match. One trophy. One national champion crowned.' },
      { time: 'Evening',   label: 'Awards Night',   desc: 'The CNCA Awards Night. Dinner, presentations and celebration.' },
      { time: 'Late',      label: 'After-Party',    desc: 'The celebration continues. The whole CNCA community together.' },
    ],
  },
  {
    day: 'Monday',
    date: '10 Oct',
    label: 'Leisure Day',
    accent: '#ff2c91',
    events: [
      { time: 'Morning',   label: 'Theme Parks',  desc: 'Movie World, Dreamworld or a beach day. Your choice.' },
      { time: 'Midday',    label: 'Shopping',     desc: 'Pacific Fair, boutiques and the Surfers Paradise strip.' },
      { time: 'Afternoon', label: 'Last Lunch',   desc: 'Final meal together before the long trip home.' },
      { time: 'Evening',   label: 'Fly Home',     desc: 'Airport transfers arranged. Until CNCA 2028.' },
    ],
  },
]

// ─── Example Packages ────────────────────────────────────────────────────────
const packages = [
  {
    name: 'Club Essentials',
    tag: 'Included & Ready',
    tagColor: '#f4c14d',
    accent: '#f4c14d',
    items: [
      'Official CNCA Accommodation',
      'Airport Transfers (Return)',
      'Championship Entry',
      'Welcome Pack',
    ],
  },
  {
    name: 'Championship Experience',
    tag: 'Most Popular',
    tagColor: '#ff2c91',
    accent: '#ff2c91',
    featured: true,
    items: [
      'Official CNCA Accommodation',
      'Airport & Venue Transfers',
      'Awards Night Tickets',
      'Welcome Function Entry',
      'Official Merchandise',
    ],
  },
  {
    name: 'Gold Coast Escape',
    tag: 'Families Welcome',
    tagColor: '#4dd9f4',
    accent: '#4dd9f4',
    items: [
      'Premium Accommodation',
      'Theme Park Passes',
      'Club Dinner (Private)',
      'Airport Transfers',
      'Championship Entry',
    ],
  },
  {
    name: 'Ultimate Club Weekend',
    tag: 'All Inclusive',
    tagColor: '#f4c14d',
    accent: '#f4c14d',
    items: [
      'Luxury Hotel Accommodation',
      'Private Airport Transfers',
      'VIP Championship Experience',
      'Exclusive Merchandise Pack',
      'Premium Function Access',
      'Welcome & Awards Dinner',
    ],
  },
]

// ─── Package FAQs ────────────────────────────────────────────────────────────
const packageFaqs = [
  { q: 'Can families attend CNCA?',                    a: 'Absolutely. CNCA is designed as a whole-of-club event. Families, partners and children are welcome as spectators and participants in the wider Gold Coast experience across the entire weekend.' },
  { q: 'Can junior players come along?',               a: 'Yes. Junior players attending as spectators and supporters are part of the CNCA community. The Gold Coast is an incredible environment for young netballers to experience elite country competition and the wider event atmosphere.' },
  { q: 'Can we stay longer than four days?',           a: 'Yes. Many clubs extend their stay before or after the championship. Our team can arrange accommodation and activity packages for early arrivals and extended stays — just let us know your preferred dates.' },
  { q: 'Can we choose our own accommodation?',         a: 'Clubs can select from our official accommodation partner options across a range of styles and budgets — from budget-friendly holiday parks to luxury beachfront resorts. We work with your club to match the right fit.' },
  { q: 'Can we organise our own flights?',             a: 'Absolutely. Many clubs prefer to book flights independently or through their preferred airline or travel agent. Our package simply picks you up at the airport and manages everything from that point forward.' },
  { q: 'Can club supporters book through CNCA?',       a: 'Yes. All supporters, volunteers and community members are welcome to book through CNCA club packages regardless of whether their club is competing. Everyone who wants to experience the CNCA weekend can join the group package.' },
  { q: 'Can we add theme park visits to the package?', a: 'Yes. Theme park experiences can be added to any package level. We have exclusive group pricing at major Gold Coast parks including Movie World, Dreamworld and Wet\'n\'Wild. Simply include this when building your enquiry.' },
  { q: 'Can we arrive early or extend the trip?',      a: 'Yes. Whether you want to arrive a day or two early to settle in and explore or stay on for a full Gold Coast holiday after the championship, our team can build an itinerary around your preferred schedule.' },
]

// ─── Why Clubs Love Travelling Together copy ─────────────────────────────────
const storyPoints = [
  { heading: 'Celebrate the season.', body: 'Every training session, every match, every final — your A Grade season builds to CNCA. Arriving on the Gold Coast together is the moment it all pays off.' },
  { heading: 'Build club culture.', body: 'The memories made off the court are as powerful as the ones on it. Shared experiences become the stories that define your club for years.' },
  { heading: 'Reward your volunteers.', body: 'The people who set up courts, run canteens and write match reports deserve to be part of something extraordinary. CNCA is their reward too.' },
  { heading: 'Family holidays attached.', body: 'Partners, parents and kids don\'t just come to watch — they come for the Gold Coast. Let the families turn CNCA into a full October holiday.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} size={10} fill="#f4c14d" color="#f4c14d" />
      ))}
    </div>
  )
}

function PillTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center font-condensed font-bold text-[9px] tracking-[0.22em] uppercase px-2.5 py-1 rounded-full"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────
function PackagesHero({ onRequest, onBuilder }: { onRequest: () => void; onBuilder: () => void }) {
  const prefersReduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])

  const words = ['CHAMPIONSHIP.', 'ACCOMMODATION.', 'CELEBRATION.', 'LUXURY.']

  return (
    <section ref={ref} className="relative overflow-hidden flex flex-col" style={{ minHeight: '100svh' }}>
      {/* BG placeholder */}
      <motion.div className="absolute inset-0" style={prefersReduced ? undefined : { y }}>
        <img
          src="/hero-photo.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '60% center' }}
        />
      </motion.div>

      {/* Overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.92) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(13,13,13,0.97) 0%, rgba(13,13,13,0.6) 55%, transparent 85%)' }} />

      {/* Pink glow */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(255,44,145,0.12) 0%, transparent 70%)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end flex-1 px-6 sm:px-10 lg:px-16 pb-16 lg:pb-24 max-w-6xl mx-auto w-full">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-6 h-[1.5px]" style={{ background: '#ff2c91' }} />
          <span className="font-condensed font-bold tracking-[0.28em] uppercase text-[10px]" style={{ color: '#f4c14d' }}>
            Official Club Packages · Gold Coast · October 2027
          </span>
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-3">
          <motion.h1
            initial={{ y: '105%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.85, delay: 0.2, ease }}
            className="font-display leading-[0.88] text-white"
            style={{ fontSize: 'clamp(3.2rem, 10vw, 10rem)' }}
          >
            OFFICIAL CLUB
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-8">
          <motion.span
            initial={{ y: '105%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.85, delay: 0.3, ease }}
            className="block font-display leading-[0.88]"
            style={{ fontSize: 'clamp(3.2rem, 10vw, 10rem)', color: '#ff2c91' }}
          >
            PACKAGES.
          </motion.span>
        </div>

        {/* Sub copy */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease }}
          className="mb-3"
          style={{ fontSize: 'clamp(1.05rem, 1.8vw, 1.3rem)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, maxWidth: '42ch', fontWeight: 500 }}
        >
          Everything organised.<br />One unforgettable weekend.
        </motion.p>

        {/* Scrolling word row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65, ease }}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-10"
        >
          {words.map((w, i) => (
            <span key={w} className="font-condensed font-bold text-[10px] tracking-[0.25em] uppercase" style={{ color: i % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,44,145,0.5)' }}>
              {w}
            </span>
          ))}
        </motion.div>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.75, ease }}
          className="flex flex-wrap items-center gap-4"
        >
          <button
            onClick={onRequest}
            className="font-bold rounded-full text-white text-sm tracking-wide transition-all"
            style={{
              background: '#ff2c91',
              padding: '0.85rem 2.2rem',
              boxShadow: '0 4px 32px rgba(255,44,145,0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#cc1f6e'
              e.currentTarget.style.boxShadow = '0 8px 48px rgba(255,44,145,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ff2c91'
              e.currentTarget.style.boxShadow = '0 4px 32px rgba(255,44,145,0.35)'
            }}
          >
            Request Package
          </button>
          <button
            onClick={onBuilder}
            className="font-bold rounded-full text-sm tracking-wide transition-all flex items-center gap-2"
            style={{
              border: '1.5px solid rgba(255,255,255,0.25)',
              color: 'rgba(255,255,255,0.8)',
              padding: '0.85rem 2.2rem',
              background: 'rgba(255,255,255,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
            }}
          >
            Build Your Trip <ChevronRight size={14} />
          </button>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2, ease }}
        className="absolute bottom-8 right-8 lg:right-16 flex flex-col items-center gap-2 z-10"
      >
        <span className="font-condensed font-bold text-[8px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} color="rgba(255,255,255,0.2)" />
        </motion.div>
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Why Book Through CNCA
// ─────────────────────────────────────────────────────────────────────────────
function WhyBook() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="why-book" style={{ background: '#0d0d0d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="mb-16 lg:mb-20"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Why Book Through CNCA
          </p>
          <h2 className="font-display text-white leading-none mb-5" style={{ fontSize: 'clamp(2.8rem, 8vw, 7rem)' }}>
            ONE CALL.<br /><span style={{ color: '#ff2c91' }}>EVERYTHING SORTED.</span>
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', maxWidth: '50ch', lineHeight: 1.7 }}>
            Stop spending club committee hours coordinating a Gold Coast trip. We handle every detail so your volunteers can enjoy the weekend they've earned.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem', overflow: 'hidden' }}>
          {benefits.map(({ icon: Icon, title, desc, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.05, ease }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="flex flex-col p-6 lg:p-7 cursor-default transition-all duration-300"
              style={{
                background: hovered === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderRight: (i % 5 !== 4) ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                style={{
                  background: hovered === i ? `${accent}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${hovered === i ? accent + '50' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <Icon size={15} style={{ color: hovered === i ? accent : 'rgba(255,255,255,0.35)' }} />
              </div>
              <CheckCircle size={11} style={{ color: accent, marginBottom: '0.5rem', opacity: hovered === i ? 1 : 0.6 }} />
              <h3 className="font-display text-white leading-none mb-2" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)' }}>
                {title}
              </h3>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Package Builder
// ─────────────────────────────────────────────────────────────────────────────
function PackageBuilder() {
  const [selections, setSelections] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const prefersReduced = useReducedMotion()

  const toggle = useCallback((key: string, value: string, multi?: boolean) => {
    setSelections(prev => {
      if (multi) {
        const current = (prev[key] as string[] | undefined) ?? []
        return { ...prev, [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value] }
      }
      return { ...prev, [key]: prev[key] === value ? '' : value }
    })
  }, [])

  const isSelected = (key: string, value: string) => {
    const v = selections[key]
    return Array.isArray(v) ? v.includes(value) : v === value
  }

  const handleSubmit = () => setSubmitted(true)

  return (
    <section id="build-your-trip" style={{ background: '#111111' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="text-center mb-16"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Package Builder
          </p>
          <h2 className="font-display text-white leading-none mb-4" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
            BUILD YOUR<br /><span style={{ color: '#ff2c91' }}>CLUB TRIP.</span>
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.35)', maxWidth: '44ch', margin: '0 auto', lineHeight: 1.7 }}>
            Tell us what your club needs. We'll put together a tailored enquiry package with everything included.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(255,44,145,0.15)', border: '1px solid rgba(255,44,145,0.3)' }}>
                <CheckCircle size={28} style={{ color: '#ff2c91' }} />
              </div>
              <h3 className="font-display text-white text-3xl mb-3">ENQUIRY SENT.</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Our team will be in touch within 2 business days with your tailored package proposal.</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="space-y-10">
              {builderSteps.map(({ label, key, options, multi }, stepIdx) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.55, delay: prefersReduced ? 0 : stepIdx * 0.06, ease }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-condensed font-bold text-[9px] tracking-[0.3em] uppercase" style={{ color: '#f4c14d' }}>
                      0{stepIdx + 1}
                    </span>
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <h3 className="font-condensed font-bold text-sm tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {label}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => {
                      const sel = isSelected(key, opt)
                      return (
                        <button
                          key={opt}
                          onClick={() => toggle(key, opt, multi)}
                          className="font-condensed font-bold text-xs tracking-[0.1em] uppercase rounded-xl px-4 py-2.5 transition-all duration-200"
                          style={{
                            background: sel ? '#ff2c91' : 'rgba(255,255,255,0.05)',
                            color: sel ? '#ffffff' : 'rgba(255,255,255,0.45)',
                            border: `1px solid ${sel ? '#ff2c91' : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: sel ? '0 4px 20px rgba(255,44,145,0.25)' : 'none',
                          }}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4, ease }}
                className="pt-4"
              >
                <button
                  onClick={handleSubmit}
                  className="w-full sm:w-auto font-bold rounded-full text-white text-sm tracking-wide flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: '#ff2c91',
                    padding: '1rem 3rem',
                    boxShadow: '0 4px 32px rgba(255,44,145,0.3)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#cc1f6e'
                    e.currentTarget.style.boxShadow = '0 8px 48px rgba(255,44,145,0.45)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#ff2c91'
                    e.currentTarget.style.boxShadow = '0 4px 32px rgba(255,44,145,0.3)'
                  }}
                >
                  Generate Enquiry <ArrowRight size={15} />
                </button>
                <p className="mt-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  No commitment required. Our team will respond with a tailored proposal.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Accommodation
// ─────────────────────────────────────────────────────────────────────────────
function AccommodationSection() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="accommodation" style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-16 lg:pt-24 pb-0">
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="mb-14"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Accommodation
          </p>
          <div className="grid lg:grid-cols-[5fr,4fr] gap-8 items-end">
            <h2 className="font-display leading-none" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)', color: '#111111' }}>
              WHERE YOUR<br /><span style={{ color: '#ff2c91' }}>CLUB STAYS.</span>
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', lineHeight: 1.7 }}>
              Official CNCA accommodation partners — vetted, approved and positioned to make the whole club's stay seamless, comfortable and social.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}>
        {hotels.map(({ name, type, stars, venueKm, beachKm, features, accent }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.07, ease }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-col cursor-default"
            style={{
              borderTop: `3px solid ${hovered === i ? accent : `${accent}45`}`,
              borderRight: i % 3 !== 2 ? '1px solid rgba(17,17,17,0.07)' : 'none',
              background: hovered === i ? '#ffffff' : 'transparent',
              boxShadow: hovered === i ? '0 8px 40px rgba(0,0,0,0.07)' : 'none',
              transition: 'background 0.25s, box-shadow 0.25s, border-color 0.25s',
            }}
          >
            {/* Image placeholder */}
            <div
              className="relative overflow-hidden"
              style={{ height: '180px', background: `linear-gradient(135deg, ${accent}15 0%, rgba(17,17,17,0.08) 100%)` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Building size={32} style={{ color: `${accent}40` }} />
              </div>
              <div className="absolute top-3 left-3">
                <PillTag label={type} color={accent} />
              </div>
              <div className="absolute top-3 right-3 flex gap-1">
                <button className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase px-2 py-1 rounded-lg" style={{ background: 'rgba(17,17,17,0.6)', color: 'rgba(255,255,255,0.7)' }}>MAP</button>
                <button className="font-condensed font-bold text-[8px] tracking-[0.18em] uppercase px-2 py-1 rounded-lg" style={{ background: 'rgba(17,17,17,0.6)', color: 'rgba(255,255,255,0.7)' }}>GALLERY</button>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <StarRating n={stars} />
              <h3 className="font-display leading-none mt-3 mb-1" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', color: '#111111' }}>
                {name.toUpperCase()}
              </h3>

              <div className="flex items-center gap-3 mb-4 mt-2">
                <span className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(17,17,17,0.35)' }}>
                  {venueKm}km to venue
                </span>
                <span style={{ color: 'rgba(17,17,17,0.15)', fontSize: '10px' }}>·</span>
                <span className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(17,17,17,0.35)' }}>
                  {beachKm}km to beach
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-auto">
                {features.map(f => (
                  <span key={f} className="font-condensed font-bold text-[8px] tracking-[0.15em] uppercase px-2 py-1 rounded-lg" style={{ background: 'rgba(17,17,17,0.05)', color: 'rgba(17,17,17,0.45)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom strip */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8" style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}>
        <p className="font-condensed font-bold text-[10px] tracking-[0.28em] uppercase text-center" style={{ color: 'rgba(17,17,17,0.28)' }}>
          All properties are vetted CNCA partners &nbsp;·&nbsp; Exclusive group rates available &nbsp;·&nbsp; Priority booking for CNCA clubs
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Experiences
// ─────────────────────────────────────────────────────────────────────────────
function ExperiencesSection() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="experiences" style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-16 lg:pt-24 pb-0">
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="mb-14"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Gold Coast Experiences
          </p>
          <h2 className="font-display text-white leading-none mb-4" style={{ fontSize: 'clamp(2.8rem, 7vw, 6.5rem)' }}>
            BEYOND THE<br /><span style={{ color: '#ff2c91' }}>COURTS.</span>
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.35)', maxWidth: '52ch', lineHeight: 1.7 }}>
            The Gold Coast is the perfect backdrop for your club's annual trip. Every experience below can be added to your club package.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {experiences.map(({ title, cat, icon: Icon, accent, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.05, ease }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-col p-7 lg:p-8 cursor-default transition-all duration-250"
            style={{
              borderTop: `2px solid ${hovered === i ? accent : `${accent}30`}`,
              borderRight: i % 4 !== 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              borderBottom: i < 8 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: hovered === i ? 'rgba(255,255,255,0.03)' : 'transparent',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-5 transition-all duration-250"
              style={{
                background: hovered === i ? `${accent}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hovered === i ? `${accent}50` : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <Icon size={15} style={{ color: hovered === i ? accent : 'rgba(255,255,255,0.3)' }} />
            </div>
            <span className="font-condensed font-bold text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: `${accent}80` }}>
              {cat}
            </span>
            <h3 className="font-display text-white leading-none mb-3" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.45rem)' }}>
              {title.toUpperCase()}
            </h3>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {desc}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="font-condensed font-bold text-[10px] tracking-[0.28em] uppercase text-center" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Group discounts available &nbsp;·&nbsp; All activities bookable through your club package &nbsp;·&nbsp; CNCA exclusive pricing
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Club Dining
// ─────────────────────────────────────────────────────────────────────────────
function DiningSection() {
  const [hovered, setHovered] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="dining" style={{ background: '#0d0d0d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="mb-16"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Club Dining
          </p>
          <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)' }}>
            EAT TOGETHER.<br /><span style={{ color: '#ff2c91' }}>CELEBRATE TOGETHER.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem', overflow: 'hidden' }}>
          {dining.map(({ title, sub, desc, accent }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.07, ease }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="flex flex-col p-8 cursor-default transition-all duration-250"
              style={{
                background: hovered === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderRight: i % 3 !== 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderTop: `3px solid ${hovered === i ? accent : `${accent}35`}`,
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-5" style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}>
                <Utensils size={13} style={{ color: accent }} />
              </div>
              <h3 className="font-display text-white leading-none mb-1" style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)' }}>
                {title.toUpperCase()}
              </h3>
              <p className="font-condensed font-bold text-[9px] tracking-[0.22em] uppercase mb-4" style={{ color: `${accent}99` }}>
                {sub}
              </p>
              <div className="h-px w-8 mb-4" style={{ background: `${accent}50` }} />
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — Transport
// ─────────────────────────────────────────────────────────────────────────────
function TransportSection() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="transport" style={{ background: '#f5f4f0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: prefersReduced ? 0 : -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease }}
          >
            <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
              Transport
            </p>
            <h2 className="font-display leading-none mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#111111' }}>
              WE MOVE<br /><span style={{ color: '#ff2c91' }}>YOUR CLUB.</span>
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(17,17,17,0.45)', lineHeight: 1.7, maxWidth: '40ch' }}>
              From the moment your club lands at Gold Coast Airport to the final shuttle back on Monday afternoon — every transfer is handled.
            </p>

            {/* Map placeholder */}
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, ease }}
              className="mt-8 rounded-2xl flex items-center justify-center"
              style={{
                height: '220px',
                background: 'linear-gradient(135deg, #e8e6e0 0%, #dddbd4 100%)',
                border: '1px solid rgba(17,17,17,0.08)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Fake map dots */}
              {[
                { left: '20%', top: '30%', label: 'Airport', accent: '#ff2c91' },
                { left: '50%', top: '55%', label: 'Venue', accent: '#f4c14d' },
                { left: '65%', top: '25%', label: 'Hotels', accent: '#4dd9f4' },
                { left: '80%', top: '65%', label: 'Parks', accent: '#ff2c91' },
              ].map(({ left, top, label, accent }) => (
                <div key={label} className="absolute flex flex-col items-center gap-1" style={{ left, top, transform: 'translate(-50%, -50%)' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}60` }} />
                  <span className="font-condensed font-bold text-[8px] tracking-[0.15em] uppercase" style={{ color: 'rgba(17,17,17,0.5)' }}>{label}</span>
                </div>
              ))}
              <div className="absolute bottom-4 right-4">
                <span className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase px-2 py-1 rounded-lg" style={{ background: 'rgba(17,17,17,0.08)', color: 'rgba(17,17,17,0.4)' }}>
                  Interactive Map Coming Soon
                </span>
              </div>
            </motion.div>
          </motion.div>

          <div className="space-y-4">
            {transport.map(({ icon: Icon, title, desc, accent }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: prefersReduced ? 0 : 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.08, ease }}
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: 'rgba(17,17,17,0.04)', border: '1px solid rgba(17,17,17,0.06)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                  <Icon size={16} style={{ color: accent }} />
                </div>
                <div>
                  <h3 className="font-display leading-none mb-1" style={{ fontSize: '1.15rem', color: '#111111' }}>
                    {title.toUpperCase()}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(17,17,17,0.42)' }}>
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — Itinerary Timeline
// ─────────────────────────────────────────────────────────────────────────────
function ItinerarySection() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="itinerary" style={{ background: '#0d0d0d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="mb-16 lg:mb-20"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Suggested Itinerary
          </p>
          <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
            FOUR DAYS.<br /><span style={{ color: '#ff2c91' }}>UNFORGETTABLE.</span>
          </h2>
        </motion.div>

        {/* Day tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-4">
          {itinerary.map(({ day, date, label, accent, events }, di) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.6, delay: prefersReduced ? 0 : di * 0.1, ease }}
              className="flex flex-col"
            >
              {/* Day header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#111111', border: `2px solid ${accent}` }}>
                  <Calendar size={14} style={{ color: accent }} />
                </div>
                <div>
                  <p className="font-display text-white leading-none" style={{ fontSize: '1.25rem' }}>{day.toUpperCase()}</p>
                  <p className="font-condensed font-bold text-[9px] tracking-[0.2em] uppercase mt-0.5" style={{ color: `${accent}90` }}>{date} · {label}</p>
                </div>
              </div>

              {/* Events */}
              <div className="flex-1 relative pl-5" style={{ borderLeft: `1px solid rgba(255,255,255,0.07)` }}>
                {events.map(({ time, label: evLabel, desc }) => (
                  <div key={evLabel} className="relative pb-5 last:pb-0">
                    {/* Dot */}
                    <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full top-0.5" style={{ background: accent, opacity: 0.7, border: '2px solid #0d0d0d', outline: `2px solid ${accent}30` }} />
                    <p className="font-condensed font-bold text-[8px] tracking-[0.22em] uppercase mb-0.5" style={{ color: `${accent}70` }}>{time}</p>
                    <p className="font-display text-white leading-none mb-1" style={{ fontSize: '0.95rem' }}>{evLabel.toUpperCase()}</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — Example Packages
// ─────────────────────────────────────────────────────────────────────────────
function PackageTiers() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="package-tiers" style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="text-center mb-16"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Example Packages
          </p>
          <h2 className="font-display text-white leading-none mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)' }}>
            CHOOSE YOUR<br /><span style={{ color: '#ff2c91' }}>EXPERIENCE.</span>
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', maxWidth: '42ch', margin: '0 auto' }}>
            Every package is fully customisable. These are starting points — not limits.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map(({ name, tag, tagColor, accent, featured, items }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.55, delay: prefersReduced ? 0 : i * 0.09, ease }}
              className="flex flex-col rounded-2xl p-7 relative overflow-hidden"
              style={{
                background: featured ? 'rgba(255,44,145,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${featured ? 'rgba(255,44,145,0.25)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: featured ? '0 0 60px rgba(255,44,145,0.08)' : 'none',
              }}
            >
              {featured && (
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(to right, transparent, #ff2c91, transparent)' }} />
              )}
              <PillTag label={tag} color={tagColor} />
              <h3 className="font-display text-white leading-none mt-5 mb-2" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)' }}>
                {name.toUpperCase()}
              </h3>
              <div className="h-px mb-5 mt-1" style={{ background: `${accent}30` }} />
              <ul className="space-y-2.5 flex-1">
                {items.map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={11} style={{ color: accent, marginTop: '2px', flexShrink: 0 }} />
                    <span className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                className="mt-6 w-full font-condensed font-bold text-xs tracking-[0.12em] uppercase py-3 rounded-xl transition-all duration-200"
                style={{
                  background: featured ? '#ff2c91' : 'rgba(255,255,255,0.06)',
                  color: featured ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  border: featured ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={e => {
                  if (!featured) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = '#ffffff'
                  }
                }}
                onMouseLeave={e => {
                  if (!featured) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                  }
                }}
              >
                Enquire About This Package
              </button>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4, ease }}
          className="text-center mt-8 text-[11px]"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          No pricing displayed — all packages are custom-quoted based on your club's size, dates and requirements.
        </motion.p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — Map Placeholder
// ─────────────────────────────────────────────────────────────────────────────
function MapSection() {
  const prefersReduced = useReducedMotion()
  const mapPoints = [
    { label: 'GC Airport',  left: '12%', top: '72%', accent: '#4dd9f4' },
    { label: 'CNCA Venue',  left: '48%', top: '52%', accent: '#ff2c91' },
    { label: 'Surfers Para.', left: '54%', top: '35%', accent: '#f4c14d' },
    { label: 'Movie World', left: '22%', top: '28%', accent: '#f4c14d' },
    { label: 'Dreamworld',  left: '30%', top: '18%', accent: '#ff2c91' },
    { label: 'Pacific Fair', left: '62%', top: '58%', accent: '#4dd9f4' },
    { label: 'Hotels',      left: '50%', top: '42%', accent: '#ffffff' },
    { label: 'Beach',       left: '72%', top: '22%', accent: '#4dd9f4' },
  ]

  return (
    <section id="map" style={{ background: '#0d0d0d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="mb-10"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-4" style={{ color: '#f4c14d' }}>
            Gold Coast Map
          </p>
          <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            EVERYTHING IS<br /><span style={{ color: '#ff2c91' }}>CLOSE.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="relative rounded-3xl overflow-hidden"
          style={{ height: '400px', background: 'linear-gradient(135deg, #1a2a1a 0%, #1a1a2e 50%, #2a1a1a 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="absolute inset-x-0" style={{ top: `${(i + 1) * 16.6}%`, height: '1px', background: 'rgba(255,255,255,0.04)' }} />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="absolute inset-y-0" style={{ left: `${(i + 1) * 12.5}%`, width: '1px', background: 'rgba(255,255,255,0.04)' }} />
          ))}

          {/* Map points */}
          {mapPoints.map(({ label, left, top, accent }) => (
            <div key={label} className="absolute flex flex-col items-center gap-1" style={{ left, top, transform: 'translate(-50%, -50%)' }}>
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: accent, boxShadow: `0 0 16px ${accent}70` }} />
              <span className="font-condensed font-bold text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          ))}

          <div className="absolute bottom-5 right-5 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <MapPin size={10} style={{ color: '#ff2c91' }} />
            <span className="font-condensed font-bold text-[9px] tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Interactive Map — Coming Soon
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="flex flex-wrap items-center justify-center gap-5 mt-8"
        >
          {mapPoints.map(({ label, accent }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
              <span className="font-condensed font-bold text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — Why Clubs Love Travelling Together
// ─────────────────────────────────────────────────────────────────────────────
function WhyClubsTravelSection() {
  const prefersReduced = useReducedMotion()

  return (
    <section id="why-clubs-travel" style={{ background: '#111111' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 lg:py-32">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-20"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            The Real Reason
          </p>
          <h2 className="font-display text-white leading-none" style={{ fontSize: 'clamp(2.8rem, 8vw, 8rem)' }}>
            THIS IS BIGGER<br />THAN <span style={{ color: '#ff2c91' }}>NETBALL.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {storyPoints.map(({ heading, body }, i) => (
            <motion.div
              key={heading}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.65, delay: prefersReduced ? 0 : i * 0.1, ease }}
              className="p-10 lg:p-14"
              style={{
                borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <span className="font-condensed font-bold text-[9px] tracking-[0.3em] uppercase mb-4 block" style={{ color: 'rgba(255,44,145,0.5)' }}>
                0{i + 1}
              </span>
              <h3 className="font-display text-white leading-none mb-5" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 3rem)' }}>
                {heading.toUpperCase().replace('.', '')}
              </h3>
              <div className="h-px w-10 mb-5" style={{ background: 'rgba(255,44,145,0.4)' }} />
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, maxWidth: '42ch' }}>
                {body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Closing statement */}
        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease }}
          className="mt-16 lg:mt-20 text-center px-4"
        >
          <p className="font-display text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', lineHeight: 1.2 }}>
            "The trip is the season. The <span style={{ color: '#ff2c91' }}>Gold Coast</span> is the reward."
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — Package FAQs
// ─────────────────────────────────────────────────────────────────────────────
function PackageFAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  const prefersReduced = useReducedMotion()

  return (
    <section id="packages-faq" style={{ background: '#f5f4f0' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-20 lg:py-28">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease }}
          className="mb-12"
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-5" style={{ color: '#f4c14d' }}>
            Common Questions
          </p>
          <h2 className="font-display leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#111111' }}>
            PACKAGE<br /><span style={{ color: '#ff2c91' }}>FAQ.</span>
          </h2>
        </motion.div>

        <div className="space-y-0" style={{ borderTop: '1px solid rgba(17,17,17,0.07)' }}>
          {packageFaqs.map(({ q, a }, i) => (
            <motion.div
              key={q}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10px' }}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.04, ease }}
              style={{ borderBottom: '1px solid rgba(17,17,17,0.07)' }}
            >
              <button
                className="flex items-center justify-between w-full text-left py-5 gap-4"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="font-display leading-snug" style={{ fontSize: 'clamp(1.05rem, 2vw, 1.3rem)', color: '#111111' }}>
                  {q}
                </span>
                <motion.div
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ duration: 0.2, ease }}
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: open === i ? '#ff2c91' : 'rgba(17,17,17,0.07)' }}
                >
                  <Plus size={13} style={{ color: open === i ? '#ffffff' : 'rgba(17,17,17,0.5)' }} />
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="pb-5 text-sm leading-relaxed" style={{ color: 'rgba(17,17,17,0.5)', maxWidth: '70ch' }}>
                      {a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────────────────────────────────────
function PackagesCTA({ onRequest }: { onRequest: () => void }) {
  const prefersReduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* BG image tint */}
      <div className="relative overflow-hidden" style={{ height: '80px' }}>
        <img src="/hero-photo.webp" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '65% 80%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.2) 0%, rgba(13,13,13,1) 100%)' }} />
      </div>

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(255,44,145,0.1) 0%, transparent 65%)' }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pb-24 lg:pb-32 text-center">

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
        >
          <p className="font-condensed font-bold tracking-[0.28em] text-[10px] uppercase mb-7" style={{ color: '#f4c14d' }}>
            Ready to Book?
          </p>
          <h2 className="font-display text-white leading-[0.88] mb-5" style={{ fontSize: 'clamp(3rem, 9vw, 9rem)' }}>
            MAKE CNCA YOUR<br /><span style={{ color: '#ff2c91' }}>2027 CLUB TRIP.</span>
          </h2>
          <p className="mb-12" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)', maxWidth: '40ch', margin: '0 auto 3rem' }}>
            One organiser. One unforgettable weekend.<br />Let us handle every detail.
          </p>

          <motion.button
            onClick={onRequest}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="font-bold rounded-full text-white tracking-wide inline-flex items-center gap-2"
            style={{
              background: '#ff2c91',
              fontSize: '0.95rem',
              padding: '1.1rem 3rem',
              boxShadow: '0 8px 48px rgba(255,44,145,0.4)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#cc1f6e'
              e.currentTarget.style.boxShadow = '0 12px 60px rgba(255,44,145,0.55)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ff2c91'
              e.currentTarget.style.boxShadow = '0 8px 48px rgba(255,44,145,0.4)'
            }}
          >
            Request Your Club Package <ArrowRight size={16} />
          </motion.button>

          <p className="mt-5 font-condensed font-bold text-[9px] tracking-[0.28em] uppercase" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Gold Coast · Queensland · October 2027
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PACKAGE REQUEST MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PackageRequestModal({ open: isOpen, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    setSubmitted(true)
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#ff2c91] focus:ring-1 focus:ring-[#ff2c91]/30 transition-all duration-200"
  const labelCls = "block text-[10px] font-bold tracking-[0.2em] text-white/40 mb-1.5 uppercase"

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
            className="fixed inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg top-[5%] bottom-[5%] z-[70] overflow-y-auto rounded-2xl"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="p-7 sm:p-9">
              {/* Header */}
              <div className="flex items-start justify-between mb-7">
                <div>
                  <p className="font-condensed font-bold text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: '#f4c14d' }}>Official Club Packages</p>
                  <h3 className="font-display text-white leading-none" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>REQUEST A<br /><span style={{ color: '#ff2c91' }}>PACKAGE.</span></h3>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-all" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#ffffff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                >
                  ✕
                </button>
              </div>

              {submitted ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(255,44,145,0.15)', border: '1px solid rgba(255,44,145,0.3)' }}>
                    <CheckCircle size={24} style={{ color: '#ff2c91' }} />
                  </div>
                  <h4 className="font-display text-white text-2xl mb-2">DONE.</h4>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>We'll be in touch within 2 business days with your package proposal.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Contact Name</label>
                      <input required className={inputCls} placeholder="Your name" />
                    </div>
                    <div>
                      <label className={labelCls}>Club Name</label>
                      <input required className={inputCls} placeholder="Club name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input required type="email" className={inputCls} placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input className={inputCls} placeholder="0400 000 000" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Group Size (approx.)</label>
                    <input required className={inputCls} placeholder="e.g. 45 people" />
                  </div>
                  <div>
                    <label className={labelCls}>State / Territory</label>
                    <select required className={inputCls} style={{ appearance: 'none' }}>
                      <option value="">Select state</option>
                      {['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Package Interest</label>
                    <textarea className={inputCls} rows={3} placeholder="What does your club need? Accommodation, transport, activities..." />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold rounded-full text-white text-sm tracking-wide py-3.5 transition-all"
                    style={{ background: loading ? '#cc1f6e' : '#ff2c91', boxShadow: '0 4px 24px rgba(255,44,145,0.3)' }}
                  >
                    {loading ? 'Sending...' : 'Send Package Request'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE WRAPPER — structured data + page scroll management
// ─────────────────────────────────────────────────────────────────────────────
export default function ClubPackages() {
  const [modalOpen, setModalOpen] = useState(false)

  const scrollToBuilder = useCallback(() => {
    document.getElementById('build-your-trip')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  return (
    <>
      {/* SEO structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "TouristTrip",
        "name": "CNCA Official Club Packages — Gold Coast 2027",
        "description": "Official club travel packages for the Country Netball Championships Australia on the Gold Coast, October 2027. Accommodation, transport, activities and championship experiences for competing and non-competing clubs.",
        "touristType": ["Sports team", "Netball club", "Family"],
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
          "availabilityEnds": "2027-10-06",
          "seller": { "@type": "Organization", "name": "CNCA — Country Netball Championships Australia" }
        },
        "itinerary": {
          "@type": "ItemList",
          "name": "CNCA 2027 Club Package Itinerary",
          "itemListElement": itinerary.map((d, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": `${d.day} — ${d.label}`,
          }))
        }
      })}} />

      <Ticker />
      <Nav />

      <main id="club-packages-main">
        <PackagesHero onRequest={openModal} onBuilder={scrollToBuilder} />
        <WhyBook />
        <PackageBuilder />
        <AccommodationSection />
        <ExperiencesSection />
        <DiningSection />
        <TransportSection />
        <ItinerarySection />
        <PackageTiers />
        <MapSection />
        <WhyClubsTravelSection />
        <PackageFAQSection />
        <PackagesCTA onRequest={openModal} />
      </main>

      <Footer />
      <PackageRequestModal open={modalOpen} onClose={closeModal} />
    </>
  )
}
