import { Component, useCallback, useEffect, useState } from 'react';
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
  ShieldCheck,
  Settings,
  Tag,
  Users,
  WalletCards,
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
    const fieldErrors = body?.error?.details?.fieldErrors;
    const validationMessage =
      fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
    const error = new Error(
      validationMessage ||
        body?.error?.message ||
        (response.status === 429
          ? 'Too many attempts. Please wait before trying again.'
          : 'Request failed.'),
    );
    error.code = body?.error?.code;
    error.status = response.status;
    throw error;
  }
  return body.data;
}

function LoginPage({ onLogin, portal = 'administrator' }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
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
        body: JSON.stringify({ identifier, password, portal }),
      });
      if (session.mfaRequired) {
        setChallengeId(session.challengeId);
        setOtp('');
        setMode('mfa');
        setState({ loading: false, error: '' });
      } else await onLogin(session);
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function confirmMfa(event) {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const session = await api('/api/v1/auth/login/mfa', {
        method: 'POST',
        body: JSON.stringify({ challengeId, otp, portal }),
      });
      await onLogin(session);
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function requestReset(event) {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const data = await api('/api/v1/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setChallengeId(data.challengeId);
      setMode('confirm');
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function confirmReset(event) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setState({ loading: false, error: 'Passwords do not match.' });
      return;
    }
    setState({ loading: true, error: '' });
    try {
      await api('/api/v1/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ challengeId, otp, password }),
      });
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setMode('login');
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  if (mode === 'mfa')
    return (
      <div className="organizer-login">
        <Link to="/">
          <img src={logo} alt="TomaMe" />
        </Link>
        <form onSubmit={confirmMfa}>
          <span className="eyebrow">Two-factor authentication</span>
          <h1>Verify your sign-in.</h1>
          <p>Enter the six-digit code sent to your trusted phone.</p>
          <label>
            Six-digit OTP
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength="6"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ''))
              }
              required
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
            {state.loading ? (
              <LoaderCircle className="spin" />
            ) : (
              'Verify and sign in'
            )}
          </button>
          <button
            className="login-text-action"
            type="button"
            onClick={() => {
              setMode('login');
              setOtp('');
              setState({ loading: false, error: '' });
            }}
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  if (mode !== 'login')
    return (
      <div className="organizer-login">
        <Link to="/">
          <img src={logo} alt="TomaMe" />
        </Link>
        <form onSubmit={mode === 'request' ? requestReset : confirmReset}>
          <span className="eyebrow">Account recovery</span>
          <h1>
            {mode === 'request'
              ? 'Reset your password.'
              : 'Enter your reset code.'}
          </h1>
          <p>
            {mode === 'request'
              ? 'We will send a six-digit OTP to your registered recovery phone.'
              : 'The SMS code expires after 10 minutes.'}
          </p>
          {mode === 'request' ? (
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
          ) : (
            <>
              <label>
                Six-digit OTP
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ''))
                  }
                  required
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength="10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength="10"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
            </>
          )}
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
            {state.loading ? (
              <LoaderCircle className="spin" />
            ) : mode === 'request' ? (
              'Send reset code'
            ) : (
              'Reset password'
            )}
          </button>
          <button
            className="login-text-action"
            type="button"
            onClick={() => {
              setMode('login');
              setState({ loading: false, error: '' });
            }}
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  return (
    <div className="organizer-login">
      <Link to="/">
        <img src={logo} alt="TomaMe" />
      </Link>
      <form onSubmit={submit}>
        <span className="eyebrow">
          {portal === 'superadmin'
            ? 'Superadmin console'
            : 'Event administrator workspace'}
        </span>
        <h1>
          {portal === 'superadmin'
            ? 'Sign in to manage TomaMe.'
            : 'Sign in to manage your events.'}
        </h1>
        <p>
          {portal === 'superadmin'
            ? 'Use your authorized platform superadmin account.'
            : 'Use the account assigned to your event by a superadmin.'}
        </p>
        <label>
          {portal === 'superadmin' ? 'Email address' : 'Username'}
          <input
            type={portal === 'superadmin' ? 'email' : 'text'}
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
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
            minLength={6}
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
        <button
          className="login-text-action"
          type="button"
          onClick={() => {
            setMode('request');
            setState({ loading: false, error: '' });
          }}
        >
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
    navigate(
      session.globalRole === 'SUPER_ADMIN'
        ? '/superadmin/login'
        : '/administrators/login',
    );
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
          {session.globalRole === 'SUPER_ADMIN' && (
            <NavLink to="/dashboard/settings">
              <Settings />
              Settings
            </NavLink>
          )}
          {session.globalRole === 'SUPER_ADMIN' && (
            <NavLink to="/dashboard/administrators">
              <ShieldCheck />
              Administrators
            </NavLink>
          )}
          {session.globalRole === 'SUPER_ADMIN' && (
            <NavLink to="/dashboard/financial">
              <WalletCards />
              Financial
            </NavLink>
          )}
          {session.globalRole === 'SUPER_ADMIN' && (
            <NavLink to="/dashboard/audit-logs">
              <ClipboardList />
              Audit logs
            </NavLink>
          )}
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
          <button
            className="mobile-admin-logout"
            onClick={logout}
            type="button"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut />
          </button>
        </header>
        {children}
      </div>
      <nav
        className={`mobile-admin-nav ${session.globalRole === 'SUPER_ADMIN' ? 'is-superadmin' : 'is-event-admin'}`}
        aria-label="Organizer navigation"
      >
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
        {session.globalRole === 'SUPER_ADMIN' && (
          <NavLink to="/dashboard/settings">
            <Settings />
            <span>Settings</span>
          </NavLink>
        )}
        {session.globalRole === 'SUPER_ADMIN' && (
          <NavLink to="/dashboard/administrators">
            <ShieldCheck />
            <span>Admins</span>
          </NavLink>
        )}
        {session.globalRole === 'SUPER_ADMIN' && (
          <NavLink to="/dashboard/financial">
            <WalletCards />
            <span>Wallet</span>
          </NavLink>
        )}
        {session.globalRole === 'SUPER_ADMIN' && (
          <NavLink to="/dashboard/audit-logs">
            <ClipboardList />
            <span>Audit</span>
          </NavLink>
        )}
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
  if (!session) return <PortalRedirect />;
  let content;
  if (page === 'categories') content = <CategoriesPage session={session} />;
  else if (page === 'candidates')
    content = <CandidatesPage session={session} />;
  else if (page === 'payments') content = <PaymentsPage session={session} />;
  else if (page === 'settings')
    content =
      session.globalRole === 'SUPER_ADMIN' ? (
        <SettingsPage session={session} />
      ) : (
        <DashboardAccessDenied session={session} />
      );
  else if (page === 'audit-logs') content = <AuditLogsPage session={session} />;
  else if (page === 'administrators')
    content = <EventAdministratorsPage session={session} />;
  else if (page === 'financial')
    content =
      session.globalRole === 'SUPER_ADMIN' ? (
        <FinancialManagementPage session={session} />
      ) : (
        <DashboardAccessDenied session={session} />
      );
  else if (page === 'events')
    content = <OrganizerOverview session={session} eventManagement />;
  else if (page === 'create-event') content = <CreateEventPage />;
  else content = <OrganizerOverview session={session} />;
  return <DashboardErrorBoundary>{content}</DashboardErrorBoundary>;
}

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error('Dashboard render failed', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="admin-shell">
        <main className="management-main">
          <div className="admin-alert" role="alert">
            <strong>Dashboard display error</strong>
            <p>{this.state.error.message}</p>
            <button
              className="primary-action"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }
}

function DashboardAccessDenied({ session }) {
  return (
    <AdminLayout
      session={session}
      title="Access restricted"
      description="This section is available only to platform superadmins."
    >
      <AdminEmpty
        icon={ShieldCheck}
        title="Superadmin access required"
        text="Return to your event dashboard to continue managing assigned events."
      />
    </AdminLayout>
  );
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
  const [state, setState] = useState({
    events: [],
    loading: true,
    error: '',
    pendingId: '',
  });
  const [editing, setEditing] = useState(null);
  const loadEvents = useCallback(() => {
    api('/api/v1/organizer/context')
      .then((data) =>
        setState((current) => ({
          ...current,
          events: data.events,
          loading: false,
          error: '',
        })),
      )
      .catch((error) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        })),
      );
  }, []);
  useEffect(loadEvents, [loadEvents]);

  async function changeVotingStatus(event) {
    const action = event.status === 'PAUSED' ? 'resume' : 'pause';
    setState((current) => ({ ...current, pendingId: event.id, error: '' }));
    try {
      const updated = await api(
        `/api/v1/organizer/events/${event.id}/voting-status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action }),
        },
      );
      setState((current) => ({
        ...current,
        pendingId: '',
        events: current.events.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item,
        ),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        pendingId: '',
        error: error.message,
      }));
    }
  }

  async function uploadEventBanner(event, file) {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setState((current) => ({
        ...current,
        error: 'Choose a JPEG, PNG, or WebP banner no larger than 5 MB.',
      }));
      return;
    }
    setState((current) => ({ ...current, pendingId: event.id, error: '' }));
    try {
      const uploaded = await api('/api/v1/organizer/event-images', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const updated = await api(`/api/v1/organizer/events/${event.id}/banner`, {
        method: 'PATCH',
        body: JSON.stringify({ bannerUrl: uploaded.bannerUrl }),
      });
      setState((current) => ({
        ...current,
        pendingId: '',
        events: current.events.map((item) =>
          item.id === updated.id
            ? { ...item, bannerUrl: updated.bannerUrl }
            : item,
        ),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        pendingId: '',
        error: error.message,
      }));
    }
  }

  async function archiveEvent(event) {
    if (
      !window.confirm(
        `Archive ${event.name}? It will no longer appear publicly.`,
      )
    )
      return;
    setState((current) => ({ ...current, pendingId: event.id, error: '' }));
    try {
      await api(`/api/v1/organizer/events/${event.id}`, { method: 'DELETE' });
      setState((current) => ({
        ...current,
        pendingId: '',
        events: current.events.filter((item) => item.id !== event.id),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        pendingId: '',
        error: error.message,
      }));
    }
  }

  return (
    <AdminLayout
      session={session}
      title={eventManagement ? 'Events' : 'Overview'}
      description={
        eventManagement
          ? 'Manage event details, publishing assets, and voting availability.'
          : 'Control voting availability across your events.'
      }
      action={
        eventManagement ? (
          <Link className="primary-action" to="/dashboard/events/new">
            <Plus /> New event
          </Link>
        ) : undefined
      }
    >
      {state.error && <div className="admin-alert">{state.error}</div>}
      {state.loading ? (
        <AdminLoading type="cards" />
      ) : state.events.length ? (
        <div className="management-grid event-card-grid">
          {state.events.map((event) => {
            const controllable =
              event.status === 'ACTIVE' || event.status === 'PAUSED';
            return (
              <article
                className="management-card admin-event-card"
                key={event.id}
              >
                <div
                  className={`admin-event-banner ${event.bannerUrl ? 'has-banner' : ''}`}
                >
                  {event.bannerUrl ? (
                    <img src={event.bannerUrl} alt="" />
                  ) : (
                    <CalendarDays />
                  )}
                  <span className={`event-state ${event.status.toLowerCase()}`}>
                    {event.status}
                  </span>
                </div>
                <div className="admin-event-content">
                  <span>
                    {new Date(event.startAt).toLocaleDateString()} -{' '}
                    {new Date(event.endAt).toLocaleDateString()}
                  </span>
                  <h2>{event.name}</h2>
                  <p>{event.description || 'No event description added.'}</p>
                </div>
                <footer className="admin-event-actions">
                  <button
                    className="icon-action"
                    type="button"
                    title="Edit event details"
                    onClick={() => setEditing(event)}
                  >
                    <Pencil />
                  </button>
                  <label
                    className="icon-action"
                    title={event.bannerUrl ? 'Replace banner' : 'Add banner'}
                    aria-label={
                      event.bannerUrl ? 'Replace banner' : 'Add banner'
                    }
                  >
                    <ImagePlus />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={state.pendingId === event.id}
                      onChange={(input) =>
                        uploadEventBanner(event, input.target.files?.[0])
                      }
                    />
                  </label>
                  {controllable && (
                    <button
                      className={
                        event.status === 'PAUSED'
                          ? 'primary-action'
                          : 'suspend-action'
                      }
                      type="button"
                      disabled={state.pendingId === event.id}
                      onClick={() => changeVotingStatus(event)}
                    >
                      {state.pendingId === event.id ? (
                        <LoaderCircle className="spin" />
                      ) : event.status === 'PAUSED' ? (
                        <PlayCircle />
                      ) : (
                        <PauseCircle />
                      )}
                      {event.status === 'PAUSED'
                        ? 'Resume voting'
                        : 'Pause voting'}
                    </button>
                  )}
                  <button
                    className="icon-action event-archive"
                    type="button"
                    title="Archive event"
                    disabled={
                      state.pendingId === event.id || event.status === 'ACTIVE'
                    }
                    onClick={() => archiveEvent(event)}
                  >
                    <Archive />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <AdminEmpty
          icon={CalendarDays}
          title="No events yet"
          text="Create an event to manage voting availability."
        />
      )}
      {editing && (
        <EventEditForm
          event={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadEvents();
          }}
        />
      )}
    </AdminLayout>
  );
}

function RecoveryPhonePanel({ initialPhone, onPhoneUpdated }) {
  const [open, setOpen] = useState(!initialPhone);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState('');
  const [state, setState] = useState({
    loading: false,
    error: '',
    saved: false,
  });
  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, error: '', saved: false });
    try {
      const updated = await api('/api/v1/auth/me/phone', {
        method: 'PATCH',
        body: JSON.stringify({ phone, password }),
      });
      setPhone(updated.phone);
      onPhoneUpdated?.(updated.phone);
      setPassword('');
      setOpen(false);
      setState({ loading: false, error: '', saved: true });
    } catch (error) {
      setState({ loading: false, error: error.message, saved: false });
    }
  }
  return (
    <section className="recovery-phone-panel">
      <div>
        <small>Password recovery</small>
        <strong>
          {phone
            ? `SMS recovery: ${phone.replace(/.(?=.{4})/g, '•')}`
            : 'Add a recovery phone'}
        </strong>
      </div>
      {!open && (
        <button
          className="secondary-action"
          type="button"
          onClick={() => setOpen(true)}
        >
          <Pencil /> {phone ? 'Change' : 'Add phone'}
        </button>
      )}
      {open && (
        <form onSubmit={submit}>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="024 123 4567"
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Current password"
            required
          />
          <button
            className="primary-action"
            type="submit"
            disabled={state.loading}
          >
            {state.loading ? <LoaderCircle className="spin" /> : 'Save phone'}
          </button>
          {phone && (
            <button
              className="secondary-action"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          )}
        </form>
      )}
      {state.error && <span className="recovery-error">{state.error}</span>}
      {state.saved && (
        <span className="recovery-saved">Recovery phone updated.</span>
      )}
    </section>
  );
}

function SettingsPage({ session }) {
  const [phone, setPhone] = useState(session.user.phone || '');
  return (
    <AdminLayout
      session={session}
      title="Settings"
      description="Manage account recovery and organizer sign-in security."
    >
      <div className="settings-sections">
        <RecoveryPhonePanel initialPhone={phone} onPhoneUpdated={setPhone} />
        <MfaPanel
          enabledInitially={Boolean(session.user.twoFactorEnabled)}
          hasPhone={Boolean(phone)}
        />
      </div>
    </AdminLayout>
  );
}

function MfaPanel({ enabledInitially, hasPhone }) {
  const [enabled, setEnabled] = useState(enabledInitially);
  const [mode, setMode] = useState('idle');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });
  async function begin(event) {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const data = await api('/api/v1/auth/mfa/setup', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setChallengeId(data.challengeId);
      setPassword('');
      setMode('verify');
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function enable(event) {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await api('/api/v1/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ challengeId, otp }),
      });
      setEnabled(true);
      setMode('idle');
      setOtp('');
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  async function disable(event) {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await api('/api/v1/auth/mfa', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      });
      window.location.assign('/organizers');
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  return (
    <section className="recovery-phone-panel">
      <div>
        <small>Account security</small>
        <strong>
          {enabled
            ? 'Two-factor authentication enabled'
            : 'Action required: enable two-factor authentication'}
        </strong>
      </div>
      {mode === 'idle' && (
        <button
          className={enabled ? 'secondary-action' : 'primary-action'}
          type="button"
          disabled={!hasPhone}
          onClick={() => setMode(enabled ? 'disable' : 'password')}
        >
          {enabled ? 'Disable MFA' : 'Enable MFA now'}
        </button>
      )}
      {mode === 'password' && (
        <form onSubmit={begin}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Current password"
            required
          />
          <button className="primary-action" disabled={state.loading}>
            Send code
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setMode('idle')}
          >
            Cancel
          </button>
        </form>
      )}
      {mode === 'verify' && (
        <form onSubmit={enable}>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength="6"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
            placeholder="Six-digit code"
            required
          />
          <button className="primary-action" disabled={state.loading}>
            Verify
          </button>
        </form>
      )}
      {mode === 'disable' && (
        <form onSubmit={disable}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Current password"
            required
          />
          <button className="suspend-action" disabled={state.loading}>
            Disable MFA
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setMode('idle')}
          >
            Cancel
          </button>
        </form>
      )}
      {!hasPhone && (
        <span className="recovery-error">
          Add a trusted recovery phone before enabling MFA.
        </span>
      )}
      {state.error && <span className="recovery-error">{state.error}</span>}
    </section>
  );
}

function EventEditForm({ event, onClose, onSaved }) {
  const datePart = (value) => new Date(value).toISOString().slice(0, 16);
  const [form, setForm] = useState({
    name: event.name,
    description: event.description || '',
    startAt: datePart(event.startAt),
    endAt: datePart(event.endAt),
    timezone: event.timezone,
    currency: event.currency,
    defaultVotePrice: String(event.defaultVotePrice / 100),
    platformFeePercent: String(event.platformFeeBps / 100),
    minimumVotes: String(event.minimumVotes),
    maximumVotesPerTransaction: String(event.maximumVotesPerTransaction),
    webVotingEnabled: event.webVotingEnabled,
    ussdVotingEnabled: event.ussdVotingEnabled,
    resultsVisibility: event.resultsVisibility,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(submitEvent) {
    submitEvent.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/api/v1/organizer/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          platformFeePercent: undefined,
          platformFeeBps: Math.round(Number(form.platformFeePercent) * 100),
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          defaultVotePrice: Math.round(Number(form.defaultVotePrice) * 100),
          minimumVotes: Number(form.minimumVotes),
          maximumVotesPerTransaction: Number(form.maximumVotesPerTransaction),
        }),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }
  return (
    <Dialog title="Edit event" onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label>
          Event name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Description
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div className="admin-form-row">
          <label>
            Starts
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              required
            />
          </label>
          <label>
            Ends
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Currency
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option>GHS</option>
              <option>NGN</option>
              <option>USD</option>
            </select>
          </label>
          <label>
            Price per vote
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.defaultVotePrice}
              onChange={(e) =>
                setForm({ ...form, defaultVotePrice: e.target.value })
              }
              required
            />
          </label>
        </div>
        <label>
          Platform fee (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.platformFeePercent}
            onChange={(e) =>
              setForm({ ...form, platformFeePercent: e.target.value })
            }
            required
          />
        </label>
        <div className="admin-form-row">
          <label>
            Minimum votes
            <input
              type="number"
              min="1"
              value={form.minimumVotes}
              onChange={(e) =>
                setForm({ ...form, minimumVotes: e.target.value })
              }
              required
            />
          </label>
          <label>
            Maximum per transaction
            <input
              type="number"
              min="1"
              value={form.maximumVotesPerTransaction}
              onChange={(e) =>
                setForm({ ...form, maximumVotesPerTransaction: e.target.value })
              }
              required
            />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.webVotingEnabled}
              onChange={(e) =>
                setForm({ ...form, webVotingEnabled: e.target.checked })
              }
            />{' '}
            Web voting
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.ussdVotingEnabled}
              onChange={(e) =>
                setForm({ ...form, ussdVotingEnabled: e.target.checked })
              }
            />{' '}
            USSD voting
          </label>
        </div>
        <label>
          Results visibility
          <select
            value={form.resultsVisibility}
            onChange={(e) =>
              setForm({ ...form, resultsVisibility: e.target.value })
            }
          >
            {[
              'EXACT_TOTALS',
              'PERCENTAGES',
              'RANKING_ONLY',
              'HIDDEN_UNTIL_END',
              'ADMIN_ONLY',
              'MANUAL_RELEASE',
            ].map((value) => (
              <option key={value}>{value.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </label>
        {error && <div className="admin-form-error">{error}</div>}
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action" disabled={saving} type="submit">
            {saving && <LoaderCircle className="spin" />} Save changes
          </button>
        </div>
      </form>
    </Dialog>
  );
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
  const [candidates, setCandidates] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => {
    Promise.all([
      api(
        `/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ''}`,
      ),
      api(
        `/api/v1/organizer/candidates${eventId ? `?eventId=${eventId}` : ''}`,
      ),
    ])
      .then(([categories, candidateData]) => {
        setItems(categories);
        setCandidates(candidateData);
      })
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
        <AdminLoading type="cards" />
      ) : items.length ? (
        <div className="management-grid">
          {items.map((item) => (
            <article
              className={`management-card category-drilldown-card ${selectedCategoryId === item.id ? 'selected' : ''}`}
              key={item.id}
              role="button"
              tabIndex="0"
              aria-expanded={selectedCategoryId === item.id}
              onClick={() =>
                setSelectedCategoryId((current) =>
                  current === item.id ? '' : item.id,
                )
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedCategoryId((current) =>
                    current === item.id ? '' : item.id,
                  );
                }
              }}
            >
              <div className="management-card-icon">
                <Tag />
              </div>
              <span>{item.event.name}</span>
              <h2>{item.name}</h2>
              <p>{item.description || 'No description added.'}</p>
              <footer>
                <strong>{item._count.candidates} candidates</strong>
                <div className="card-actions">
                  <button
                    type="button"
                    title="Edit category"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditing(item);
                    }}
                  >
                    <Pencil />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      archive(item);
                    }}
                    type="button"
                    title="Archive category"
                  >
                    <Archive />
                  </button>
                </div>
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
      {selectedCategoryId && (
        <CategoryCandidatesPanel
          category={items.find((item) => item.id === selectedCategoryId)}
          candidates={candidates.filter(
            (candidate) => candidate.categoryId === selectedCategoryId,
          )}
          onClose={() => setSelectedCategoryId('')}
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
        <CategoryForm
          item={editing}
          events={context.events}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}

function CategoryCandidatesPanel({ category, candidates, onClose }) {
  if (!category) return null;
  const ranked = [...candidates].sort(
    (left, right) =>
      right.cachedVoteCount - left.cachedVoteCount ||
      left.name.localeCompare(right.name),
  );
  const totalVotes = ranked.reduce(
    (total, candidate) => total + candidate.cachedVoteCount,
    0,
  );
  return (
    <section className="category-results-panel">
      <header>
        <div>
          <span className="eyebrow">{category.event.name}</span>
          <h2>{category.name}</h2>
          <p>
            {ranked.length} candidates · {totalVotes.toLocaleString()} total
            votes
          </p>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close category results"
        >
          <X />
        </button>
      </header>
      {ranked.length ? (
        <div className="category-result-list">
          {ranked.map((candidate, index) => {
            const percentage = totalVotes
              ? (candidate.cachedVoteCount / totalVotes) * 100
              : 0;
            return (
              <article className="category-result-candidate" key={candidate.id}>
                <strong className="result-rank">{index + 1}</strong>
                <span
                  className={`result-photo ${candidate.photoUrl ? 'has-photo' : ''}`}
                >
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt="" />
                  ) : (
                    candidate.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                  )}
                </span>
                <div className="result-candidate-name">
                  <strong>{candidate.name}</strong>
                  <small>{candidate.candidateCode}</small>
                </div>
                <div className="result-progress">
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <div className="result-total">
                  <strong>{candidate.cachedVoteCount.toLocaleString()}</strong>
                  <small>{percentage.toFixed(1)}%</small>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <AdminEmpty
          icon={Users}
          title="No candidates in this category"
          text="Add candidates to begin tracking category results."
        />
      )}
    </section>
  );
}

function CategoryForm({ events, item, onClose, onCreated }) {
  const [form, setForm] = useState({
    eventId: item?.eventId || events[0]?.id || '',
    name: item?.name || '',
    description: item?.description || '',
    votePriceOverride: item?.votePriceOverride
      ? String(item.votePriceOverride / 100)
      : '',
  });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    try {
      await api(
        item
          ? `/api/v1/organizer/categories/${item.id}`
          : '/api/v1/organizer/categories',
        {
          method: item ? 'PATCH' : 'POST',
          body: JSON.stringify({
            ...form,
            ...(item ? { eventId: undefined } : {}),
            votePriceOverride: form.votePriceOverride
              ? Math.round(Number(form.votePriceOverride) * 100)
              : null,
          }),
        },
      );
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Dialog
      title={item ? 'Edit category' : 'Create category'}
      onClose={onClose}
    >
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
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt="" />
                        ) : (
                          item.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                        )}
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
                    <div className="table-actions">
                      <button
                        type="button"
                        className="table-action"
                        title="Edit candidate"
                        onClick={() => setEditingCandidate(item)}
                      >
                        <Pencil />
                      </button>
                      <button
                        className="table-action"
                        onClick={() => archive(item)}
                        type="button"
                        title="Archive candidate"
                      >
                        <Archive />
                      </button>
                    </div>
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
        <CandidateForm
          item={editingCandidate}
          events={context.events}
          categories={categories}
          onClose={() => setEditingCandidate(null)}
          onCreated={() => {
            setEditingCandidate(null);
            load();
          }}
        />
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
  useEffect(
    () => () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );
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
      await api(
        item
          ? `/api/v1/organizer/candidates/${item.id}`
          : '/api/v1/organizer/candidates',
        {
          method: item ? 'PATCH' : 'POST',
          body: JSON.stringify({
            ...form,
            ...(item ? { eventId: undefined } : {}),
            photoUrl,
          }),
        },
      );
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }
  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
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
        <label
          className={`candidate-photo-upload ${photoPreview ? 'has-image' : ''}`}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Candidate preview" />
          ) : (
            <>
              <ImagePlus />
              <strong>Upload candidate photo</strong>
              <small>JPEG, PNG or WebP, up to 5 MB</small>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choosePhoto}
          />
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
          <button
            className="primary-action"
            type="submit"
            disabled={submitting}
          >
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
    summary: {
      total: 0,
      failed: 0,
      successRate: 0,
      creditedVotes: 0,
      revenueByCurrency: [],
    },
    eventSummaries: [],
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
  const revenue =
    data.summary.revenueByCurrency
      .map(
        (item) =>
          `${item.currency} ${(item.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      )
      .join(' / ') || 'GHS 0.00';
  function exportPage() {
    const headings = [
      'Reference',
      'Event',
      'Candidate',
      'Votes',
      'Channel',
      'Amount',
      'Currency',
      'Status',
      'Date',
    ];
    const rows = data.items.map((item) => [
      item.reference,
      item.order.event.name,
      item.order.candidate.name,
      item.order.quantity,
      item.order.channel,
      (item.amount / 100).toFixed(2),
      item.currency,
      item.status,
      item.createdAt,
    ]);
    const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const blob = new Blob(
      [[headings, ...rows].map((row) => row.map(quote).join(',')).join('\n')],
      { type: 'text/csv' },
    );
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
      <div
        className={`payment-summary ${loading ? 'payment-summary-skeleton' : ''}`}
        aria-busy={loading}
      >
        {loading ? (
          [0, 1, 2, 3, 4].map((item) => (
            <div key={item} aria-hidden="true">
              <span className="skeleton-line short" />
              <span className="skeleton-line title" />
            </div>
          ))
        ) : (
          <>
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
          </>
        )}
      </div>
      {!eventId && data.eventSummaries.length > 1 && (
        <section className="event-payment-breakdown">
          <div className="section-heading">
            <div>
              <span className="eyebrow">By event</span>
              <h2>Event performance</h2>
              <p>
                Confirmed revenue and credited votes for each assigned event.
              </p>
            </div>
          </div>
          <div className="event-payment-grid">
            {data.eventSummaries.map((item) => (
              <article key={item.eventId}>
                <header>
                  <h3>{item.eventName}</h3>
                  <span>{item.transactions.toLocaleString()} transactions</span>
                </header>
                <dl>
                  <div>
                    <dt>Revenue</dt>
                    <dd>
                      {item.revenueByCurrency
                        .map(
                          (revenue) =>
                            `${revenue.currency} ${(revenue.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                        )
                        .join(' / ') || 'GHS 0.00'}
                    </dd>
                  </div>
                  <div>
                    <dt>Votes</dt>
                    <dd>{item.creditedVotes.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Confirmed</dt>
                    <dd>{item.paid.toLocaleString()}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="management-toolbar payment-toolbar">
        <label>
          Event
          <select
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All events</option>
            {context.events.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
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
        <button
          className="secondary-action payment-export"
          type="button"
          onClick={exportPage}
          disabled={!data.items.length}
        >
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
                <th className="payment-reference-heading">Reference</th>
                <th className="payment-candidate-heading">Candidate</th>
                <th>Event</th>
                <th>Votes</th>
                <th>Channel</th>
                <th className="payment-amount-heading">
                  <span className="desktop-table-label">Amount</span>
                  <span className="mobile-table-label">Transaction</span>
                </th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="payment-reference-cell">
                    <b className="table-reference">{item.reference}</b>
                    <small>
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </small>
                  </td>
                  <td className="payment-candidate-cell">
                    {item.order.candidate.name}
                    <small>{item.order.candidate.candidateCode}</small>
                    <small className="mobile-payment-context">
                      {item.order.event.name} · {item.order.category.name}
                    </small>
                  </td>
                  <td>
                    {item.order.event.name}
                    <small>{item.order.category.name}</small>
                  </td>
                  <td>{item.order.quantity}</td>
                  <td>{item.order.channel}</td>
                  <td className="payment-transaction-cell">
                    <strong>
                      {item.currency} {(item.amount / 100).toFixed(2)}
                    </strong>
                    <div className="mobile-transaction-meta">
                      <span>{item.order.channel}</span>
                      <span
                        className={`payment-status ${item.status.toLowerCase()}`}
                      >
                        <i />
                        {item.status}
                      </span>
                    </div>
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
                    <button
                      className="icon-action"
                      type="button"
                      title="View transaction"
                      onClick={() => setSelected(item)}
                    >
                      <Eye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="payment-pagination">
            <span>
              Page {data.pagination.page} of {data.pagination.pageCount}
            </span>
            <div>
              <button
                type="button"
                title="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                title="Next page"
                disabled={page >= data.pagination.pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </button>
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
              <div>
                <small>Payment status</small>
                <strong>{selected.status}</strong>
              </div>
              <span>
                {selected.currency} {(selected.amount / 100).toFixed(2)}
              </span>
            </div>
            <dl>
              <div>
                <dt>Reference</dt>
                <dd>{selected.reference}</dd>
              </div>
              <div>
                <dt>Provider reference</dt>
                <dd>{selected.providerTransactionId || '-'}</dd>
              </div>
              <div>
                <dt>Event</dt>
                <dd>{selected.order.event.name}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{selected.order.category.name}</dd>
              </div>
              <div>
                <dt>Candidate</dt>
                <dd>{selected.order.candidate.name}</dd>
              </div>
              <div>
                <dt>Voter phone</dt>
                <dd>{selected.order.voterPhone}</dd>
              </div>
              <div>
                <dt>Requested votes</dt>
                <dd>{selected.order.quantity.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{selected.provider}</dd>
              </div>
              <div>
                <dt>Paid at</dt>
                <dd>
                  {selected.providerPaidAt
                    ? new Date(selected.providerPaidAt).toLocaleString()
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>
        </Dialog>
      )}
    </AdminLayout>
  );
}

function AdminLoading({ type = 'table' }) {
  if (type === 'cards')
    return (
      <div
        className="management-grid admin-skeleton-grid"
        aria-label="Loading content"
        aria-busy="true"
      >
        {[0, 1, 2].map((item) => (
          <div
            className="management-card admin-skeleton-card"
            key={item}
            aria-hidden="true"
          >
            <span className="skeleton-block skeleton-icon" />
            <span className="skeleton-line short" />
            <span className="skeleton-line title" />
            <span className="skeleton-line" />
            <span className="skeleton-line medium" />
          </div>
        ))}
      </div>
    );
  return (
    <div
      className="candidate-table-wrap admin-skeleton-table"
      aria-label="Loading records"
      aria-busy="true"
    >
      <div className="skeleton-table-head" />
      {[0, 1, 2, 3, 4].map((item) => (
        <div className="skeleton-table-row" key={item} aria-hidden="true">
          <span className="skeleton-block skeleton-avatar" />
          <span className="skeleton-line title" />
          <span className="skeleton-line medium" />
          <span className="skeleton-line short" />
        </div>
      ))}
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
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeAuditValue(value) {
  const blocked = /password|secret|token|otp|authorization|cookie|key/i;
  function redact(item) {
    if (Array.isArray(item)) return item.map(redact);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [
          key,
          blocked.test(key) ? '[REDACTED]' : redact(entry),
        ]),
      );
    return item;
  }
  return value == null ? null : redact(value);
}

function PortalRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/administrators/login', { replace: true });
  }, [navigate]);
  return (
    <div className="admin-loading">
      <LoaderCircle className="spin" />
      Redirecting to sign in...
    </div>
  );
}

export function LoginPortalRoute({ portal }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api('/api/v1/auth/me')
      .then((session) => {
        const permitted =
          portal === 'superadmin'
            ? session.globalRole === 'SUPER_ADMIN'
            : session.globalRole !== 'SUPER_ADMIN' &&
              session.role === 'EVENT_ADMIN';
        if (permitted) navigate('/dashboard', { replace: true });
        else
          api('/api/v1/auth/logout', { method: 'POST' }).finally(() =>
            setChecking(false),
          );
      })
      .catch(() => setChecking(false));
  }, [navigate, portal]);
  if (checking)
    return (
      <div className="admin-loading">
        <LoaderCircle className="spin" />
        Checking access...
      </div>
    );
  return (
    <LoginPage
      portal={portal}
      onLogin={() => navigate('/dashboard', { replace: true })}
    />
  );
}

function EventAdministratorsPage({ session }) {
  const context = useOrganizerContext();
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: '', message: '' });
  const load = useCallback(() => {
    api('/api/v1/organizer/event-administrators')
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setState((current) => ({ ...current, loading: false, error: '' }));
      })
      .catch((error) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        })),
      );
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function createAdministrator(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const eventIds = form.getAll('eventIds');
    setState((current) => ({ ...current, error: '', message: '' }));
    try {
      await api('/api/v1/organizer/event-administrators', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          username: form.get('username'),
          email: form.get('email'),
          phone: form.get('phone') || undefined,
          password: form.get('password'),
          eventIds,
        }),
      });
      formElement.reset();
      setState((current) => ({
        ...current,
        message: 'Administrator created and assigned.',
      }));
      load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    }
  }

  async function toggleAccess(item) {
    try {
      await api(`/api/v1/organizer/event-administrators/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          eventIds: (item.events || []).map((event) => event.id),
          status: item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
        }),
      });
      load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    }
  }

  return (
    <AdminLayout
      session={session}
      title="Event administrators"
      description="Register administrators and assign the events they are allowed to manage."
    >
      {state.error && <div className="admin-alert">{state.error}</div>}
      {state.message && <div className="admin-success">{state.message}</div>}
      <section className="administrator-registration">
        <div>
          <span className="eyebrow">New account</span>
          <h2>Register an administrator</h2>
          <p>
            Create their login credentials and choose the events visible in
            their workspace.
          </p>
        </div>
        <form className="admin-form" onSubmit={createAdministrator}>
          <div className="admin-form-row">
            <label>
              Full name
              <input name="name" required minLength="2" />
            </label>
            <label>
              Username
              <input
                name="username"
                required
                minLength="3"
                maxLength="32"
                pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
                autoComplete="off"
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Phone
              <input name="phone" inputMode="tel" placeholder="Optional" />
            </label>
          </div>
          <label>
            Temporary password
            <input
              name="password"
              type="password"
              required
              minLength="6"
              autoComplete="new-password"
            />
            <small>Use at least 6 characters.</small>
          </label>
          <fieldset>
            <legend>Assign events</legend>
            <div className="administrator-event-options">
              {context.events.map((event) => (
                <label className="admin-check" key={event.id}>
                  <input type="checkbox" name="eventIds" value={event.id} />
                  {event.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            className="primary-action"
            type="submit"
            disabled={!context.events.length}
          >
            <ShieldCheck /> Register administrator
          </button>
        </form>
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Access directory</span>
          <h2>Registered administrators</h2>
        </div>
      </div>
      {state.loading ? (
        <AdminLoading />
      ) : items.length ? (
        <div className="candidate-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Username</th>
                <th>Assigned events</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.user?.name || 'Administrator'}</strong>
                    <small>{item.user?.email || 'No email'}</small>
                  </td>
                  <td>
                    <b className="table-reference">
                      {item.user?.username || 'Not configured'}
                    </b>
                  </td>
                  <td>
                    {(item.events || [])
                      .map((event) => event.name)
                      .join(', ') || 'No events assigned'}
                  </td>
                  <td>
                    <span
                      className={`payment-status ${item.status === 'ACTIVE' ? 'paid' : 'failed'}`}
                    >
                      <i />
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => toggleAccess(item)}
                    >
                      {item.status === 'ACTIVE' ? 'Suspend' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmpty
          icon={ShieldCheck}
          title="No event administrators"
          text="Create an administrator and assign their events."
        />
      )}
    </AdminLayout>
  );
}

function money(amount, currency = 'GHS') {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency }).format(
    (amount || 0) / 100,
  );
}

function FinancialManagementPage({ session }) {
  const [data, setData] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [recipientType, setRecipientType] = useState('mobile_money');
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providerCode, setProviderCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountResolving, setAccountResolving] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState(null);
  const [withdrawalFeedback, setWithdrawalFeedback] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [state, setState] = useState({ loading: true, error: '', message: '' });
  const load = useCallback(() => {
    return Promise.all([
      api('/api/v1/superadmin/financial/overview'),
      api('/api/v1/superadmin/financial/withdrawals'),
    ])
      .then(([overview, withdrawalData]) => {
        setData(overview);
        setWithdrawals(withdrawalData);
        setState({ loading: false, error: '', message: '' });
      })
      .catch((error) =>
        setState({ loading: false, error: error.message, message: '' }),
      );
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let active = true;
    api(
      `/api/v1/superadmin/financial/providers?type=${recipientType}&currency=GHS`,
    )
      .then((items) => {
        if (active) setProviders(items);
      })
      .catch((error) => {
        if (!active) return;
        setProviders([]);
        setVerifyFeedback({ type: 'error', message: error.message });
      })
      .finally(() => {
        if (active) setProvidersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [recipientType]);

  async function resolveRecipient() {
    if (recipientType === 'mobile_money' || !providerCode || !accountNumber) return;
    setAccountResolving(true);
    setAccountName('');
    setVerifyFeedback(null);
    try {
      const resolved = await api(
        '/api/v1/superadmin/financial/recipients/resolve',
        {
          method: 'POST',
          body: JSON.stringify({
            type: recipientType,
            accountNumber,
            bankCode: providerCode,
          }),
        },
      );
      setAccountName(resolved.accountName);
      setVerifyFeedback({ type: 'success', message: `Destination verified as ${resolved.accountName}.` });
    } catch (error) {
      setVerifyFeedback({ type: 'error', message: error.message });
    } finally {
      setAccountResolving(false);
    }
  }

  async function requestWithdrawal(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setWithdrawalFeedback(null);
    try {
      await api('/api/v1/superadmin/financial/withdrawals', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          eventId: form.get('eventId'),
          type: recipientType,
          bankCode: providerCode,
          accountNumber,
          name: accountName,
          amount: Math.round(Number(form.get('amount')) * 100),
        }),
      });
      element.reset();
      setAccountNumber('');
      setAccountName('');
      setProviderCode('');
      setVerifyFeedback(null);
      await load();
      setWithdrawalFeedback({ type: 'success', message: 'Withdrawal created from the selected event revenue.' });
    } catch (error) {
      setWithdrawalFeedback({ type: 'error', message: error.message });
    }
  }
  async function withdrawalAction(item, action) {
    const body =
      action === 'process'
        ? {
            password: window.prompt(
              'Enter your current password to initiate this transfer:',
            ),
          }
        : undefined;
    if (action === 'process' && !body.password) return;
    if (
      !window.confirm(
        `${action[0].toUpperCase() + action.slice(1)} withdrawal ${item.reference}?`,
      )
    )
      return;
    setActionFeedback(null);
    try {
      const result = await api(
        `/api/v1/superadmin/financial/withdrawals/${item.id}/${action}`,
        { method: 'POST', body: body ? JSON.stringify(body) : undefined },
      );
      if (action === 'process' && result?.requiresOtp) {
        const otp = window.prompt('Enter the six-digit Paystack transfer OTP:');
        if (otp)
          await api(
            `/api/v1/superadmin/financial/withdrawals/${item.id}/finalize`,
            { method: 'POST', body: JSON.stringify({ otp }) },
          );
      }
      await load();
      setActionFeedback({ type: 'success', message: `Withdrawal ${action} action completed.` });
    } catch (error) {
      setActionFeedback({ type: 'error', message: error.message });
    }
  }
  if (state.loading)
    return (
      <AdminLayout
        session={session}
        title="Financial management"
        description="Wallet, ledger, and Paystack transfers."
      >
        <AdminLoading type="cards" />
      </AdminLayout>
    );
  const balance = data?.balance || {};
  return (
    <AdminLayout
      session={session}
      title="Financial management"
      description="Reconcile verified revenue, event fees, wallet entitlement, and Paystack transfers."
    >
      {state.error && <div className="admin-alert">{state.error}</div>}
      <div className="payment-summary financial-summary">
        <div>
          <small>Total revenue</small>
          <strong>{money(balance.totalEarned, balance.currency)}</strong>
        </div>
        <div>
          <small>Platform fees</small>
          <strong>{money(balance.totalFees, balance.currency)}</strong>
        </div>
        <div>
          <small>Withdrawn</small>
          <strong>{money(balance.totalWithdrawn, balance.currency)}</strong>
        </div>
        <div>
          <small>Pending</small>
          <strong>{money(balance.pendingWithdrawals, balance.currency)}</strong>
        </div>
        <div>
          <small>Available</small>
          <strong>{money(balance.availableBalance, balance.currency)}</strong>
        </div>
      </div>
      <section className="financial-paystack-balance">
        <span>Paystack account balance</span>
        <strong>
          {data.paystackBalances.length
            ? data.paystackBalances
                .map((item) => money(item.balance, item.currency))
                .join(' / ')
            : 'Unavailable'}
        </strong>
        <small>
          This provider balance is separate from TomaMe wallet entitlement.
        </small>
      </section>
      <form
        className="admin-form administrator-registration financial-withdrawal-form"
        onSubmit={requestWithdrawal}
      >
        <div>
          <span className="eyebrow">Wallet transfer</span>
          <h2>Make withdrawal</h2>
        </div>
        <label>
          Event revenue
          <select name="eventId" required>
            <option value="">Select event revenue</option>
            {(data.eventRevenue || []).map((event) => (
              <option
                value={event.id}
                key={event.id}
                disabled={event.availableBalance <= 0}
              >
                {event.name} · {money(event.availableBalance, event.currency)}{' '}
                available
              </option>
            ))}
          </select>
        </label>
        <div className="admin-form-row">
          <label>
            Destination type
            <select
              name="type"
              value={recipientType}
              onChange={(event) => {
                setRecipientType(event.target.value);
                setProvidersLoading(true);
                setProviderCode('');
                setAccountName('');
                setVerifyFeedback(null);
              }}
            >
              <option value="mobile_money">Mobile money</option>
              <option value="ghipss">Bank / GHiPSS</option>
            </select>
          </label>
          <label>
            {recipientType === 'mobile_money' ? 'Mobile money network' : 'Bank'}
            <select
              name="bankCode"
              required
              disabled={providersLoading}
              value={providerCode}
              onChange={(event) => {
                setProviderCode(event.target.value);
                setAccountName('');
                setVerifyFeedback(null);
              }}
            >
              <option value="">
                {providersLoading ? 'Loading providers...' : 'Select provider'}
              </option>
              {providers.map((provider) => (
                <option value={provider.code} key={provider.code}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Account or phone number
            <input
              name="accountNumber"
              required
              inputMode="numeric"
              value={accountNumber}
              onChange={(event) => {
                setAccountNumber(event.target.value);
                setAccountName('');
                setVerifyFeedback(null);
              }}
              onBlur={recipientType === 'ghipss' ? resolveRecipient : undefined}
            />
          </label>
          <label>
            Amount (GHS)
            <input name="amount" type="number" min="1" step="0.01" required />
          </label>
        </div>
        {recipientType === 'ghipss' && <button className="secondary-action" type="button" onClick={resolveRecipient} disabled={!providerCode || !accountNumber || accountResolving}>{accountResolving ? 'Verifying...' : 'Verify destination'}</button>}
        {verifyFeedback && <div className={`admin-inline-feedback ${verifyFeedback.type}`} role={verifyFeedback.type === 'error' ? 'alert' : 'status'}>{verifyFeedback.message}</div>}
        <label>
          {recipientType === 'mobile_money' ? 'Registered mobile-money name' : 'Verified recipient name'}
          <input
            value={accountName}
            readOnly={recipientType === 'ghipss'}
            onChange={recipientType === 'mobile_money' ? (event) => setAccountName(event.target.value) : undefined}
            placeholder={recipientType === 'mobile_money' ? 'Enter the name registered to this number' : 'Verify the destination to fetch its registered name'}
          />
        </label>
        <button
          className="primary-action"
          type="submit"
          disabled={
            providersLoading ||
            !providers.length ||
            !accountName ||
            accountResolving ||
            !(data.eventRevenue || []).some(
              (event) => event.availableBalance > 0,
            )
          }
        >
          Make withdrawal
        </button>
        {withdrawalFeedback && <div className={`admin-inline-feedback ${withdrawalFeedback.type}`} role={withdrawalFeedback.type === 'error' ? 'alert' : 'status'}>{withdrawalFeedback.message}</div>}
      </form>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Transfers</span>
          <h2>Withdrawals</h2>
        </div>
      </div>
      {actionFeedback && <div className={`admin-inline-feedback ${actionFeedback.type}`} role={actionFeedback.type === 'error' ? 'alert' : 'status'}>{actionFeedback.message}</div>}
      {withdrawals.length ? (
        <div className="candidate-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Event</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b className="table-reference">{item.reference}</b>
                  </td>
                  <td>{item.event?.name || 'Event'}</td>
                  <td>
                    {item.payoutRecipient.name}
                    <small>{item.payoutRecipient.accountNumber}</small>
                  </td>
                  <td>{money(item.amount, item.currency)}</td>
                  <td>
                    <span
                      className={`payment-status ${item.status === 'SUCCESS' ? 'paid' : item.status === 'FAILED' || item.status === 'REVERSED' ? 'failed' : ''}`}
                    >
                      <i />
                      {item.status}
                    </span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      {item.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => withdrawalAction(item, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => withdrawalAction(item, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {item.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => withdrawalAction(item, 'process')}
                        >
                          Process
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmpty
          icon={WalletCards}
          title="No withdrawals"
          text="Your withdrawals will appear here."
        />
      )}
      <div className="section-heading">
        <div>
          <span className="eyebrow">Append-only record</span>
          <h2>Recent ledger</h2>
        </div>
      </div>
      <div className="candidate-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Event</th>
              <th>Reference</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.recentLedger.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>{item.type.replaceAll('_', ' ')}</td>
                <td>{item.event?.name || 'Wallet'}</td>
                <td>
                  <b className="table-reference">{item.reference}</b>
                </td>
                <td
                  className={item.amount < 0 ? 'ledger-debit' : 'ledger-credit'}
                >
                  {item.amount < 0 ? '-' : '+'}
                  {money(Math.abs(item.amount), balance.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function AuditLogsPage({ session }) {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [retention, setRetention] = useState('active');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState({
    items: [],
    filters: { actions: [], resourceTypes: [] },
    pagination: { page: 1, total: 0, pageCount: 0 },
  });
  const [state, setState] = useState({ loading: true, error: '' });
  const load = useCallback(() => {
    api(
      `/api/v1/organizer/audit-logs?search=${encodeURIComponent(search)}&page=${page}&retention=${retention}${action ? `&action=${encodeURIComponent(action)}` : ''}${resourceType ? `&resourceType=${encodeURIComponent(resourceType)}` : ''}`,
    )
      .then((result) => {
        setData(result);
        setState({ loading: false, error: '' });
      })
      .catch((error) => setState({ loading: false, error: error.message }));
  }, [action, page, resourceType, retention, search]);
  useEffect(load, [load]);
  return (
    <AdminLayout
      session={session}
      title="Audit logs"
      description="Review security-sensitive and administrative activity for your organization."
    >
      <div className="management-toolbar audit-toolbar">
        <label className="admin-search">
          <Search />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Action, resource, or actor"
          />
        </label>
        <label>
          Action
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {data.filters.actions.map((item) => (
              <option key={item} value={item}>
                {readableAction(item)}
              </option>
            ))}
          </select>
          <ChevronDown />
        </label>
        <label>
          Resource
          <select
            value={resourceType}
            onChange={(event) => {
              setResourceType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All resources</option>
            {data.filters.resourceTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown />
        </label>
        <label>
          Retention
          <select
            value={retention}
            onChange={(event) => {
              setRetention(event.target.value);
              setPage(1);
            }}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All records</option>
          </select>
          <ChevronDown />
        </label>
      </div>
      {state.error && <div className="admin-alert">{state.error}</div>}
      {state.loading ? (
        <AdminLoading />
      ) : data.items.length ? (
        <div className="candidate-table-wrap">
          <table className="admin-table audit-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Actor</th>
                <th>Resource</th>
                <th>Source</th>
                <th>Date</th>
                <th>
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{readableAction(item.action)}</strong>
                  </td>
                  <td>
                    {item.user?.name || 'System'}
                    <small>{item.user?.email || 'Automated process'}</small>
                  </td>
                  <td>
                    {item.resourceType}
                    <small>{item.resourceId}</small>
                  </td>
                  <td>{item.ipAddress || 'Not recorded'}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      className="icon-action"
                      type="button"
                      title="View audit entry"
                      onClick={() => setSelected(item)}
                    >
                      <Eye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="payment-pagination">
            <span>
              Page {data.pagination.page} of {data.pagination.pageCount}
            </span>
            <div>
              <button
                type="button"
                title="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                title="Next page"
                disabled={page >= data.pagination.pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AdminEmpty
          icon={ClipboardList}
          title="No audit activity found"
          text="Administrative and security events will appear here."
        />
      )}
      {selected && (
        <Dialog title="Audit entry" onClose={() => setSelected(null)}>
          <div className="audit-detail">
            <dl>
              <div>
                <dt>Action</dt>
                <dd>{readableAction(selected.action)}</dd>
              </div>
              <div>
                <dt>Actor</dt>
                <dd>{selected.user?.name || 'System'}</dd>
              </div>
              <div>
                <dt>Resource</dt>
                <dd>
                  {selected.resourceType} / {selected.resourceId}
                </dd>
              </div>
              <div>
                <dt>IP address</dt>
                <dd>{selected.ipAddress || 'Not recorded'}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
              </div>
              {selected.archivedAt && (
                <div>
                  <dt>Archived</dt>
                  <dd>{new Date(selected.archivedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
            {selected.oldValue != null && (
              <section>
                <h3>Previous value</h3>
                <pre>
                  {JSON.stringify(safeAuditValue(selected.oldValue), null, 2)}
                </pre>
              </section>
            )}
            {selected.newValue != null && (
              <section>
                <h3>New value</h3>
                <pre>
                  {JSON.stringify(safeAuditValue(selected.newValue), null, 2)}
                </pre>
              </section>
            )}
          </div>
        </Dialog>
      )}
    </AdminLayout>
  );
}
export function SettingsRoute() {
  return <OrganizerGate page="settings" />;
}
export function AuditLogsRoute() {
  return <OrganizerGate page="audit-logs" />;
}
export function AdministratorsRoute() {
  return <OrganizerGate page="administrators" />;
}
export function FinancialRoute() {
  return <OrganizerGate page="financial" />;
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
