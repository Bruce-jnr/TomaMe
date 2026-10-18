import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Search,
} from "lucide-react";
import {
  AdminLayout,
  Dialog,
  AdminLoading,
  AdminEmpty,
} from "./AdminShell.jsx";
import { api } from "./adminApi.js";
import { readableAction, safeAuditValue } from "./auditUtils.js";
export function AuditLogsPage({ session }) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [retention, setRetention] = useState("active");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState({
    items: [],
    filters: { actions: [], resourceTypes: [] },
    pagination: { page: 1, total: 0, pageCount: 0 },
  });
  const [state, setState] = useState({ loading: true, error: "" });
  const load = useCallback(() => {
    api(
      `/api/v1/organizer/audit-logs?search=${encodeURIComponent(search)}&page=${page}&retention=${retention}${action ? `&action=${encodeURIComponent(action)}` : ""}${resourceType ? `&resourceType=${encodeURIComponent(resourceType)}` : ""}`,
    )
      .then((result) => {
        setData(result);
        setState({ loading: false, error: "" });
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
                    {item.user?.name || "System"}
                    <small>{item.user?.email || "Automated process"}</small>
                  </td>
                  <td>
                    {item.resourceType}
                    <small>{item.resourceId}</small>
                  </td>
                  <td>{item.ipAddress || "Not recorded"}</td>
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
                <dd>{selected.user?.name || "System"}</dd>
              </div>
              <div>
                <dt>Resource</dt>
                <dd>
                  {selected.resourceType} / {selected.resourceId}
                </dd>
              </div>
              <div>
                <dt>IP address</dt>
                <dd>{selected.ipAddress || "Not recorded"}</dd>
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
