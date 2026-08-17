import { Component, useEffect, useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateEventPage from './CreateEventPage.jsx';
import { CategoriesPage } from './organizer-admin/CategoriesPage.jsx';
import { CandidatesPage } from './organizer-admin/CandidatesPage.jsx';
import { PaymentsPage } from './organizer-admin/PaymentsPage.jsx';
import { EventAdministratorsPage } from './organizer-admin/EventAdministratorsPage.jsx';
import { FinancialManagementPage } from './organizer-admin/FinancialManagementPage.jsx';
import { AuditLogsPage } from './organizer-admin/AuditLogsPage.jsx';
import { api } from './organizer-admin/adminApi.js';
import { LoginPage } from './organizer-admin/LoginPage.jsx';
import {
  OrganizerOverview,
  SettingsPage,
} from './organizer-admin/EventManagementPages.jsx';
import { AdminLayout, AdminEmpty } from './organizer-admin/AdminShell.jsx';

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

export function CategoriesRoute() {
  return <OrganizerGate page="categories" />;
}
export function CandidatesRoute() {
  return <OrganizerGate page="candidates" />;
}
export function PaymentsRoute() {
  return <OrganizerGate page="payments" />;
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
