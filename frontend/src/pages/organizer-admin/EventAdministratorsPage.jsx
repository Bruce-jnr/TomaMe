import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AdminLayout, AdminLoading, AdminEmpty } from "./AdminShell.jsx";
import { api } from "./adminApi.js";
import { useOrganizerContext } from "./useOrganizerContext.js";
export function EventAdministratorsPage({ session }) {
  const context = useOrganizerContext();
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: "", message: "" });
  const load = useCallback(() => {
    api("/api/v1/organizer/event-administrators")
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setState((current) => ({ ...current, loading: false, error: "" }));
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
    const eventIds = form.getAll("eventIds");
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      await api("/api/v1/organizer/event-administrators", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          username: form.get("username"),
          email: form.get("email"),
          phone: form.get("phone") || undefined,
          password: form.get("password"),
          eventIds,
        }),
      });
      formElement.reset();
      setState((current) => ({
        ...current,
        message: "Administrator created and assigned.",
      }));
      load();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    }
  }

  async function toggleAccess(item) {
    try {
      await api(`/api/v1/organizer/event-administrators/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          eventIds: (item.events || []).map((event) => event.id),
          status: item.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
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
                    <strong>{item.user?.name || "Administrator"}</strong>
                    <small>{item.user?.email || "No email"}</small>
                  </td>
                  <td>
                    <b className="table-reference">
                      {item.user?.username || "Not configured"}
                    </b>
                  </td>
                  <td>
                    {(item.events || [])
                      .map((event) => event.name)
                      .join(", ") || "No events assigned"}
                  </td>
                  <td>
                    <span
                      className={`payment-status ${item.status === "ACTIVE" ? "paid" : "failed"}`}
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
                      {item.status === "ACTIVE" ? "Suspend" : "Restore"}
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
