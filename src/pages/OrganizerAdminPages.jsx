import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  ReceiptText,
  Search,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import CreateEventPage from './CreateEventPage.jsx';

const API = import.meta.env.VITE_API_URL || '';

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const error = new Error(body?.error?.message || 'Request failed.');
    error.code = body?.error?.code;
    error.status = response.status;
    throw error;
  }
  return body.data;
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('organizer@tomame.test');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });
  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const session = await api('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(session);
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  return (
    <div className="organizer-login">
      <Link to="/">
        <img src={logo} alt="TomaMe" />
      </Link>
      <form onSubmit={submit}>
        <span className="eyebrow">Organizer workspace</span>
        <h1>Sign in to manage your event.</h1>
        <p>Use your organization administrator account.</p>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength="8"
          />
        </label>
        {state.error && (
          <div className="admin-form-error" role="alert">
            {state.error}
          </div>
        )}
        <button
          className="primary-action"
          disabled={state.loading}
          type="submit"
        >
          {state.loading ? <LoaderCircle className="spin" /> : 'Sign in'}
        </button>
        <Link className="back-public" to="/organizers">
          Back to organizer overview
        </Link>
      </form>
    </div>
  );
}

function AdminLayout({ session, title, description, action, children }) {
  const navigate = useNavigate();
  async function logout() {
    await api('/api/v1/auth/logout', { method: 'POST' });
    navigate('/organizers');
  }
  return (
    <div className="admin-shell management-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/">
          <img src={logo} alt="TomaMe" />
        </Link>
        <nav aria-label="Organizer navigation">
          <NavLink to="/dashboard">
            <LayoutDashboard />
            Overview
          </NavLink>
          <NavLink to="/dashboard/events">
            <CalendarDays />
            Events
          </NavLink>
          <NavLink to="/dashboard/categories">
            <Tag />
            Categories
          </NavLink>
          <NavLink to="/dashboard/candidates">
            <Users />
            Candidates
          </NavLink>
          <NavLink to="/dashboard/payments">
            <ReceiptText />
            Payments
          </NavLink>
        </nav>
        <div className="admin-profile">
          <span>
            {session.user.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </span>
          <div>
            <strong>{session.user.name}</strong>
            <small>{session.organization.name}</small>
          </div>
          <button
            onClick={logout}
            type="button"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut />
          </button>
        </div>
      </aside>
      <div className="management-main">
        <header className="management-header">
          <div>
            <span>{session.organization.name}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {action}
        </header>
        {children}
      </div>
      <nav className="mobile-admin-nav" aria-label="Organizer navigation">
        <NavLink to="/dashboard/events">
          <CalendarDays />
          <span>Events</span>
        </NavLink>
        <NavLink to="/dashboard/categories">
          <Tag />
          <span>Categories</span>
        </NavLink>
        <NavLink to="/dashboard/candidates">
          <Users />
          <span>Candidates</span>
        </NavLink>
        <NavLink to="/dashboard/payments">
          <ReceiptText />
          <span>Payments</span>
        </NavLink>
      </nav>
    </div>
  );
}

function OrganizerGate({ page }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/api/v1/auth/me')
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="admin-loading">
        <LoaderCircle className="spin" />
        Checking access...
      </div>
    );
  if (!session) return <LoginPage onLogin={setSession} />;
  if (page === 'categories') return <CategoriesPage session={session} />;
  if (page === 'candidates') return <CandidatesPage session={session} />;
  if (page === 'payments') return <PaymentsPage session={session} />;
  if (page === 'events') return <OrganizerOverview session={session} eventManagement />;
  if (page === 'create-event') return <CreateEventPage />;
  return <OrganizerOverview session={session} />;
}

function useOrganizerContext() {
  const [context, setContext] = useState({
    events: [],
    loading: true,
    error: '',
  });
  useEffect(() => {
    api('/api/v1/organizer/context')
      .then((data) => setContext({ ...data, loading: false, error: '' }))
      .catch((error) =>
        setContext({ events: [], loading: false, error: error.message }),
      );
  }, []);
  return context;
}

function OrganizerOverview({ session, eventManagement = false }) {
  const [state, setState] = useState({ events: [], loading: true, error: '', pendingId: '' });
  const [editing, setEditing] = useState(null);
  const loadEvents = useCallback(() => {
    api('/api/v1/organizer/context')
      .then((data) => setState((current) => ({ ...current, events: data.events, loading: false, error: '' })))
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, []);
  useEffect(loadEvents, [loadEvents]);

  async function changeVotingStatus(event) {
    const action = event.status === 'PAUSED' ? 'resume' : 'pause';
    setState((current) => ({ ...current, pendingId: event.id, error: '' }));
    try {
      const updated = await api(`/api/v1/organizer/events/${event.id}/voting-status`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setState((current) => ({
        ...current,
        pendingId: '',
        events: current.events.map((item) => item.id === updated.id ? { ...item, status: updated.status } : item),
      }));
    } catch (error) {
      setState((current) => ({ ...current, pendingId: '', error: error.message }));
    }
  }

  async function uploadEventBanner(event, file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setState((current) => ({ ...current, error: 'Choose a JPEG, PNG, or WebP banner no larger than 5 MB.' }));
      return;
    }
    setState((current) => ({ ...current, pendingId: event.id, error: '' }));
    try {
      const uploaded = await api('/api/v1/organizer/event-images', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      const updated = await api(`/api/v1/organizer/events/${event.id}/banner`, { method: 'PATCH', body: JSON.stringify({ bannerUrl: uploaded.bannerUrl }) });
      setState((current) => ({ ...current, pendingId: '', events: current.events.map((item) => item.id === updated.id ? { ...item, bannerUrl: updated.bannerUrl } : item) }));
    } catch (error) {
      setState((current) => ({ ...current, pendingId: '', error: error.message }));
    }
  }

  async function archiveEvent(event) {
    if (!window.confirm(`Archive ${event.name}? It will no longer appear publicly.`)) return;
    setState((current) => ({ ...current, pendingId: event.id, error: '' }));
    try {
      await api(`/api/v1/organizer/events/${event.id}`, { method: 'DELETE' });
      setState((current) => ({ ...current, pendingId: '', events: current.events.filter((item) => item.id !== event.id) }));
    } catch (error) {
      setState((current) => ({ ...current, pendingId: '', error: error.message }));
    }
  }

  return (
    <AdminLayout session={session} title={eventManagement ? 'Events' : 'Overview'} description={eventManagement ? 'Manage event details, publishing assets, and voting availability.' : 'Control voting availability across your events.'} action={eventManagement ? <Link className="primary-action" to="/dashboard/events/new"><Plus /> New event</Link> : undefined}>
      {state.error && <div className="admin-alert">{state.error}</div>}
      {state.loading ? <AdminLoading /> : state.events.length ? (
        <div className="event-control-list">
          {state.events.map((event) => {
            const controllable = event.status === 'ACTIVE' || event.status === 'PAUSED';
            return (
              <article className="event-control-row" key={event.id}>
                <div className={`event-control-icon ${event.bannerUrl ? 'has-banner' : ''}`}>
                  {event.bannerUrl ? <img src={event.bannerUrl} alt="" /> : <CalendarDays />}
                </div>
                <div><h2>{event.name}</h2><span className={`event-state ${event.status.toLowerCase()}`}>{event.status}</span></div>
                <div className="event-control-actions">
                  <button className="secondary-action" type="button" onClick={() => setEditing(event)}><Pencil /> Edit details</button>
                  <label className="secondary-action">
                    <ImagePlus /> {event.bannerUrl ? 'Replace banner' : 'Add banner'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={state.pendingId === event.id} onChange={(input) => uploadEventBanner(event, input.target.files?.[0])} />
                  </label>
                  {controllable && (
                    <button className={event.status === 'PAUSED' ? 'primary-action' : 'suspend-action'} type="button" disabled={state.pendingId === event.id} onClick={() => changeVotingStatus(event)}>
                      {state.pendingId === event.id ? <LoaderCircle className="spin" /> : event.status === 'PAUSED' ? <PlayCircle /> : <PauseCircle />}
                      {event.status === 'PAUSED' ? 'Resume voting' : 'Pause voting'}
                    </button>
                  )}
                  <button className="icon-action event-archive" type="button" title="Archive event" disabled={state.pendingId === event.id || event.status === 'ACTIVE'} onClick={() => archiveEvent(event)}><Archive /></button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <AdminEmpty icon={CalendarDays} title="No events yet" text="Create an event to manage voting availability." />}
      {editing && <EventEditForm event={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadEvents(); }} />}
    </AdminLayout>
  );
}

function EventEditForm({ event, onClose, onSaved }) {
  const datePart = (value) => new Date(value).toISOString().slice(0, 16);
  const [form, setForm] = useState({
    name: event.name, description: event.description || '', startAt: datePart(event.startAt), endAt: datePart(event.endAt),
    timezone: event.timezone, currency: event.currency, defaultVotePrice: String(event.defaultVotePrice / 100),
    minimumVotes: String(event.minimumVotes), maximumVotesPerTransaction: String(event.maximumVotesPerTransaction),
    webVotingEnabled: event.webVotingEnabled, ussdVotingEnabled: event.ussdVotingEnabled, resultsVisibility: event.resultsVisibility,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(submitEvent) {
    submitEvent.preventDefault(); setSaving(true); setError('');
    try {
      await api(`/api/v1/organizer/events/${event.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString(), defaultVotePrice: Math.round(Number(form.defaultVotePrice) * 100), minimumVotes: Number(form.minimumVotes), maximumVotesPerTransaction: Number(form.maximumVotesPerTransaction) }) });
      onSaved();
    } catch (err) { setError(err.message); setSaving(false); }
  }
  return <Dialog title="Edit event" onClose={onClose}><form className="admin-form" onSubmit={submit}>
    <label>Event name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
    <label>Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
    <div className="admin-form-row"><label>Starts<input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required /></label><label>Ends<input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} required /></label></div>
    <div className="admin-form-row"><label>Currency<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option>GHS</option><option>NGN</option><option>USD</option></select></label><label>Price per vote<input type="number" min="0.01" step="0.01" value={form.defaultVotePrice} onChange={(e) => setForm({ ...form, defaultVotePrice: e.target.value })} required /></label></div>
    <div className="admin-form-row"><label>Minimum votes<input type="number" min="1" value={form.minimumVotes} onChange={(e) => setForm({ ...form, minimumVotes: e.target.value })} required /></label><label>Maximum per transaction<input type="number" min="1" value={form.maximumVotesPerTransaction} onChange={(e) => setForm({ ...form, maximumVotesPerTransaction: e.target.value })} required /></label></div>
    <div className="admin-form-row"><label className="admin-check"><input type="checkbox" checked={form.webVotingEnabled} onChange={(e) => setForm({ ...form, webVotingEnabled: e.target.checked })} /> Web voting</label><label className="admin-check"><input type="checkbox" checked={form.ussdVotingEnabled} onChange={(e) => setForm({ ...form, ussdVotingEnabled: e.target.checked })} /> USSD voting</label></div>
    <label>Results visibility<select value={form.resultsVisibility} onChange={(e) => setForm({ ...form, resultsVisibility: e.target.value })}>{['EXACT_TOTALS','PERCENTAGES','RANKING_ONLY','HIDDEN_UNTIL_END','ADMIN_ONLY','MANUAL_RELEASE'].map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
    {error && <div className="admin-form-error">{error}</div>}<div className="dialog-actions"><button className="secondary-action" type="button" onClick={onClose}>Cancel</button><button className="primary-action" disabled={saving} type="submit">{saving && <LoaderCircle className="spin" />} Save changes</button></div>
  </form></Dialog>;
}

function Dialog({ title, onClose, children }) {
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <header>
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function CategoriesPage({ session }) {
  const context = useOrganizerContext();
  const [eventId, setEventId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => {
    api(`/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ''}`)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);
  useEffect(load, [load]);
  async function archive(item) {
    if (!window.confirm(`Archive ${item.name}?`)) return;
    try {
      await api(`/api/v1/organizer/categories/${item.id}`, {
        method: 'DELETE',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <AdminLayout
      session={session}
      title="Categories"
      description="Organize candidates within each event."
      action={
        <button
          className="primary-action"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus />
          New category
        </button>
      }
    >
      <div className="management-toolbar">
        <label>
          Event
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
          >
            <option value="">All events</option>
            {context.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <ChevronDown />
        </label>
        <span>{items.length} categories</span>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      {loading ? (
        <AdminLoading />
      ) : items.length ? (
        <div className="management-grid">
          {items.map((item) => (
            <article className="management-card" key={item.id}>
              <div className="management-card-icon">
                <Tag />
              </div>
              <span>{item.event.name}</span>
              <h2>{item.name}</h2>
              <p>{item.description || 'No description added.'}</p>
              <footer>
                <strong>{item._count.candidates} candidates</strong>
                <div className="card-actions"><button type="button" title="Edit category" onClick={() => setEditing(item)}><Pencil /></button><button
                  onClick={() => archive(item)}
                  type="button"
                  title="Archive category"
                >
                  <Archive />
                </button></div>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <AdminEmpty
          icon={Tag}
          title="No categories yet"
          text="Create the first category for an event."
        />
      )}
      {showForm && (
        <CategoryForm
          events={context.events}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {editing && (
        <CategoryForm item={editing} events={context.events} onClose={() => setEditing(null)} onCreated={() => { setEditing(null); load(); }} />
      )}
    </AdminLayout>
  );
}

function CategoryForm({ events, item, onClose, onCreated }) {
  const [form, setForm] = useState({
    eventId: item?.eventId || events[0]?.id || '',
    name: item?.name || '',
    description: item?.description || '',
    votePriceOverride: item?.votePriceOverride ? String(item.votePriceOverride / 100) : '',
  });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    try {
      await api(item ? `/api/v1/organizer/categories/${item.id}` : '/api/v1/organizer/categories', {
        method: item ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...form, ...(item ? { eventId: undefined } : {}),
          votePriceOverride: form.votePriceOverride
            ? Math.round(Number(form.votePriceOverride) * 100)
            : null,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Dialog title={item ? 'Edit category' : 'Create category'} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label>
          Event
          <select
            value={form.eventId}
            onChange={(event) =>
              setForm({ ...form, eventId: event.target.value })
            }
            required
            disabled={Boolean(item)}
          >
            <option value="" disabled>
              Select event
            </option>
            {events.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category name
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Entrepreneur of the Year"
            required
          />
        </label>
        <label>
          Description
          <textarea
            rows="4"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        <label>
          Price override in GHS <small>Optional</small>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.votePriceOverride}
            onChange={(event) =>
              setForm({ ...form, votePriceOverride: event.target.value })
            }
            placeholder="Use event price"
          />
        </label>
        {error && <div className="admin-form-error">{error}</div>}
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action" type="submit">
            {item ? 'Save changes' : 'Create category'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function CandidatesPage({ session }) {
  const context = useOrganizerContext();
  const [eventId, setEventId] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const load = useCallback(() => {
    Promise.all([
      api(
        `/api/v1/organizer/candidates${eventId ? `?eventId=${eventId}` : ''}`,
      ),
      api(
        `/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ''}`,
      ),
    ])
      .then(([candidates, categoryData]) => {
        setItems(candidates);
        setCategories(categoryData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);
  useEffect(load, [load]);
  async function archive(item) {
    if (!window.confirm(`Archive ${item.name}?`)) return;
    try {
      await api(`/api/v1/organizer/candidates/${item.id}`, {
        method: 'DELETE',
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <AdminLayout
      session={session}
      title="Candidates"
      description="Manage candidate identity, codes, and category placement."
      action={
        <button
          className="primary-action"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus />
          New candidate
        </button>
      }
    >
      <div className="management-toolbar">
        <label>
          Event
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
          >
            <option value="">All events</option>
            {context.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <ChevronDown />
        </label>
        <span>{items.length} candidates</span>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      {loading ? (
        <AdminLoading />
      ) : items.length ? (
        <div className="candidate-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Code</th>
                <th>Category</th>
                <th>Event</th>
                <th>Votes</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-person">
                      <span className={item.photoUrl ? 'has-photo' : ''}>
                        {item.photoUrl ? <img src={item.photoUrl} alt="" /> : item.name
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      <strong>{item.name}</strong>
                    </div>
                  </td>
                  <td>
                    <b className="table-code">{item.candidateCode}</b>
                  </td>
                  <td>{item.category.name}</td>
                  <td>{item.event.name}</td>
                  <td>{item.cachedVoteCount.toLocaleString()}</td>
                  <td>
                    <div className="table-actions"><button type="button" className="table-action" title="Edit candidate" onClick={() => setEditingCandidate(item)}><Pencil /></button><button
                      className="table-action"
                      onClick={() => archive(item)}
                      type="button"
                      title="Archive candidate"
                    >
                      <Archive />
                    </button></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmpty
          icon={Users}
          title="No candidates yet"
          text="Add candidates after creating an event category."
        />
      )}
      {showForm && (
        <CandidateForm
          events={context.events}
          categories={categories}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {editingCandidate && (
        <CandidateForm item={editingCandidate} events={context.events} categories={categories} onClose={() => setEditingCandidate(null)} onCreated={() => { setEditingCandidate(null); load(); }} />
      )}
    </AdminLayout>
  );
}

function CandidateForm({ events, categories, item, onClose, onCreated }) {
  const [form, setForm] = useState({
    eventId: item?.eventId || events[0]?.id || '',
    categoryId: item?.categoryId || '',
    name: item?.name || '',
    candidateCode: item?.candidateCode || '',
    slogan: item?.slogan || '',
    biography: item?.biography || '',
    photoUrl: item?.photoUrl || '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(item?.photoUrl || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);
  const available = categories.filter((item) => item.eventId === form.eventId);
  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      let photoUrl = form.photoUrl;
      if (photo) {
        const uploaded = await api('/api/v1/organizer/candidate-images', {
          method: 'POST',
          headers: { 'Content-Type': photo.type },
          body: photo,
        });
        photoUrl = uploaded.photoUrl;
      }
      await api(item ? `/api/v1/organizer/candidates/${item.id}` : '/api/v1/organizer/candidates', {
        method: item ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, ...(item ? { eventId: undefined } : {}), photoUrl }),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }
  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP image no larger than 5 MB.');
      event.target.value = '';
      return;
    }
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }
  return (
    <Dialog title={item ? 'Edit candidate' : 'Add candidate'} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label className={`candidate-photo-upload ${photoPreview ? 'has-image' : ''}`}>
          {photoPreview ? <img src={photoPreview} alt="Candidate preview" /> : <><ImagePlus /><strong>Upload candidate photo</strong><small>JPEG, PNG or WebP, up to 5 MB</small></>}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
        </label>
        <div className="admin-form-row">
          <label>
            Event
            <select
              value={form.eventId}
              onChange={(event) =>
                setForm({
                  ...form,
                  eventId: event.target.value,
                  categoryId: '',
                })
              }
              required
              disabled={Boolean(item)}
            >
              <option value="" disabled>
                Select event
              </option>
              {events.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {available.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Candidate name
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
            />
          </label>
          <label>
            Candidate code
            <input
              value={form.candidateCode}
              onChange={(event) =>
                setForm({
                  ...form,
                  candidateCode: event.target.value.toUpperCase(),
                })
              }
              placeholder="EOY04"
              pattern="[A-Z0-9-]{2,20}"
              required
            />
          </label>
        </div>
        <label>
          Slogan
          <input
            value={form.slogan}
            onChange={(event) =>
              setForm({ ...form, slogan: event.target.value })
            }
          />
        </label>
        <label>
          Biography
          <textarea
            rows="4"
            value={form.biography}
            onChange={(event) =>
              setForm({ ...form, biography: event.target.value })
            }
          />
        </label>
        {error && <div className="admin-form-error">{error}</div>}
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action" type="submit" disabled={submitting}>
            {submitting && <LoaderCircle className="spin" />}
            {submitting ? 'Saving...' : item ? 'Save changes' : 'Add candidate'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function PaymentsPage({ session }) {
  const context = useOrganizerContext();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [eventId, setEventId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState({
    items: [],
    summary: { total: 0, failed: 0, successRate: 0, creditedVotes: 0, revenueByCurrency: [] },
    pagination: { page: 1, total: 0, pageCount: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api(
      `/api/v1/organizer/payments?search=${encodeURIComponent(search)}&page=${page}${status ? `&status=${status}` : ''}${eventId ? `&eventId=${eventId}` : ''}`,
    )
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId, page, search, status]);
  useEffect(load, [load]);
  const revenue = data.summary.revenueByCurrency
    .map((item) => `${item.currency} ${(item.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
    .join(' / ') || 'GHS 0.00';
  function exportPage() {
    const headings = ['Reference', 'Event', 'Candidate', 'Votes', 'Channel', 'Amount', 'Currency', 'Status', 'Date'];
    const rows = data.items.map((item) => [item.reference, item.order.event.name, item.order.candidate.name, item.order.quantity, item.order.channel, (item.amount / 100).toFixed(2), item.currency, item.status, item.createdAt]);
    const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const blob = new Blob([[headings, ...rows].map((row) => row.map(quote).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tomame-payments-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <AdminLayout
      session={session}
      title="Payments"
      description="Review provider-confirmed transactions and their credited votes."
    >
      <div className="payment-summary">
        <div>
          <small>Transactions</small>
          <strong>{data.summary.total.toLocaleString()}</strong>
        </div>
        <div>
          <small>Confirmed revenue</small>
          <strong>
            GH₵
            {revenue.replace(/^GHS /, '')}
          </strong>
        </div>
        <div>
          <small>Votes credited</small>
          <strong>{data.summary.creditedVotes.toLocaleString()}</strong>
        </div>
        <div>
          <small>Success rate</small>
          <strong>{data.summary.successRate.toFixed(1)}%</strong>
        </div>
        <div>
          <small>Failed payments</small>
          <strong>{data.summary.failed.toLocaleString()}</strong>
        </div>
      </div>
      <div className="management-toolbar payment-toolbar">
        <label>
          Event
          <select value={eventId} onChange={(event) => { setEventId(event.target.value); setPage(1); }}>
            <option value="">All events</option>
            {context.events.map((item) => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
          <ChevronDown />
        </label>
        <label className="admin-search">
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Reference or candidate"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {[
              'PENDING',
              'PROCESSING',
              'PAID',
              'FAILED',
              'CANCELLED',
              'EXPIRED',
              'REFUNDED',
            ].map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown />
        </label>
        <button className="secondary-action payment-export" type="button" onClick={exportPage} disabled={!data.items.length}>
          <Download /> Export page
        </button>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      {loading ? (
        <AdminLoading />
      ) : data.items.length ? (
        <div className="candidate-table-wrap">
          <table className="admin-table payment-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Candidate</th>
                <th>Event</th>
                <th>Votes</th>
                <th>Channel</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b className="table-reference">{item.reference}</b>
                  </td>
                  <td>
                    {item.order.candidate.name}
                    <small>{item.order.candidate.candidateCode}</small>
                  </td>
                  <td>
                    {item.order.event.name}
                    <small>{item.order.category.name}</small>
                  </td>
                  <td>{item.order.quantity}</td>
                  <td>{item.order.channel}</td>
                  <td>
                    {item.currency} {(item.amount / 100).toFixed(2)}
                  </td>
                  <td>{item.paymentMethod?.replaceAll('_', ' ') || '—'}</td>
                  <td>
                    <span
                      className={`payment-status ${item.status.toLowerCase()}`}
                    >
                      <i />
                      {item.status}
                    </span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="icon-action" type="button" title="View transaction" onClick={() => setSelected(item)}>
                      <Eye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="payment-pagination">
            <span>Page {data.pagination.page} of {data.pagination.pageCount}</span>
            <div>
              <button type="button" title="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button>
              <button type="button" title="Next page" disabled={page >= data.pagination.pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button>
            </div>
          </div>
        </div>
      ) : (
        <AdminEmpty
          icon={ReceiptText}
          title="No payments found"
          text="Verified event payments will appear here."
        />
      )}
      {selected && (
        <Dialog title="Transaction details" onClose={() => setSelected(null)}>
          <div className="payment-detail">
            <div className="payment-detail-status">
              <CheckCircle2 />
              <div><small>Payment status</small><strong>{selected.status}</strong></div>
              <span>{selected.currency} {(selected.amount / 100).toFixed(2)}</span>
            </div>
            <dl>
              <div><dt>Reference</dt><dd>{selected.reference}</dd></div>
              <div><dt>Provider reference</dt><dd>{selected.providerTransactionId || '-'}</dd></div>
              <div><dt>Event</dt><dd>{selected.order.event.name}</dd></div>
              <div><dt>Category</dt><dd>{selected.order.category.name}</dd></div>
              <div><dt>Candidate</dt><dd>{selected.order.candidate.name}</dd></div>
              <div><dt>Voter phone</dt><dd>{selected.order.voterPhone}</dd></div>
              <div><dt>Requested votes</dt><dd>{selected.order.quantity.toLocaleString()}</dd></div>
              <div><dt>Provider</dt><dd>{selected.provider}</dd></div>
              <div><dt>Paid at</dt><dd>{selected.providerPaidAt ? new Date(selected.providerPaidAt).toLocaleString() : '-'}</dd></div>
            </dl>
          </div>
        </Dialog>
      )}
    </AdminLayout>
  );
}

function AdminLoading() {
  return (
    <div className="admin-loading inline">
      <LoaderCircle className="spin" />
      Loading...
    </div>
  );
}
function AdminEmpty({ icon: Icon, title, text }) {
  return (
    <div className="admin-empty">
      <Icon />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export function CategoriesRoute() {
  return <OrganizerGate page="categories" />;
}
export function CandidatesRoute() {
  return <OrganizerGate page="candidates" />;
}
export function PaymentsRoute() {
  return <OrganizerGate page="payments" />;
}
export function DashboardRoute() {
  return <OrganizerGate page="overview" />;
}
export function EventsRoute() {
  return <OrganizerGate page="events" />;
}
export function CreateEventRoute() {
  return <OrganizerGate page="create-event" />;
}
