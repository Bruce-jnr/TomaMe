import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Compass,
  Home as HomeIcon,
  LoaderCircle,
  Menu,
  Search,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
  Vote,
  WalletCards,
  Zap,
} from 'lucide-react'
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import logo from './assets/logo.png'
import organizerHero from './assets/organizer-hero.jpg'
import CreateEventPage from './pages/CreateEventPage.jsx'
import { CandidatesRoute, CategoriesRoute, DashboardRoute, PaymentsRoute } from './pages/OrganizerAdminPages.jsx'

const API_URL = import.meta.env.VITE_API_URL || ''

async function getJson(path, signal) {
  const response = await fetch(`${API_URL}${path}`, { signal })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) throw new Error(payload?.error?.message || 'Unable to load TomaMe right now.')
  return payload.data
}

function usePublicData(path) {
  const [state, setState] = useState({ path: '', data: [], error: '' })
  useEffect(() => {
    const controller = new AbortController()
    getJson(path, controller.signal)
      .then((data) => setState({ path, data, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ path, data: [], error: error.message })
      })
    return () => controller.abort()
  }, [path])
  return state.path === path ? { ...state, loading: false } : { data: [], error: '', loading: true }
}

function Shell({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="TomaMe home"><img src={logo} alt="TomaMe" /></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink><NavLink to="/events">Explore</NavLink>
        </nav>
        <div className="header-actions">
          <Link className="organizer-link" to="/organizers">For organizers</Link>
          <button className="icon-button" type="button" aria-label="Open menu" title="Menu"><Menu size={21} /></button>
        </div>
      </header>
      <main>{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/" end><HomeIcon /><span>Home</span></NavLink>
        <NavLink to="/events"><Compass /><span>Explore</span></NavLink>
        <NavLink to="/events?focus=search"><Search /><span>Search</span></NavLink>
        <NavLink to="/results"><Trophy /><span>Results</span></NavLink>
      </nav>
    </div>
  )
}

function SearchForm({ initialValue = '', compact = false }) {
  const [value, setValue] = useState(initialValue)
  const navigate = useNavigate()
  function submit(event) {
    event.preventDefault()
    navigate(`/events${value.trim() ? `?search=${encodeURIComponent(value.trim())}` : ''}`)
  }
  return (
    <form className={`search-form ${compact ? 'compact' : ''}`} onSubmit={submit} role="search">
      <Search aria-hidden="true" />
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search candidate, event or code" aria-label="Search TomaMe" />
      <button className="icon-button search-submit" type="submit" aria-label="Search" title="Search"><ArrowRight size={19} /></button>
    </form>
  )
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}><span />{status === 'live' ? 'Live' : status}</span>
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

function EventCard({ event, featured = false }) {
  return (
    <article className={`event-card ${featured ? 'featured' : ''}`}>
      <div className="event-image" style={event.bannerUrl ? { backgroundImage: `url(${event.bannerUrl})` } : undefined}>
        <StatusBadge status={event.publicStatus} />
        <div className="event-image-fallback"><Trophy /></div>
      </div>
      <div className="event-content">
        <p className="event-organizer">{event.organization.name}</p>
        <h3>{event.name}</h3>
        <div className="event-meta">
          <span><Users />{event._count.candidates} candidates</span>
          <span><CalendarDays />{event.publicStatus === 'live' ? `Ends ${formatDate(event.endAt)}` : formatDate(event.startAt)}</span>
        </div>
        <Link className="event-link" to={`/events/${event.slug}`}>{event.publicStatus === 'ended' ? 'View results' : 'Explore event'}<ChevronRight /></Link>
      </div>
    </article>
  )
}

function CandidateCard({ candidate }) {
  const initials = candidate.name.split(' ').map((part) => part[0]).join('').slice(0, 2)
  return (
    <article className="candidate-card">
      <div className="candidate-photo">{candidate.photoUrl ? <img src={candidate.photoUrl} alt="" /> : <span>{initials}</span>}</div>
      <div className="candidate-info"><p>{candidate.category.name}</p><h3>{candidate.name}</h3><span className="candidate-code">{candidate.candidateCode}</span></div>
      <button className="vote-button" type="button"><Vote />Vote</button>
    </article>
  )
}

function LoadingCards() {
  return <div className="loading-state"><LoaderCircle className="spin" /><span>Loading live events...</span></div>
}

function ErrorState({ message }) {
  return <div className="message-state error"><strong>We couldn&apos;t load this page.</strong><span>{message}</span></div>
}

function HomePage() {
  const events = usePublicData('/api/v1/public/events?status=live')
  const candidates = usePublicData('/api/v1/public/candidates/featured')
  return (
    <Shell>
      <section className="hero-section">
        <div className="hero-copy"><span className="eyebrow">Ghana&apos;s public voting platform</span><h1>Vote for the people who <em>inspire you.</em></h1><p>Discover active competitions, find your candidate, and show your support in a few simple steps.</p><SearchForm /></div>
        <div className="hero-art" aria-hidden="true"><div className="ballot"><Vote /><strong>Your voice counts</strong><span>Secure voting powered by TomaMe</span></div><div className="vote-mark">✓</div></div>
      </section>
      <section className="content-section">
        <div className="section-heading"><div><span className="eyebrow">Happening now</span><h2>Live events</h2></div><Link to="/events?status=live">See all <ArrowRight /></Link></div>
        {events.loading ? <LoadingCards /> : events.error ? <ErrorState message={events.error} /> : events.data.length ? <div className="event-grid">{events.data.slice(0, 3).map((event) => <EventCard event={event} key={event.id} featured />)}</div> : <div className="message-state"><strong>No live events right now.</strong><span>Check back soon for new competitions.</span></div>}
      </section>
      <section className="content-section candidates-section">
        <div className="section-heading"><div><span className="eyebrow">Popular choices</span><h2>Trending candidates</h2></div></div>
        {candidates.loading ? <LoadingCards /> : candidates.error ? <ErrorState message={candidates.error} /> : <div className="candidate-grid">{candidates.data.map((candidate) => <CandidateCard candidate={candidate} key={candidate.id} />)}</div>}
      </section>
      <section className="how-section"><div><span className="eyebrow">Simple and transparent</span><h2>Three steps to support your favorite</h2></div><ol><li><b>01</b><strong>Find a candidate</strong><span>Search by name or candidate code.</span></li><li><b>02</b><strong>Choose your votes</strong><span>Select how many votes you want to cast.</span></li><li><b>03</b><strong>Pay securely</strong><span>Confirm payment and receive your reference.</span></li></ol></section>
    </Shell>
  )
}

function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const search = params.get('search') || ''
  const path = useMemo(() => `/api/v1/public/events?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`, [status, search])
  const events = usePublicData(path)
  function changeStatus(next) {
    const updated = new URLSearchParams(params)
    if (next === 'all') updated.delete('status'); else updated.set('status', next)
    setParams(updated)
  }
  return (
    <Shell>
      <section className="explore-intro"><span className="eyebrow">Event discovery</span><h1>Find an event worth celebrating.</h1><p>Browse live competitions, upcoming events, and recently announced results.</p><SearchForm initialValue={search} compact /></section>
      <section className="content-section explore-content">
        <div className="filter-row" role="group" aria-label="Filter events by status">{['all', 'live', 'upcoming', 'ended'].map((item) => <button className={status === item ? 'active' : ''} onClick={() => changeStatus(item)} key={item} type="button">{item}</button>)}</div>
        <div className="results-heading"><h2>{search ? `Results for “${search}”` : status === 'all' ? 'All events' : `${status} events`}</h2><span>{events.loading ? 'Loading' : `${events.data.length} found`}</span></div>
        {events.loading ? <LoadingCards /> : events.error ? <ErrorState message={events.error} /> : events.data.length ? <div className="event-grid explore-grid">{events.data.map((event) => <EventCard event={event} key={event.id} />)}</div> : <div className="message-state"><Search /><strong>No matching events.</strong><span>Try another search or event status.</span></div>}
      </section>
    </Shell>
  )
}

const organizerCapabilities = [
  { icon: Vote, title: 'One voting engine', text: 'Web and USSD orders follow the same pricing, payment verification, and vote-crediting rules.' },
  { icon: WalletCards, title: 'Verified payments', text: 'Votes are credited only after the provider confirms the expected amount and currency.' },
  { icon: BarChart3, title: 'Useful reporting', text: 'Follow vote volume, revenue, candidate performance, payment success, and channel mix.' },
  { icon: ShieldCheck, title: 'Tenant isolation', text: 'Organization records and administrative actions are scoped and authorized on the server.' },
]

function OrganizerPage() {
  return (
    <Shell>
      <section className="organizer-hero" style={{ backgroundImage: `url(${organizerHero})` }}>
        <div className="organizer-hero-content">
          <span className="organizer-kicker">Built for awards, pageants, and competitions</span>
          <h1>Run voting with confidence from nomination to results.</h1>
          <p>Create your event, manage candidates, accept paid votes, and track every verified transaction in one organized workspace.</p>
          <div className="organizer-hero-actions">
            <Link className="organizer-primary" to="/dashboard/events/new">Create an event <ArrowRight /></Link>
            <a className="organizer-secondary" href="#workflow">See how it works</a>
          </div>
          <div className="organizer-proof"><span><CheckCircle2 />No voter account required</span><span><CheckCircle2 />Web and USSD ready</span><span><CheckCircle2 />Auditable vote ledger</span></div>
        </div>
      </section>

      <section className="organizer-intro">
        <div><span className="eyebrow">Your event, under control</span><h2>A practical workspace for serious public voting.</h2></div>
        <p>TomaMe keeps event operations, payments, voting channels, results, and reporting connected. Your team gets the information needed to run the event while voters get a short, clear path to support a candidate.</p>
      </section>

      <section className="organizer-capabilities">
        {organizerCapabilities.map(({ icon: Icon, title, text }, index) => <article key={title}><span className="capability-number">0{index + 1}</span><Icon /><h3>{title}</h3><p>{text}</p></article>)}
      </section>

      <section className="organizer-workflow" id="workflow">
        <div className="workflow-copy"><span className="eyebrow">From setup to settlement</span><h2>Everything follows the event lifecycle.</h2><p>Build the event in stages, open voting when you are ready, and keep financial and vote records traceable after results are announced.</p><Link to="/dashboard/events/new">Start event setup <ArrowRight /></Link></div>
        <ol>
          <li><span>1</span><div><strong>Configure</strong><p>Set schedule, pricing, channels, result visibility, and event branding.</p></div></li>
          <li><span>2</span><div><strong>Organize</strong><p>Add categories, candidates, unique codes, photos, and campaign details.</p></div></li>
          <li><span>3</span><div><strong>Launch</strong><p>Publish the event and let voters discover candidates on web or USSD.</p></div></li>
          <li><span>4</span><div><strong>Measure</strong><p>Review verified transactions, channel performance, rankings, and reports.</p></div></li>
        </ol>
      </section>

      <section className="organizer-channels">
        <div className="channel-heading"><span className="eyebrow">Meet voters where they are</span><h2>One event. Multiple voting channels.</h2></div>
        <div className="channel-panels">
          <article className="web-channel"><div className="channel-icon"><Zap /></div><span>Web voting</span><h3>A direct route from discovery to payment.</h3><p>Voters search by event, name, or candidate code, select a quantity, review the total, and complete payment without creating an account.</p><ul><li><CheckCircle2 />Mobile-first candidate pages</li><li><CheckCircle2 />Server-calculated prices</li><li><CheckCircle2 />Payment verification states</li></ul></article>
          <article className="ussd-channel"><div className="channel-icon"><Smartphone /></div><span>USSD voting</span><h3>Candidate-code voting beyond the browser.</h3><p>The same event rules and vote ledger can serve short-code sessions, mobile money requests, and confirmation messages.</p><ul><li><CheckCircle2 />Fast candidate-code lookup</li><li><CheckCircle2 />Session-aware menu flow</li><li><CheckCircle2 />Shared payment integrity</li></ul></article>
        </div>
      </section>

      <section className="organizer-dashboard-preview">
        <div className="preview-copy"><span className="eyebrow">Operational visibility</span><h2>Know what is happening while voting is live.</h2><p>Monitor the numbers that matter without loading raw transaction history into the browser.</p><ul><li><CheckCircle2 />Votes and revenue over time</li><li><CheckCircle2 />Web versus USSD performance</li><li><CheckCircle2 />Top candidates and categories</li><li><CheckCircle2 />Payment success and failure rates</li></ul></div>
        <div className="analytics-window" aria-label="Example organizer analytics">
          <div className="analytics-top"><div><small>Event performance</small><strong>Live overview</strong></div><span>Last 7 days</span></div>
          <div className="metric-row"><div><small>Total votes</small><strong>24,860</strong><em>+18.4%</em></div><div><small>Gross revenue</small><strong>GH₵24,860</strong><em>+16.1%</em></div><div><small>Success rate</small><strong>94.8%</strong><em>+2.3%</em></div></div>
          <div className="chart-area"><div className="chart-label"><span>Votes over time</span><span>Web&nbsp;&nbsp; USSD</span></div><div className="bar-chart">{[38,52,46,67,59,78,72,88,64,94,81,100].map((height, index) => <i style={{ height: `${height}%` }} key={index}><b style={{ height: `${Math.max(18, height * .38)}%` }} /></i>)}</div></div>
          <div className="analytics-bottom"><span><i />Web<strong>72%</strong></span><span><i />USSD<strong>28%</strong></span></div>
        </div>
      </section>

      <section className="organizer-integrity">
        <div className="integrity-mark"><ShieldCheck /></div><div><span className="eyebrow">Financial integrity by design</span><h2>A successful payment credits votes once.</h2><p>Payment status and vote-processing status remain separate. Verified transactions enter an append-oriented ledger, duplicate provider callbacks add no extra votes, and candidate totals can be reconstructed from transaction history.</p></div>
      </section>

      <section className="organizer-final-cta"><span className="eyebrow">Prepare your next event</span><h2>Give your team a better way to run public voting.</h2><p>Start with event details, schedule, pricing, and voting channels.</p><Link className="organizer-primary" to="/dashboard/events/new">Create your event <ArrowRight /></Link></section>
    </Shell>
  )
}

function PlaceholderPage() {
  return <Shell><section className="message-page"><Trophy /><h1>Coming next</h1><p>This route will be connected in the next frontend phase.</p><Link className="primary-button" to="/events">Explore events</Link></section></Shell>
}

function App() {
  return <BrowserRouter><Routes><Route path="/" element={<HomePage />} /><Route path="/events" element={<ExplorePage />} /><Route path="/organizers" element={<OrganizerPage />} /><Route path="/dashboard" element={<DashboardRoute />} /><Route path="/dashboard/events/new" element={<CreateEventPage />} /><Route path="/dashboard/categories" element={<CategoriesRoute />} /><Route path="/dashboard/candidates" element={<CandidatesRoute />} /><Route path="/dashboard/payments" element={<PaymentsRoute />} /><Route path="*" element={<PlaceholderPage />} /></Routes></BrowserRouter>
}

export default App
