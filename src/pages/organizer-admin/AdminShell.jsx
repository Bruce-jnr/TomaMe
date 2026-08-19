import { useNavigate, Link, NavLink } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  Settings,
  Tag,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import logo from "../../assets/logo.png";
import { api } from "./adminApi.js";
export function AdminLayout({ session, title, description, action, children }) {
  const navigate = useNavigate();
  async function logout() {
    await api("/api/v1/auth/logout", { method: "POST" });
    navigate(
      session.globalRole === "SUPER_ADMIN"
        ? "/superadmin/login"
        : "/administrators/login",
    );
  }
  return (
    <div className="admin-shell management-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/">
          <img src={logo} alt="Toabapa" />
        </Link>
        <nav aria-label="Organizer navigation">
          <NavLink to="/dashboard" end>
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
          {session.globalRole === "SUPER_ADMIN" && (
            <NavLink to="/dashboard/settings">
              <Settings />
              Settings
            </NavLink>
          )}
          {session.globalRole === "SUPER_ADMIN" && (
            <NavLink to="/dashboard/administrators">
              <ShieldCheck />
              Administrators
            </NavLink>
          )}
          {session.globalRole === "SUPER_ADMIN" && (
            <NavLink to="/dashboard/financial">
              <WalletCards />
              Financial
            </NavLink>
          )}
          {session.globalRole === "SUPER_ADMIN" && (
            <NavLink to="/dashboard/audit-logs">
              <ClipboardList />
              Audit logs
            </NavLink>
          )}
        </nav>
        <div className="admin-profile">
          <span>
            {session.user.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <strong>{session.user.name}</strong>
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
        className={`mobile-admin-nav ${session.globalRole === "SUPER_ADMIN" ? "is-superadmin" : "is-event-admin"}`}
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
        {session.globalRole === "SUPER_ADMIN" && (
          <NavLink to="/dashboard/settings">
            <Settings />
            <span>Settings</span>
          </NavLink>
        )}
        {session.globalRole === "SUPER_ADMIN" && (
          <NavLink to="/dashboard/administrators">
            <ShieldCheck />
            <span>Admins</span>
          </NavLink>
        )}
        {session.globalRole === "SUPER_ADMIN" && (
          <NavLink to="/dashboard/financial">
            <WalletCards />
            <span>Wallet</span>
          </NavLink>
        )}
        {session.globalRole === "SUPER_ADMIN" && (
          <NavLink to="/dashboard/audit-logs">
            <ClipboardList />
            <span>Audit</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}

export function Dialog({ title, onClose, children }) {
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

export function AdminLoading({ type = "table" }) {
  if (type === "cards")
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
export function AdminEmpty({ icon: Icon, title, text }) {
  return (
    <div className="admin-empty">
      <Icon />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
