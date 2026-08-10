import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Compass,
  CreditCard,
  Home as HomeIcon,
  LoaderCircle,
  Menu,
  Search,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
  Vote,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import logo from "./assets/logo.png";
import organizerHero from "./assets/organizer-hero.jpg";
import {
  CandidatesRoute,
  CategoriesRoute,
  CreateEventRoute,
  DashboardRoute,
  EventsRoute,
  PaymentsRoute,
} from "./pages/OrganizerAdminPages.jsx";

const API_URL = import.meta.env.VITE_API_URL || "";

async function getJson(path, signal) {
  const response = await fetch(`${API_URL}${path}`, { signal });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success)
    throw new Error(
      payload?.error?.message || "Unable to load TomaMe right now.",
    );
  return payload.data;
}

function usePublicData(path) {
  const [state, setState] = useState({ path: "", data: [], error: "" });
  useEffect(() => {
    const controller = new AbortController();
    getJson(path, controller.signal)
      .then((data) => setState({ path, data, error: "" }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ path, data: [], error: error.message });
      });
    return () => controller.abort();
  }, [path]);
  return state.path === path
    ? { ...state, loading: false }
    : { data: [], error: "", loading: true };
}

function Shell({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="TomaMe home">
          <img src={logo} alt="TomaMe" />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/events">Explore</NavLink>
        </nav>
        <div className="header-actions">
          <Link className="organizer-link" to="/organizers">
            For organizers
          </Link>
          <button
            className="icon-button"
            type="button"
            aria-label="Open menu"
            title="Menu"
          >
            <Menu size={21} />
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <img src={logo} alt="TomaMe" />
        <p>&copy; {new Date().getFullYear()} TomaMe. All rights reserved.</p>
        <nav aria-label="Footer navigation">
          <Link to="/events">Explore events</Link>
          <Link to="/organizers">For organizers</Link>
        </nav>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          <HomeIcon />
          <span>Home</span>
        </NavLink>
        <NavLink to="/events">
          <Compass />
          <span>Explore</span>
        </NavLink>
        <NavLink to="/events?focus=search">
          <Search />
          <span>Search</span>
        </NavLink>
        <NavLink to="/results">
          <Trophy />
          <span>Results</span>
        </NavLink>
      </nav>
    </div>
  );
}

function SearchForm({ initialValue = "", compact = false }) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  function submit(event) {
    event.preventDefault();
    navigate(
      `/events${value.trim() ? `?search=${encodeURIComponent(value.trim())}` : ""}`,
    );
  }
  return (
    <form
      className={`search-form ${compact ? "compact" : ""}`}
      onSubmit={submit}
      role="search"
    >
      <Search aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search candidate, event or code"
        aria-label="Search TomaMe"
      />
      <button
        className="icon-button search-submit"
        type="submit"
        aria-label="Search"
        title="Search"
      >
        <ArrowRight size={19} />
      </button>
    </form>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status}`}>
      <span />
      {status === "live" ? "Live" : status}
    </span>
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function EventCard({ event, featured = false }) {
  return (
    <article className={`event-card ${featured ? "featured" : ""}`}>
      <div
        className="event-image"
        style={
          event.bannerUrl
            ? { backgroundImage: `url(${event.bannerUrl})` }
            : undefined
        }
      >
        <StatusBadge status={event.publicStatus} />
        <div className="event-image-fallback">
          <Trophy />
        </div>
      </div>
      <div className="event-content">
        <p className="event-organizer">{event.organization.name}</p>
        <h3>{event.name}</h3>
        <div className="event-meta">
          <span>
            <Users />
            {event._count.candidates} candidates
          </span>
          <span>
            <CalendarDays />
            {event.publicStatus === "live"
              ? `Ends ${formatDate(event.endAt)}`
              : formatDate(event.startAt)}
          </span>
        </div>
        <Link className="event-link" to={`/events/${event.slug}`}>
          {event.publicStatus === "ended" ? "View results" : "Explore event"}
          <ChevronRight />
        </Link>
      </div>
    </article>
  );
}

function LoadingCards() {
  return (
    <div className="loading-state">
      <LoaderCircle className="spin" />
      <span>Loading live events...</span>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="message-state error">
      <strong>We couldn&apos;t load this page.</strong>
      <span>{message}</span>
    </div>
  );
}

function HomePage() {
  const events = usePublicData("/api/v1/public/events?status=live");
  return (
    <Shell>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Ghana&apos;s public voting platform</span>
          <h1>
            Vote for the people who <em>inspire you.</em>
          </h1>
          <p>
            Discover active competitions, find your candidate, and show your
            support in a few simple steps.
          </p>
          <SearchForm />
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="ballot">
            <Vote />
            <strong>Your voice counts</strong>
            <span>Secure voting powered by TomaMe</span>
          </div>
          <div className="vote-mark">✓</div>
        </div>
      </section>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Happening now</span>
            <h2>Live events</h2>
          </div>
          <Link to="/events?status=live">
            See all <ArrowRight />
          </Link>
        </div>
        {events.loading ? (
          <LoadingCards />
        ) : events.error ? (
          <ErrorState message={events.error} />
        ) : events.data.length ? (
          <div className="event-grid">
            {events.data.slice(0, 3).map((event) => (
              <EventCard event={event} key={event.id} featured />
            ))}
          </div>
        ) : (
          <div className="message-state">
            <strong>No live events right now.</strong>
            <span>Check back soon for new competitions.</span>
          </div>
        )}
      </section>
      <section className="how-section">
        <div>
          <span className="eyebrow">Simple and transparent</span>
          <h2>Three steps to support your favorite</h2>
        </div>
        <ol>
          <li>
            <b>01</b>
            <strong>Find a candidate</strong>
            <span>Search by name or candidate code.</span>
          </li>
          <li>
            <b>02</b>
            <strong>Choose your votes</strong>
            <span>Select how many votes you want to cast.</span>
          </li>
          <li>
            <b>03</b>
            <strong>Pay securely</strong>
            <span>Confirm payment and receive your reference.</span>
          </li>
        </ol>
      </section>
    </Shell>
  );
}

function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "all";
  const search = params.get("search") || "";
  const path = useMemo(
    () =>
      `/api/v1/public/events?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`,
    [status, search],
  );
  const events = usePublicData(path);
  function changeStatus(next) {
    const updated = new URLSearchParams(params);
    if (next === "all") updated.delete("status");
    else updated.set("status", next);
    setParams(updated);
  }
  return (
    <Shell>
      <section className="explore-intro">
        <span className="eyebrow">Event discovery</span>
        <h1>Find an event worth celebrating.</h1>
        <p>
          Browse live competitions, upcoming events, and recently announced
          results.
        </p>
        <SearchForm initialValue={search} compact />
      </section>
      <section className="content-section explore-content">
        <div
          className="filter-row"
          role="group"
          aria-label="Filter events by status"
        >
          {["all", "live", "upcoming", "ended"].map((item) => (
            <button
              className={status === item ? "active" : ""}
              onClick={() => changeStatus(item)}
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="results-heading">
          <h2>
            {search
              ? `Results for “${search}”`
              : status === "all"
                ? "All events"
                : `${status} events`}
          </h2>
          <span>
            {events.loading ? "Loading" : `${events.data.length} found`}
          </span>
        </div>
        {events.loading ? (
          <LoadingCards />
        ) : events.error ? (
          <ErrorState message={events.error} />
        ) : events.data.length ? (
          <div className="event-grid explore-grid">
            {events.data.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        ) : (
          <div className="message-state">
            <Search />
            <strong>No matching events.</strong>
            <span>Try another search or event status.</span>
          </div>
        )}
      </section>
    </Shell>
  );
}

function EventDetailPage() {
  const { slug } = useParams();
  const event = usePublicData(
    `/api/v1/public/events/${encodeURIComponent(slug)}`,
  );
  const [category, setCategory] = useState("all");
  const [voteCandidate, setVoteCandidate] = useState(null);
  if (event.loading)
    return (
      <Shell>
        <div className="event-detail-state">
          <LoadingCards />
        </div>
      </Shell>
    );
  if (event.error)
    return (
      <Shell>
        <div className="event-detail-state">
          <ErrorState message={event.error} />
        </div>
      </Shell>
    );
  const data = event.data;
  const visibleCategories =
    category === "all"
      ? data.categories
      : data.categories.filter((item) => item.id === category);
  const price = (data.defaultVotePrice / 100).toLocaleString("en-GH", {
    style: "currency",
    currency: data.currency,
  });
  return (
    <Shell>
      <section
        className={`event-detail-hero ${data.bannerUrl ? "has-banner" : ""}`}
        style={
          data.bannerUrl
            ? { backgroundImage: `url(${data.bannerUrl})` }
            : undefined
        }
      >
        <div className="event-detail-overlay" />
        <div className="event-detail-copy">
          <StatusBadge status={data.publicStatus} />
          <span>{data.organization.name}</span>
          <h1>{data.name}</h1>
          <p>
            {data.description ||
              "Explore the categories and contestants in this event."}
          </p>
          <div className="event-detail-meta">
            <span>
              <CalendarDays />
              {data.publicStatus === "live"
                ? `Voting ends ${formatDate(data.endAt)}`
                : data.publicStatus === "paused"
                  ? "Voting is temporarily paused"
                : `Voting starts ${formatDate(data.startAt)}`}
            </span>
            <span>
              <Vote />
              {price} per vote
            </span>
            <span>
              <Users />
              {data.candidates.length} contestants
            </span>
          </div>
        </div>
      </section>
      <section className="contestant-section">
        {data.publicStatus === "paused" && (
          <div className="voting-paused-notice">
            <AlertCircle />
            <div><strong>Voting is temporarily paused</strong><span>You can still explore the contestants. Voting will resume when the organizer reopens it.</span></div>
          </div>
        )}
        <div className="contestant-heading">
          <div>
            <span className="eyebrow">Meet the contestants</span>
            <h2>Choose who you want to support.</h2>
          </div>
          <SearchForm compact />
        </div>
        <div
          className="category-tabs"
          role="tablist"
          aria-label="Contestant categories"
        >
          <button
            className={category === "all" ? "active" : ""}
            onClick={() => setCategory("all")}
            type="button"
          >
            All contestants <span>{data.candidates.length}</span>
          </button>
          {data.categories.map((item) => (
            <button
              className={category === item.id ? "active" : ""}
              onClick={() => setCategory(item.id)}
              type="button"
              key={item.id}
            >
              {item.name} <span>{item._count.candidates}</span>
            </button>
          ))}
        </div>
        {visibleCategories.length ? (
          <div className="category-contestant-groups">
            {visibleCategories.map((categoryItem) => (
              <CategoryContestants
                category={categoryItem}
                candidates={data.candidates.filter(
                  (candidate) => candidate.categoryId === categoryItem.id,
                )}
                result={data.categoryResults.find(
                  (item) => item.categoryId === categoryItem.id,
                )}
                eventStatus={data.publicStatus}
                onVote={setVoteCandidate}
                key={categoryItem.id}
              />
            ))}
          </div>
        ) : (
          <div className="message-state">
            <Users />
            <strong>No contestants in this category.</strong>
            <span>Check another category.</span>
          </div>
        )}
      </section>
      {voteCandidate && (
        <VoteDialog
          candidate={voteCandidate}
          event={data}
          onClose={() => setVoteCandidate(null)}
        />
      )}
    </Shell>
  );
}

function CategoryContestants({ category, candidates, result, eventStatus, onVote }) {
  const resultLabel =
    result?.visibility === "EXACT_TOTALS"
      ? `${(result.totalVotes || 0).toLocaleString()} current votes`
      : result?.visibility === "PERCENTAGES"
        ? "Current percentages"
        : result?.visibility === "RANKING_ONLY"
          ? "Current ranking"
          : "Results are private";
  return (
    <section className="category-contestant-group">
      <div className="category-statistics">
        <div>
          <span>Category voting statistics</span>
          <h3>{category.name}</h3>
          <p>{category.description || `${candidates.length} contestants in this category.`}</p>
        </div>
        <div className="category-stat-values">
          <span>
            <small>Contestants</small>
            <strong>{candidates.length}</strong>
          </span>
          <span>
            <small>Vote status</small>
            <strong>{resultLabel}</strong>
          </span>
          {result?.leader && (
            <span>
              <small>Current leader</small>
              <strong>{result.leader.name}</strong>
              <em>
                {result.visibility === "EXACT_TOTALS"
                  ? `${result.leader.votes.toLocaleString()} votes`
                  : result.visibility === "PERCENTAGES"
                    ? `${result.leader.percentage}%`
                    : result.leader.candidateCode}
              </em>
            </span>
          )}
        </div>
      </div>
      {candidates.length ? (
        <div className="contestant-grid">
          {candidates.map((candidate) => {
            const initials = candidate.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2);
            return (
              <article className="contestant-card" key={candidate.id}>
                <div className="contestant-portrait">
                  {candidate.photoUrl ? <img src={candidate.photoUrl} alt={candidate.name} /> : <span>{initials}</span>}
                  <b>{candidate.candidateCode}</b>
                  {candidate.result && (
                    <div className="candidate-result">
                      <small>Rank #{candidate.result.rank}</small>
                      <strong>
                        {candidate.result.votes !== undefined
                          ? `${candidate.result.votes.toLocaleString()} votes`
                          : candidate.result.percentage !== undefined
                            ? `${candidate.result.percentage}%`
                            : `#${candidate.result.rank}`}
                      </strong>
                    </div>
                  )}
                </div>
                <div className="contestant-body">
                  <span>{candidate.category.name}</span>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.slogan || candidate.biography || "Support this contestant in the event."}</p>
                  <button className="primary-action" type="button" onClick={() => onVote(candidate)} disabled={eventStatus !== "live"}>
                    <Vote />{eventStatus === "live" ? "Vote now" : eventStatus === "paused" ? "Voting paused" : "Voting unavailable"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="message-state"><Users /><strong>No contestants in this category.</strong><span>Contestants will appear here when added.</span></div>
      )}
    </section>
  );
}

function VoteDialog({ candidate, event, onClose }) {
  const quickVotes = [1, 5, 10, 20, 50, 100, 500];
  const [quantity, setQuantity] = useState(
    Math.max(1, event.minimumVotes || 1),
  );
  const [custom, setCustom] = useState("");
  const [contact, setContact] = useState({ phone: "" });
  const [order, setOrder] = useState(null);
  const [state, setState] = useState({
    phase: "details",
    loading: false,
    error: "",
  });

  useEffect(() => {
    function closeOnEscape(keyEvent) {
      if (keyEvent.key === "Escape" && !state.loading) onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, state.loading]);

  function chooseQuantity(value) {
    setQuantity(value);
    setCustom("");
    setState((current) => ({ ...current, error: "" }));
  }
  function setCustomQuantity(value) {
    setCustom(value);
    setQuantity(Number(value));
    setState((current) => ({ ...current, error: "" }));
  }

  async function createOrder(formEvent) {
    formEvent.preventDefault();
    if (
      !Number.isInteger(quantity) ||
      quantity < event.minimumVotes ||
      quantity > event.maximumVotesPerTransaction
    ) {
      setState({
        phase: "details",
        loading: false,
        error: `Choose between ${event.minimumVotes} and ${event.maximumVotesPerTransaction} votes.`,
      });
      return;
    }
    setState({ phase: "details", loading: true, error: "" });
    try {
      const response = await fetch("/api/v1/vote-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          quantity,
          phone: contact.phone,
          channel: "WEB",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw new Error(
          payload?.error?.message || "Unable to create vote order.",
        );
      setOrder(payload.data);
      setState({ phase: "review", loading: false, error: "" });
    } catch (error) {
      setState({ phase: "details", loading: false, error: error.message });
    }
  }

  async function pay() {
    setState({ phase: "review", loading: true, error: "" });
    try {
      const response = await fetch(
        `/api/v1/payments/${encodeURIComponent(order.paymentReference)}/initialize`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw new Error(
          payload?.error?.message || "Unable to initialize payment.",
        );
      window.location.assign(payload.data.authorizationUrl);
    } catch (error) {
      setState({ phase: "review", loading: false, error: error.message });
    }
  }

  return (
    <div
      className="vote-dialog-backdrop"
      role="presentation"
      onMouseDown={(mouseEvent) =>
        mouseEvent.target === mouseEvent.currentTarget &&
        !state.loading &&
        onClose()
      }
    >
      <section
        className="vote-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-dialog-title"
      >
        <header>
          <div>
            <span>{candidate.candidateCode}</span>
            <h2 id="vote-dialog-title">Vote for {candidate.name}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={state.loading}
            aria-label="Close voting form"
          >
            <X />
          </button>
        </header>
        {state.phase === "details" ? (
          <form onSubmit={createOrder}>
            <div className="vote-candidate-summary">
              <div>
                {candidate.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <span>
                <small>{candidate.category.name}</small>
                <strong>{candidate.name}</strong>
              </span>
            </div>
            <fieldset className="vote-quantity">
              <legend>How many votes?</legend>
              <div>
                {quickVotes.map((value) => (
                  <button
                    className={quantity === value && !custom ? "active" : ""}
                    onClick={() => chooseQuantity(value)}
                    type="button"
                    key={value}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <label>
                Custom quantity
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={custom}
                  onChange={(inputEvent) =>
                    setCustomQuantity(inputEvent.target.value)
                  }
                  placeholder="Enter votes"
                />
              </label>
            </fieldset>
            <div className="vote-contact single">
              <label>
                Mobile number
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(inputEvent) => setContact({ phone: inputEvent.target.value })}
                  placeholder="+233 20 000 0000"
                  minLength="7"
                  maxLength="20"
                  required
                />
              </label>
            </div>
            {state.error && (
              <div className="vote-error">
                <AlertCircle />
                {state.error}
              </div>
            )}
            <footer>
              <div>
                <small>Estimated total</small>
                <strong>
                  {event.currency}{" "}
                  {(((quantity || 0) * event.defaultVotePrice) / 100).toFixed(
                    2,
                  )}
                </strong>
              </div>
              <button
                className="primary-action"
                disabled={state.loading}
                type="submit"
              >
                {state.loading ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <ArrowRight />
                )}
                Review votes
              </button>
            </footer>
          </form>
        ) : (
          <div className="vote-review">
            <div className="review-check">
              <CheckCircle2 />
            </div>
            <span className="eyebrow">Confirm your vote</span>
            <h3>
              {order.quantity} votes for {candidate.name}
            </h3>
            <dl>
              <div>
                <dt>Candidate code</dt>
                <dd>{candidate.candidateCode}</dd>
              </div>
              <div>
                <dt>Price per vote</dt>
                <dd>
                  {order.currency} {(order.unitPrice / 100).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt>Total payment</dt>
                <dd>
                  {order.currency} {(order.amount / 100).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{order.paymentReference}</dd>
              </div>
            </dl>
            <p>
              Votes are credited only after Paystack confirms a successful
              payment.
            </p>
            {state.error && (
              <div className="vote-error">
                <AlertCircle />
                {state.error}
              </div>
            )}
            <div className="review-actions">
              <button
                className="secondary-action"
                disabled={state.loading}
                onClick={() =>
                  setState({ phase: "details", loading: false, error: "" })
                }
                type="button"
              >
                Back
              </button>
              <button
                className="primary-action"
                disabled={state.loading}
                onClick={pay}
                type="button"
              >
                {state.loading ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <CreditCard />
                )}
                Pay securely
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function PaymentVerifyPage() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [state, setState] = useState({ loading: true, error: "", data: null });
  useEffect(() => {
    if (!reference) {
      Promise.resolve().then(() =>
        setState({
          loading: false,
          error: "Payment reference is missing.",
          data: null,
        }),
      );
      return;
    }
    const controller = new AbortController();
    getJson(
      `/api/v1/payments/${encodeURIComponent(reference)}/verify`,
      controller.signal,
    )
      .then((data) => setState({ loading: false, error: "", data }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ loading: false, error: error.message, data: null });
      });
    return () => controller.abort();
  }, [reference]);
  return (
    <Shell>
      <section className="payment-result">
        {state.loading ? (
          <>
            <LoaderCircle className="spin" />
            <span className="eyebrow">Verifying payment</span>
            <h1>Please wait while we confirm your vote.</h1>
            <p>Do not close or refresh this page.</p>
          </>
        ) : state.error ? (
          <>
            <div className="result-icon failed">
              <AlertCircle />
            </div>
            <span className="eyebrow">Payment not confirmed</span>
            <h1>Your votes have not been credited.</h1>
            <p>{state.error}</p>
            <Link className="secondary-action" to="/events">
              Return to events
            </Link>
          </>
        ) : (
          <>
            <div className="result-icon success">
              <CheckCircle2 />
            </div>
            <span className="eyebrow">Vote credited</span>
            <h1>Thank you for supporting {state.data.candidate.name}.</h1>
            <p>
              {state.data.quantity} votes were credited successfully. Reference:{" "}
              <strong>{state.data.reference}</strong>
            </p>
            <Link className="primary-action" to="/events">
              Explore more events
            </Link>
          </>
        )}
      </section>
    </Shell>
  );
}

const organizerCapabilities = [
  {
    icon: Vote,
    title: "One voting engine",
    text: "Web and USSD orders follow the same pricing, payment verification, and vote-crediting rules.",
  },
  {
    icon: WalletCards,
    title: "Verified payments",
    text: "Votes are credited only after the provider confirms the expected amount and currency.",
  },
  {
    icon: BarChart3,
    title: "Useful reporting",
    text: "Follow vote volume, revenue, candidate performance, payment success, and channel mix.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant isolation",
    text: "Organization records and administrative actions are scoped and authorized on the server.",
  },
];

function OrganizerPage() {
  return (
    <Shell>
      <section
        className="organizer-hero"
        style={{ backgroundImage: `url(${organizerHero})` }}
      >
        <div className="organizer-hero-content">
          <span className="organizer-kicker">
            Built for awards, pageants, and competitions
          </span>
          <h1>Run voting with confidence from nomination to results.</h1>
          <p>
            Create your event, manage candidates, accept paid votes, and track
            every verified transaction in one organized workspace.
          </p>
          <div className="organizer-hero-actions">
            <Link className="organizer-primary" to="/dashboard/events/new">
              Create an event <ArrowRight />
            </Link>
            <a className="organizer-secondary" href="#workflow">
              See how it works
            </a>
          </div>
          <div className="organizer-proof">
            <span>
              <CheckCircle2 />
              No voter account required
            </span>
            <span>
              <CheckCircle2 />
              Web and USSD ready
            </span>
            <span>
              <CheckCircle2 />
              Auditable vote ledger
            </span>
          </div>
        </div>
      </section>

      <section className="organizer-intro">
        <div>
          <span className="eyebrow">Your event, under control</span>
          <h2>A practical workspace for serious public voting.</h2>
        </div>
        <p>
          TomaMe keeps event operations, payments, voting channels, results, and
          reporting connected. Your team gets the information needed to run the
          event while voters get a short, clear path to support a candidate.
        </p>
      </section>

      <section className="organizer-capabilities">
        {organizerCapabilities.map(({ icon: Icon, title, text }, index) => (
          <article key={title}>
            <span className="capability-number">0{index + 1}</span>
            <Icon />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="organizer-workflow" id="workflow">
        <div className="workflow-copy">
          <span className="eyebrow">From setup to settlement</span>
          <h2>Everything follows the event lifecycle.</h2>
          <p>
            Build the event in stages, open voting when you are ready, and keep
            financial and vote records traceable after results are announced.
          </p>
          <Link to="/dashboard/events/new">
            Start event setup <ArrowRight />
          </Link>
        </div>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>Configure</strong>
              <p>
                Set schedule, pricing, channels, result visibility, and event
                branding.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Organize</strong>
              <p>
                Add categories, candidates, unique codes, photos, and campaign
                details.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Launch</strong>
              <p>
                Publish the event and let voters discover candidates on web or
                USSD.
              </p>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <strong>Measure</strong>
              <p>
                Review verified transactions, channel performance, rankings, and
                reports.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="organizer-channels">
        <div className="channel-heading">
          <span className="eyebrow">Meet voters where they are</span>
          <h2>One event. Multiple voting channels.</h2>
        </div>
        <div className="channel-panels">
          <article className="web-channel">
            <div className="channel-icon">
              <Zap />
            </div>
            <span>Web voting</span>
            <h3>A direct route from discovery to payment.</h3>
            <p>
              Voters search by event, name, or candidate code, select a
              quantity, review the total, and complete payment without creating
              an account.
            </p>
            <ul>
              <li>
                <CheckCircle2 />
                Mobile-first candidate pages
              </li>
              <li>
                <CheckCircle2 />
                Server-calculated prices
              </li>
              <li>
                <CheckCircle2 />
                Payment verification states
              </li>
            </ul>
          </article>
          <article className="ussd-channel">
            <div className="channel-icon">
              <Smartphone />
            </div>
            <span>USSD voting</span>
            <h3>Candidate-code voting beyond the browser.</h3>
            <p>
              The same event rules and vote ledger can serve short-code
              sessions, mobile money requests, and confirmation messages.
            </p>
            <ul>
              <li>
                <CheckCircle2 />
                Fast candidate-code lookup
              </li>
              <li>
                <CheckCircle2 />
                Session-aware menu flow
              </li>
              <li>
                <CheckCircle2 />
                Shared payment integrity
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="organizer-dashboard-preview">
        <div className="preview-copy">
          <span className="eyebrow">Operational visibility</span>
          <h2>Know what is happening while voting is live.</h2>
          <p>
            Monitor the numbers that matter without loading raw transaction
            history into the browser.
          </p>
          <ul>
            <li>
              <CheckCircle2 />
              Votes and revenue over time
            </li>
            <li>
              <CheckCircle2 />
              Web versus USSD performance
            </li>
            <li>
              <CheckCircle2 />
              Top candidates and categories
            </li>
            <li>
              <CheckCircle2 />
              Payment success and failure rates
            </li>
          </ul>
        </div>
        <div
          className="analytics-window"
          aria-label="Example organizer analytics"
        >
          <div className="analytics-top">
            <div>
              <small>Event performance</small>
              <strong>Live overview</strong>
            </div>
            <span>Last 7 days</span>
          </div>
          <div className="metric-row">
            <div>
              <small>Total votes</small>
              <strong>24,860</strong>
              <em>+18.4%</em>
            </div>
            <div>
              <small>Gross revenue</small>
              <strong>GH₵24,860</strong>
              <em>+16.1%</em>
            </div>
            <div>
              <small>Success rate</small>
              <strong>94.8%</strong>
              <em>+2.3%</em>
            </div>
          </div>
          <div className="chart-area">
            <div className="chart-label">
              <span>Votes over time</span>
              <span>Web&nbsp;&nbsp; USSD</span>
            </div>
            <div className="bar-chart">
              {[38, 52, 46, 67, 59, 78, 72, 88, 64, 94, 81, 100].map(
                (height, index) => (
                  <i style={{ height: `${height}%` }} key={index}>
                    <b style={{ height: `${Math.max(18, height * 0.38)}%` }} />
                  </i>
                ),
              )}
            </div>
          </div>
          <div className="analytics-bottom">
            <span>
              <i />
              Web<strong>72%</strong>
            </span>
            <span>
              <i />
              USSD<strong>28%</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="organizer-integrity">
        <div className="integrity-mark">
          <ShieldCheck />
        </div>
        <div>
          <span className="eyebrow">Financial integrity by design</span>
          <h2>A successful payment credits votes once.</h2>
          <p>
            Payment status and vote-processing status remain separate. Verified
            transactions enter an append-oriented ledger, duplicate provider
            callbacks add no extra votes, and candidate totals can be
            reconstructed from transaction history.
          </p>
        </div>
      </section>

      <section className="organizer-final-cta">
        <span className="eyebrow">Prepare your next event</span>
        <h2>Give your team a better way to run public voting.</h2>
        <p>Start with event details, schedule, pricing, and voting channels.</p>
        <Link className="organizer-primary" to="/dashboard/events/new">
          Create your event <ArrowRight />
        </Link>
      </section>
    </Shell>
  );
}

function PlaceholderPage() {
  return (
    <Shell>
      <section className="message-page">
        <Trophy />
        <h1>Coming next</h1>
        <p>This route will be connected in the next frontend phase.</p>
        <Link className="primary-button" to="/events">
          Explore events
        </Link>
      </section>
    </Shell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<ExplorePage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route path="/payment/verify" element={<PaymentVerifyPage />} />
        <Route path="/organizers" element={<OrganizerPage />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/dashboard/events/new" element={<CreateEventRoute />} />
        <Route path="/dashboard/events" element={<EventsRoute />} />
        <Route path="/dashboard/categories" element={<CategoriesRoute />} />
        <Route path="/dashboard/candidates" element={<CandidatesRoute />} />
        <Route path="/dashboard/payments" element={<PaymentsRoute />} />
        <Route path="/dashboard/transactions" element={<PaymentsRoute />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
