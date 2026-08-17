import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ReceiptText,
  Search,
} from "lucide-react";
import { AdminLayout, Dialog, AdminLoading, AdminEmpty } from "./AdminShell.jsx";
import { api } from "./adminApi.js";
import { useOrganizerContext } from "./useOrganizerContext.js";
export function PaymentsPage({ session }) {
  const context = useOrganizerContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [eventId, setEventId] = useState("");
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
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api(
      `/api/v1/organizer/payments?search=${encodeURIComponent(search)}&page=${page}${status ? `&status=${status}` : ""}${eventId ? `&eventId=${eventId}` : ""}`,
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
      .join(" / ") || "GHS 0.00";
  function exportPage() {
    const headings = [
      "Reference",
      "Event",
      "Candidate",
      "Votes",
      "Channel",
      "Amount",
      "Currency",
      "Status",
      "Date",
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
      [[headings, ...rows].map((row) => row.map(quote).join(",")).join("\n")],
      { type: "text/csv" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
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
        className={`payment-summary ${loading ? "payment-summary-skeleton" : ""}`}
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
                {revenue.replace(/^GHS /, "")}
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
                        .join(" / ") || "GHS 0.00"}
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
              "PENDING",
              "PROCESSING",
              "PAID",
              "FAILED",
              "CANCELLED",
              "EXPIRED",
              "REFUNDED",
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
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
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
                  <td>{item.paymentMethod?.replaceAll("_", " ") || "—"}</td>
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
                <dd>{selected.providerTransactionId || "-"}</dd>
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
                    : "-"}
                </dd>
              </div>
            </dl>
          </div>
        </Dialog>
      )}
    </AdminLayout>
  );
}
