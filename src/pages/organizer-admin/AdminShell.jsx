import { useEffect, useState } from "react";
import { useNavigate, Link, NavLink } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
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

function DashboardNavigation({ session, onNavigate }) {
  return (
    <nav aria-label="Dashboard navigation">
      <NavLink to="/dashboard" end onClick={onNavigate}>
        <LayoutDashboard /> Overview
      </NavLink>
      <NavLink to="/dashboard/events" onClick={onNavigate}>
        <CalendarDays /> Events
      </NavLink>
      <NavLink to="/dashboard/categories" onClick={onNavigate}>
        <Tag /> Categories
      </NavLink>
      <NavLink to="/dashboard/candidates" onClick={onNavigate}>
        <Users /> Candidates
      </NavLink>
      <NavLink to="/dashboard/payments" onClick={onNavigate}>
        <ReceiptText /> Payments
      </NavLink>
      {session.globalRole === "SUPER_ADMIN" && (
        <>
          <NavLink to="/dashboard/settings" onClick={onNavigate}>
            <Settings /> Settings
          </NavLink>
          <NavLink to="/dashboard/administrators" onClick={onNavigate}>
            <ShieldCheck /> Administrators
          </NavLink>
          <NavLink to="/dashboard/financial" onClick={onNavigate}>
            <WalletCards /> Financial
          </NavLink>
          <NavLink to="/dashboard/audit-logs" onClick={onNavigate}>
            <ClipboardList /> Audit logs
          </NavLink>
        </>
      )}
    </nav>
  );
}

export function AdminLayout({ session, title, description, action, children }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) =>
      event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
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
        <DashboardNavigation session={session} />
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
            className="mobile-admin-menu-trigger"
            onClick={() => setMenuOpen(true)}
            type="button"
            title="Open dashboard menu"
            aria-label="Open dashboard menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-admin-menu"
          >
            <Menu />
          </button>
        </header>
        {children}
      </div>
      {menuOpen && (
        <div
          className="admin-menu-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setMenuOpen(false)
          }
        >
          <aside className="admin-menu-panel" id="mobile-admin-menu">
            <header>
              <img src={logo} alt="Toabapa" />
              <button
                className="icon-button"
                type="button"
                aria-label="Close dashboard menu"
                onClick={() => setMenuOpen(false)}
              >
                <X />
              </button>
            </header>
            <DashboardNavigation
              session={session}
              onNavigate={() => setMenuOpen(false)}
            />
            <footer>
              <div>
                <strong>{session.user.name}</strong>
              </div>
              <button type="button" onClick={logout}>
                <LogOut /> Sign out
              </button>
            </footer>
          </aside>
        </div>
      )}
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
