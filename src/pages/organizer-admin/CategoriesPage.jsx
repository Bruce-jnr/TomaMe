import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ChevronDown,
  Pencil,
  Plus,
  Tag,
  Users,
  X,
} from "lucide-react";
import {
  AdminLayout,
  Dialog,
  AdminLoading,
  AdminEmpty,
} from "./AdminShell.jsx";
import { api } from "./adminApi.js";
import { useOrganizerContext } from "./useOrganizerContext.js";
export function CategoriesPage({ session }) {
  const context = useOrganizerContext();
  const [eventId, setEventId] = useState("");
  const [items, setItems] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => {
    Promise.all([
      api(
        `/api/v1/organizer/categories${eventId ? `?eventId=${eventId}` : ""}`,
      ),
      api(
        `/api/v1/organizer/candidates${eventId ? `?eventId=${eventId}` : ""}`,
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
        method: "DELETE",
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
              className={`management-card category-drilldown-card ${selectedCategoryId === item.id ? "selected" : ""}`}
              key={item.id}
              role="button"
              tabIndex="0"
              aria-expanded={selectedCategoryId === item.id}
              onClick={() =>
                setSelectedCategoryId((current) =>
                  current === item.id ? "" : item.id,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedCategoryId((current) =>
                    current === item.id ? "" : item.id,
                  );
                }
              }}
            >
              <div className="management-card-icon">
                <Tag />
              </div>
              <span>{item.event.name}</span>
              <h2>{item.name}</h2>
              <p>{item.description || "No description added."}</p>
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
          onClose={() => setSelectedCategoryId("")}
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
                  className={`result-photo ${candidate.photoUrl ? "has-photo" : ""}`}
                >
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt="" />
                  ) : (
                    candidate.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
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
    eventId: item?.eventId || events[0]?.id || "",
    name: item?.name || "",
    description: item?.description || "",
    votePriceOverride: item?.votePriceOverride
      ? String(item.votePriceOverride / 100)
      : "",
  });
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    try {
      await api(
        item
          ? `/api/v1/organizer/categories/${item.id}`
          : "/api/v1/organizer/categories",
        {
          method: item ? "PATCH" : "POST",
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
      title={item ? "Edit category" : "Create category"}
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
            {item ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
