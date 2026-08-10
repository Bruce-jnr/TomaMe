import { useCallback, useEffect, useState } from 'react'
import { Archive, CalendarDays, ChevronDown, LayoutDashboard, LoaderCircle, LogOut, Plus, ReceiptText, Search, Tag, Users, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'

const API = import.meta.env.VITE_API_URL || ''

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.success) {
    const error = new Error(body?.error?.message || 'Request failed.')
    error.code = body?.error?.code
    error.status = response.status
    throw error
  }
  return body.data
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('organizer@tomame.test')
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ loading: false, error: '' })
  async function submit(event) {
    event.preventDefault()
    setState({ loading: true, error: '' })
    try {
      const session = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      onLogin(session)
    } catch (error) { setState({ loading: false, error: error.message }) }
  }
  return <div className="organizer-login"><Link to="/"><img src={logo} alt="TomaMe" /></Link><form onSubmit={submit}><span className="eyebrow">Organizer workspace</span><h1>Sign in to manage your event.</h1><p>Use your organization administrator account.</p><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" /></label>{state.error && <div className="admin-form-error" role="alert">{state.error}</div>}<button className="primary-action" disabled={state.loading} type="submit">{state.loading ? <LoaderCircle className="spin" /> : 'Sign in'}</button><Link className="back-public" to="/organizers">Back to organizer overview</Link></form></div>
}

function AdminLayout({ session, title, description, action, children }) {
  const navigate = useNavigate()
  async function logout() { await api('/api/v1/auth/logout', { method: 'POST' }); navigate('/organizers') }
  return <div className="admin-shell management-shell"><aside className="admin-sidebar"><Link className="admin-brand" to="/"><img src={logo} alt="TomaMe" /></Link><nav aria-label="Organizer navigation"><NavLink to="/dashboard"><LayoutDashboard />Overview</NavLink><NavLink to="/dashboard/events/new"><CalendarDays />Events</NavLink><NavLink to="/dashboard/categories"><Tag />Categories</NavLink><NavLink to="/dashboard/candidates"><Users />Candidates</NavLink><NavLink to="/dashboard/payments"><ReceiptText />Payments</NavLink></nav><div className="admin-profile"><span>{session.user.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><div><strong>{session.user.name}</strong><small>{session.organization.name}</small></div><button onClick={logout} type="button" title="Sign out" aria-label="Sign out"><LogOut /></button></div></aside><div className="management-main"><header className="management-header"><div><span>{session.organization.name}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>{children}</div><nav className="mobile-admin-nav" aria-label="Organizer navigation"><NavLink to="/dashboard"><LayoutDashboard /><span>Overview</span></NavLink><NavLink to="/dashboard/categories"><Tag /><span>Categories</span></NavLink><NavLink to="/dashboard/candidates"><Users /><span>Candidates</span></NavLink><NavLink to="/dashboard/payments"><ReceiptText /><span>Payments</span></NavLink></nav></div>
}

function OrganizerGate({ page }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api('/api/v1/auth/me').then(setSession).catch(() => setSession(null)).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="admin-loading"><LoaderCircle className="spin" />Checking access...</div>
  if (!session) return <LoginPage onLogin={setSession} />
  if (page === 'categories') return <CategoriesPage session={session} />
  if (page === 'candidates') return <CandidatesPage session={session} />
  if (page === 'payments') return <PaymentsPage session={session} />
  return <AdminLayout session={session} title="Overview" description="Your organization workspace."><div className="admin-empty"><LayoutDashboard /><h2>Organizer overview</h2><p>Use the navigation to manage categories, candidates, and payments.</p></div></AdminLayout>
}

function useOrganizerContext() {
  const [context, setContext] = useState({ events: [], loading: true, error: '' })
  useEffect(() => { api('/api/v1/organizer/context').then((data) => setContext({ ...data, loading: false, error: '' })).catch((error) => setContext({ events: [], loading: false, error: error.message })) }, [])
  return context
}

function Dialog({ title, onClose, children }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><h2 id="dialog-title">{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button></header>{children}</section></div>
}

function CategoriesPage({ session }) {
  const context = useOrganizerContext()
  const [eventId, setEventId] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const load = useCallback(() => { api(`/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ''}`).then(setItems).catch((err) => setError(err.message)).finally(() => setLoading(false)) }, [eventId])
  useEffect(load, [load])
  async function archive(item) { if (!window.confirm(`Archive ${item.name}?`)) return; try { await api(`/api/v1/organizer/categories/${item.id}`, { method: 'DELETE' }); load() } catch (err) { setError(err.message) } }
  return <AdminLayout session={session} title="Categories" description="Organize candidates within each event." action={<button className="primary-action" onClick={() => setShowForm(true)} type="button"><Plus />New category</button>}><div className="management-toolbar"><label>Event<select value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">All events</option>{context.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select><ChevronDown /></label><span>{items.length} categories</span></div>{error && <div className="admin-alert">{error}</div>}{loading ? <AdminLoading /> : items.length ? <div className="management-grid">{items.map((item) => <article className="management-card" key={item.id}><div className="management-card-icon"><Tag /></div><span>{item.event.name}</span><h2>{item.name}</h2><p>{item.description || 'No description added.'}</p><footer><strong>{item._count.candidates} candidates</strong><button onClick={() => archive(item)} type="button" title="Archive category"><Archive /></button></footer></article>)}</div> : <AdminEmpty icon={Tag} title="No categories yet" text="Create the first category for an event." />}{showForm && <CategoryForm events={context.events} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load() }} />}</AdminLayout>
}

function CategoryForm({ events, onClose, onCreated }) {
  const [form, setForm] = useState({ eventId: events[0]?.id || '', name: '', description: '', votePriceOverride: '' })
  const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); try { await api('/api/v1/organizer/categories', { method: 'POST', body: JSON.stringify({ ...form, votePriceOverride: form.votePriceOverride ? Math.round(Number(form.votePriceOverride) * 100) : null }) }); onCreated() } catch (err) { setError(err.message) } }
  return <Dialog title="Create category" onClose={onClose}><form className="admin-form" onSubmit={submit}><label>Event<select value={form.eventId} onChange={(event) => setForm({ ...form, eventId: event.target.value })} required><option value="" disabled>Select event</option>{events.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Category name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Entrepreneur of the Year" required /></label><label>Description<textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Price override in GHS <small>Optional</small><input type="number" min="0.01" step="0.01" value={form.votePriceOverride} onChange={(event) => setForm({ ...form, votePriceOverride: event.target.value })} placeholder="Use event price" /></label>{error && <div className="admin-form-error">{error}</div>}<div className="dialog-actions"><button className="secondary-action" type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit">Create category</button></div></form></Dialog>
}

function CandidatesPage({ session }) {
  const context = useOrganizerContext()
  const [eventId, setEventId] = useState('')
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const load = useCallback(() => { Promise.all([api(`/api/v1/organizer/candidates${eventId ? `?eventId=${eventId}` : ''}`), api(`/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ''}`)]).then(([candidates, categoryData]) => { setItems(candidates); setCategories(categoryData) }).catch((err) => setError(err.message)).finally(() => setLoading(false)) }, [eventId])
  useEffect(load, [load])
  async function archive(item) { if (!window.confirm(`Archive ${item.name}?`)) return; try { await api(`/api/v1/organizer/candidates/${item.id}`, { method: 'DELETE' }); load() } catch (err) { setError(err.message) } }
  return <AdminLayout session={session} title="Candidates" description="Manage candidate identity, codes, and category placement." action={<button className="primary-action" onClick={() => setShowForm(true)} type="button"><Plus />New candidate</button>}><div className="management-toolbar"><label>Event<select value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">All events</option>{context.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select><ChevronDown /></label><span>{items.length} candidates</span></div>{error && <div className="admin-alert">{error}</div>}{loading ? <AdminLoading /> : items.length ? <div className="candidate-table-wrap"><table className="admin-table"><thead><tr><th>Candidate</th><th>Code</th><th>Category</th><th>Event</th><th>Votes</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="table-person"><span>{item.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><strong>{item.name}</strong></div></td><td><b className="table-code">{item.candidateCode}</b></td><td>{item.category.name}</td><td>{item.event.name}</td><td>{item.cachedVoteCount.toLocaleString()}</td><td><button className="table-action" onClick={() => archive(item)} type="button" title="Archive candidate"><Archive /></button></td></tr>)}</tbody></table></div> : <AdminEmpty icon={Users} title="No candidates yet" text="Add candidates after creating an event category." />}{showForm && <CandidateForm events={context.events} categories={categories} onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load() }} />}</AdminLayout>
}

function CandidateForm({ events, categories, onClose, onCreated }) {
  const [form, setForm] = useState({ eventId: events[0]?.id || '', categoryId: '', name: '', candidateCode: '', slogan: '', biography: '' })
  const [error, setError] = useState('')
  const available = categories.filter((item) => item.eventId === form.eventId)
  async function submit(event) { event.preventDefault(); try { await api('/api/v1/organizer/candidates', { method: 'POST', body: JSON.stringify(form) }); onCreated() } catch (err) { setError(err.message) } }
  return <Dialog title="Add candidate" onClose={onClose}><form className="admin-form" onSubmit={submit}><div className="admin-form-row"><label>Event<select value={form.eventId} onChange={(event) => setForm({ ...form, eventId: event.target.value, categoryId: '' })} required><option value="" disabled>Select event</option>{events.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Category<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required><option value="" disabled>Select category</option>{available.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><div className="admin-form-row"><label>Candidate name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Candidate code<input value={form.candidateCode} onChange={(event) => setForm({ ...form, candidateCode: event.target.value.toUpperCase() })} placeholder="EOY04" pattern="[A-Z0-9-]{2,20}" required /></label></div><label>Slogan<input value={form.slogan} onChange={(event) => setForm({ ...form, slogan: event.target.value })} /></label><label>Biography<textarea rows="4" value={form.biography} onChange={(event) => setForm({ ...form, biography: event.target.value })} /></label>{error && <div className="admin-form-error">{error}</div>}<div className="dialog-actions"><button className="secondary-action" type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit">Add candidate</button></div></form></Dialog>
}

function PaymentsPage({ session }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [data, setData] = useState({ items: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(() => { api(`/api/v1/organizer/payments?search=${encodeURIComponent(search)}${status ? `&status=${status}` : ''}`).then(setData).catch((err) => setError(err.message)).finally(() => setLoading(false)) }, [search, status])
  useEffect(load, [load])
  return <AdminLayout session={session} title="Payments" description="Review provider-confirmed transactions and their credited votes."><div className="payment-summary"><div><small>Transactions</small><strong>{data.pagination.total}</strong></div><div><small>Visible revenue</small><strong>GH₵{(data.items.reduce((total, item) => total + item.amount, 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div><div><small>Paid</small><strong>{data.items.filter((item) => item.status === 'PAID').length}</strong></div></div><div className="management-toolbar payment-toolbar"><label className="admin-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference or candidate" /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['PENDING','PROCESSING','PAID','FAILED','CANCELLED','EXPIRED','REFUNDED'].map((item) => <option value={item} key={item}>{item}</option>)}</select><ChevronDown /></label></div>{error && <div className="admin-alert">{error}</div>}{loading ? <AdminLoading /> : data.items.length ? <div className="candidate-table-wrap"><table className="admin-table payment-table"><thead><tr><th>Reference</th><th>Candidate</th><th>Votes</th><th>Channel</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><b className="table-reference">{item.reference}</b></td><td>{item.order.candidate.name}<small>{item.order.candidate.candidateCode}</small></td><td>{item.order.quantity}</td><td>{item.order.channel}</td><td>{item.currency} {(item.amount / 100).toFixed(2)}</td><td>{item.paymentMethod?.replaceAll('_',' ') || '—'}</td><td><span className={`payment-status ${item.status.toLowerCase()}`}><i />{item.status}</span></td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <AdminEmpty icon={ReceiptText} title="No payments found" text="Verified event payments will appear here." />}</AdminLayout>
}

function AdminLoading() { return <div className="admin-loading inline"><LoaderCircle className="spin" />Loading...</div> }
function AdminEmpty({ icon: Icon, title, text }) { return <div className="admin-empty"><Icon /><h2>{title}</h2><p>{text}</p></div> }

export function CategoriesRoute() { return <OrganizerGate page="categories" /> }
export function CandidatesRoute() { return <OrganizerGate page="candidates" /> }
export function PaymentsRoute() { return <OrganizerGate page="payments" /> }
export function DashboardRoute() { return <OrganizerGate page="overview" /> }
