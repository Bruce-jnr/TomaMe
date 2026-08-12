import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  ClipboardList,
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
  Settings,
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
    const error = new Error(body?.error?.message || (response.status === 429 ? 'Too many attempts. Please wait before trying again.' : 'Request failed.'));
    error.code = body?.error?.code;
    error.status = response.status;
    throw error;
  }
  return body.data;
}

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });
  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const session = await api('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (session.mfaRequired) {
        setChallengeId(session.challengeId); setOtp(''); setMode('mfa'); setState({ loading: false, error: '' });
      } else await onLogin(session);
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function confirmMfa(event) {
    event.preventDefault(); setState({ loading: true, error: '' });
    try {
      const session = await api('/api/v1/auth/login/mfa', { method: 'POST', body: JSON.stringify({ challengeId, otp }) });
      await onLogin(session);
    } catch (error) { setState({ loading: false, error: error.message }); }
  }
  async function requestReset(event) {
    event.preventDefault(); setState({ loading: true, error: '' });
    try {
      const data = await api('/api/v1/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
      setChallengeId(data.challengeId); setMode('confirm'); setState({ loading: false, error: '' });
    } catch (error) { setState({ loading: false, error: error.message }); }
  }
  async function confirmReset(event) {
    event.preventDefault();
    if (password !== confirmPassword) { setState({ loading: false, error: 'Passwords do not match.' }); return; }
    setState({ loading: true, error: '' });
    try {
      await api('/api/v1/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ challengeId, otp, password }) });
      setPassword(''); setConfirmPassword(''); setOtp(''); setMode('login'); setState({ loading: false, error: '' });
    } catch (error) { setState({ loading: false, error: error.message }); }
  }
  if (mode === 'mfa') return (
    <div className="organizer-login"><Link to="/"><img src={logo} alt="TomaMe" /></Link>
      <form onSubmit={confirmMfa}><span className="eyebrow">Two-factor authentication</span><h1>Verify your sign-in.</h1><p>Enter the six-digit code sent to your trusted phone.</p>
        <label>Six-digit OTP<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} required /></label>
        {state.error && <div className="admin-form-error" role="alert">{state.error}</div>}
        <button className="primary-action" disabled={state.loading} type="submit">{state.loading ? <LoaderCircle className="spin" /> : 'Verify and sign in'}</button>
        <button className="login-text-action" type="button" onClick={() => { setMode('login'); setOtp(''); setState({ loading: false, error: '' }); }}>Back to sign in</button>
      </form>
    </div>
  );
  if (mode !== 'login') return (
    <div className="organizer-login"><Link to="/"><img src={logo} alt="TomaMe" /></Link>
      <form onSubmit={mode === 'request' ? requestReset : confirmReset}>
        <span className="eyebrow">Account recovery</span>
        <h1>{mode === 'request' ? 'Reset your password.' : 'Enter your reset code.'}</h1>
        <p>{mode === 'request' ? 'We will send a six-digit OTP to your registered recovery phone.' : 'The SMS code expires after 10 minutes.'}</p>
        {mode === 'request' ? <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label> : <>
          <label>Six-digit OTP<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} required /></label>
          <label>New password<input type="password" autoComplete="new-password" minLength="10" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength="10" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
        </>}
        {state.error && <div className="admin-form-error" role="alert">{state.error}</div>}
        <button className="primary-action" disabled={state.loading} type="submit">{state.loading ? <LoaderCircle className="spin" /> : mode === 'request' ? 'Send reset code' : 'Reset password'}</button>
        <button className="login-text-action" type="button" onClick={() => { setMode('login'); setState({ loading: false, error: '' }); }}>Back to sign in</button>
      </form>
    </div>
  );
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
        <button className="login-text-action" type="button" onClick={() => { setMode('request'); setState({ loading: false, error: '' }); }}>
          Forgot password?
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
          <NavLink to="/dashboard/settings">
            <Settings />
            Settings
          </NavLink>
          {session.role === 'ORGANIZATION_OWNER' && <NavLink to="/dashboard/audit-logs">
            <ClipboardList />
            Audit logs
          </NavLink>}
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
          <button className="mobile-admin-logout" onClick={logout} type="button" title="Sign out" aria-label="Sign out">
            <LogOut />
          </button>
        </header>
        {children}
      </div>
      <nav className={`mobile-admin-nav ${session.role === 'ORGANIZATION_OWNER' ? 'has-audit' : ''}`} aria-label="Organizer navigation">
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
        <NavLink to="/dashboard/settings">
          <Settings />
          <span>Settings</span>
        </NavLink>
        {session.role === 'ORGANIZATION_OWNER' && <NavLink to="/dashboard/audit-logs">
          <ClipboardList />
          <span>Audit</span>
        </NavLink>}
      </nav>
    </div>
  );
}

function OrganizerGate({ page }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const completeLogin = useCallback(async () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setLoading(true);
    try {
      setSession(await api('/api/v1/auth/me'));
    } finally {
      setLoading(false);
    }
  }, []);
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
  if (!session) return <LoginPage onLogin={completeLogin} />;
  if (page === 'categories') return <CategoriesPage session={session} />;
  if (page === 'candidates') return <CandidatesPage session={session} />;
  if (page === 'payments') return <PaymentsPage session={session} />;
  if (page === 'settings') return <SettingsPage session={session} />;
  if (page === 'audit-logs') return <AuditLogsPage session={session} />;
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

function RecoveryPhonePanel({ initialPhone, onPhoneUpdated }) {
  const [open, setOpen] = useState(!initialPhone);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ loading: false, error: '', saved: false });
  async function submit(event) {
    event.preventDefault(); setState({ loading: true, error: '', saved: false });
    try {
      const updated = await api('/api/v1/auth/me/phone', { method: 'PATCH', body: JSON.stringify({ phone, password }) });
      setPhone(updated.phone); onPhoneUpdated?.(updated.phone); setPassword(''); setOpen(false); setState({ loading: false, error: '', saved: true });
    } catch (error) { setState({ loading: false, error: error.message, saved: false }); }
  }
  return <section className="recovery-phone-panel">
    <div><small>Password recovery</small><strong>{phone ? `SMS recovery: ${phone.replace(/.(?=.{4})/g, '•')}` : 'Add a recovery phone'}</strong></div>
    {!open && <button className="secondary-action" type="button" onClick={() => setOpen(true)}><Pencil /> {phone ? 'Change' : 'Add phone'}</button>}
    {open && <form onSubmit={submit}><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="024 123 4567" required /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Current password" required /><button className="primary-action" type="submit" disabled={state.loading}>{state.loading ? <LoaderCircle className="spin" /> : 'Save phone'}</button>{phone && <button className="secondary-action" type="button" onClick={() => setOpen(false)}>Cancel</button>}</form>}
    {state.error && <span className="recovery-error">{state.error}</span>}{state.saved && <span className="recovery-saved">Recovery phone updated.</span>}
  </section>;
}

function SettingsPage({ session }) {
  const [phone, setPhone] = useState(session.user.phone || '');
  return <AdminLayout session={session} title="Settings" description="Manage account recovery and organizer sign-in security.">
    <div className="settings-sections">
      <RecoveryPhonePanel initialPhone={phone} onPhoneUpdated={setPhone} />
      <MfaPanel enabledInitially={Boolean(session.user.twoFactorEnabled)} hasPhone={Boolean(phone)} />
    </div>
  </AdminLayout>;
}

function MfaPanel({ enabledInitially, hasPhone }) {
  const [enabled, setEnabled] = useState(enabledInitially);
  const [mode, setMode] = useState('idle');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });
  async function begin(event) {
    event.preventDefault(); setState({ loading: true, error: '' });
    try {
      const data = await api('/api/v1/auth/mfa/setup', { method: 'POST', body: JSON.stringify({ password }) });
      setChallengeId(data.challengeId); setPassword(''); setMode('verify'); setState({ loading: false, error: '' });
    } catch (error) { setState({ loading: false, error: error.message }); }
  }
  async function enable(event) {
    event.preventDefault(); setState({ loading: true, error: '' });
    try {
      await api('/api/v1/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ challengeId, otp }) });
      setEnabled(true); setMode('idle'); setOtp(''); setState({ loading: false, error: '' });
    } catch (error) { setState({ loading: false, error: error.message }); }
  }
  async function disable(event) {
    event.preventDefault(); setState({ loading: true, error: '' });
    try {
      await api('/api/v1/auth/mfa', { method: 'DELETE', body: JSON.stringify({ password }) });
      window.location.assign('/organizers');
    } catch (error) { setState({ loading: false, error: error.message }); }
  }
  return <section className="recovery-phone-panel">
    <div><small>Account security</small><strong>{enabled ? 'Two-factor authentication enabled' : 'Action required: enable two-factor authentication'}</strong></div>
    {mode === 'idle' && <button className={enabled ? 'secondary-action' : 'primary-action'} type="button" disabled={!hasPhone} onClick={() => setMode(enabled ? 'disable' : 'password')}>{enabled ? 'Disable MFA' : 'Enable MFA now'}</button>}
    {mode === 'password' && <form onSubmit={begin}><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Current password" required /><button className="primary-action" disabled={state.loading}>Send code</button><button className="secondary-action" type="button" onClick={() => setMode('idle')}>Cancel</button></form>}
    {mode === 'verify' && <form onSubmit={enable}><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="Six-digit code" required /><button className="primary-action" disabled={state.loading}>Verify</button></form>}
    {mode === 'disable' && <form onSubmit={disable}><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Current password" required /><button className="suspend-action" disabled={state.loading}>Disable MFA</button><button className="secondary-action" type="button" onClick={() => setMode('idle')}>Cancel</button></form>}
    {!hasPhone && <span className="recovery-error">Add a trusted recovery phone before enabling MFA.</span>}{state.error && <span className="recovery-error">{state.error}</span>}
  </section>;
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

function readableAction(value) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeAuditValue(value) {
  const blocked = /password|secret|token|otp|authorization|cookie|key/i;
  function redact(item) {
    if (Array.isArray(item)) return item.map(redact);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, blocked.test(key) ? '[REDACTED]' : redact(entry)]));
    return item;
  }
  return value == null ? null : redact(value);
}

function AuditLogsPage({ session }) {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [retention, setRetention] = useState('active');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState({ items: [], filters: { actions: [], resourceTypes: [] }, pagination: { page: 1, total: 0, pageCount: 0 } });
  const [state, setState] = useState({ loading: true, error: '' });
  const load = useCallback(() => {
    api(`/api/v1/organizer/audit-logs?search=${encodeURIComponent(search)}&page=${page}&retention=${retention}${action ? `&action=${encodeURIComponent(action)}` : ''}${resourceType ? `&resourceType=${encodeURIComponent(resourceType)}` : ''}`)
      .then((result) => { setData(result); setState({ loading: false, error: '' }); })
      .catch((error) => setState({ loading: false, error: error.message }));
  }, [action, page, resourceType, retention, search]);
  useEffect(load, [load]);
  return <AdminLayout session={session} title="Audit logs" description="Review security-sensitive and administrative activity for your organization.">
    <div className="management-toolbar audit-toolbar">
      <label className="admin-search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Action, resource, or actor" /></label>
      <label>Action<select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option value="">All actions</option>{data.filters.actions.map((item) => <option key={item} value={item}>{readableAction(item)}</option>)}</select><ChevronDown /></label>
      <label>Resource<select value={resourceType} onChange={(event) => { setResourceType(event.target.value); setPage(1); }}><option value="">All resources</option>{data.filters.resourceTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown /></label>
      <label>Retention<select value={retention} onChange={(event) => { setRetention(event.target.value); setPage(1); }}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All records</option></select><ChevronDown /></label>
    </div>
    {state.error && <div className="admin-alert">{state.error}</div>}
    {state.loading ? <AdminLoading /> : data.items.length ? <div className="candidate-table-wrap">
      <table className="admin-table audit-table"><thead><tr><th>Activity</th><th>Actor</th><th>Resource</th><th>Source</th><th>Date</th><th><span className="sr-only">View</span></th></tr></thead>
        <tbody>{data.items.map((item) => <tr key={item.id}>
          <td><strong>{readableAction(item.action)}</strong></td>
          <td>{item.user?.name || 'System'}<small>{item.user?.email || 'Automated process'}</small></td>
          <td>{item.resourceType}<small>{item.resourceId}</small></td>
          <td>{item.ipAddress || 'Not recorded'}</td>
          <td>{new Date(item.createdAt).toLocaleString()}</td>
          <td><button className="icon-action" type="button" title="View audit entry" onClick={() => setSelected(item)}><Eye /></button></td>
        </tr>)}</tbody>
      </table>
      <div className="payment-pagination"><span>Page {data.pagination.page} of {data.pagination.pageCount}</span><div><button type="button" title="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><button type="button" title="Next page" disabled={page >= data.pagination.pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div></div>
    </div> : <AdminEmpty icon={ClipboardList} title="No audit activity found" text="Administrative and security events will appear here." />}
    {selected && <Dialog title="Audit entry" onClose={() => setSelected(null)}><div className="audit-detail">
      <dl><div><dt>Action</dt><dd>{readableAction(selected.action)}</dd></div><div><dt>Actor</dt><dd>{selected.user?.name || 'System'}</dd></div><div><dt>Resource</dt><dd>{selected.resourceType} / {selected.resourceId}</dd></div><div><dt>IP address</dt><dd>{selected.ipAddress || 'Not recorded'}</dd></div><div><dt>Date</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd></div>{selected.archivedAt && <div><dt>Archived</dt><dd>{new Date(selected.archivedAt).toLocaleString()}</dd></div>}</dl>
      {selected.oldValue != null && <section><h3>Previous value</h3><pre>{JSON.stringify(safeAuditValue(selected.oldValue), null, 2)}</pre></section>}
      {selected.newValue != null && <section><h3>New value</h3><pre>{JSON.stringify(safeAuditValue(selected.newValue), null, 2)}</pre></section>}
    </div></Dialog>}
  </AdminLayout>;
}
export function SettingsRoute() {
  return <OrganizerGate page="settings" />;
}
export function AuditLogsRoute() {
  return <OrganizerGate page="audit-logs" />;
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
