import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  FileImage,
  Gauge,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  ReceiptText,
  Save,
  Settings2,
  Tag,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const STORAGE_KEY = 'toabapa:create-event-draft';
const steps = [
  { name: 'Event details', icon: FileImage },
  { name: 'Schedule', icon: CalendarDays },
  { name: 'Vote settings', icon: Settings2 },
  { name: 'Review', icon: Check },
];

const emptyDraft = {
  name: '',
  description: '',
  startDate: '',
  startTime: '08:00',
  endDate: '',
  endTime: '23:59',
  timezone: 'Africa/Accra',
  currency: 'GHS',
  votePrice: '1.00',
  platformFeePercent: '',
  minimumVotes: '1',
  maximumVotes: '500',
  webVotingEnabled: true,
  ussdVotingEnabled: false,
  resultsVisibility: 'ADMIN_ONLY',
};

function loadDraft() {
  try {
    return {
      ...emptyDraft,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),
    };
  } catch {
    return emptyDraft;
  }
}

function FieldError({ children }) {
  return children ? (
    <span className="field-error" role="alert">
      {children}
    </span>
  ) : null;
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(loadDraft);
  const [errors, setErrors] = useState({});
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [saved, setSaved] = useState(false);
  const [complete, setComplete] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishedEvent, setPublishedEvent] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(
    () => () => {
      if (bannerUrl) URL.revokeObjectURL(bannerUrl);
    },
    [bannerUrl],
  );

  const progress = ((step + 1) / steps.length) * 100;
  const eventWindow = useMemo(() => {
    if (!draft.startDate || !draft.endDate) return null;
    return {
      start: new Date(`${draft.startDate}T${draft.startTime}`),
      end: new Date(`${draft.endDate}T${draft.endTime}`),
    };
  }, [draft.endDate, draft.endTime, draft.startDate, draft.startTime]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setSaved(false);
  }

  function validateCurrentStep() {
    const nextErrors = {};
    if (step === 0) {
      if (!draft.name.trim()) nextErrors.name = 'Enter an event name.';
      if (draft.name.length > 100)
        nextErrors.name = 'Use 100 characters or fewer.';
      if (draft.description.length > 500)
        nextErrors.description = 'Use 500 characters or fewer.';
    }
    if (step === 1) {
      if (!draft.startDate) nextErrors.startDate = 'Choose a start date.';
      if (!draft.endDate) nextErrors.endDate = 'Choose an end date.';
      if (eventWindow && eventWindow.end <= eventWindow.start)
        nextErrors.endDate = 'End time must be after the start time.';
    }
    if (step === 2) {
      if (Number(draft.votePrice) <= 0)
        nextErrors.votePrice = 'Vote price must be greater than zero.';
      if (draft.platformFeePercent === '' || Number(draft.platformFeePercent) < 0 || Number(draft.platformFeePercent) > 100)
        nextErrors.platformFeePercent = 'Enter a platform fee from 0 to 100 percent.';
      if (
        !Number.isInteger(Number(draft.minimumVotes)) ||
        Number(draft.minimumVotes) < 1
      )
        nextErrors.minimumVotes = 'Minimum must be at least 1.';
      if (
        !Number.isInteger(Number(draft.maximumVotes)) ||
        Number(draft.maximumVotes) < Number(draft.minimumVotes)
      )
        nextErrors.maximumVotes = 'Maximum must be at least the minimum.';
      if (!draft.webVotingEnabled && !draft.ussdVotingEnabled)
        nextErrors.channels = 'Enable at least one voting channel.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function next() {
    if (!validateCurrentStep()) return;
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function finish() {
    if (!validateCurrentStep()) return;
    setPublishing(true);
    setPublishError('');
    try {
      let uploadedBannerUrl = '';
      if (bannerFile) {
        const uploadResponse = await fetch('/api/v1/organizer/event-images', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': bannerFile.type },
          body: bannerFile,
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload.success) {
          throw new Error(uploadPayload?.error?.message || 'Unable to upload the event banner.');
        }
        uploadedBannerUrl = uploadPayload.data.bannerUrl;
      }
      const response = await fetch('/api/v1/organizer/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          startAt: new Date(
            `${draft.startDate}T${draft.startTime}:00Z`,
          ).toISOString(),
          endAt: new Date(
            `${draft.endDate}T${draft.endTime}:00Z`,
          ).toISOString(),
          timezone: draft.timezone,
          currency: draft.currency,
          defaultVotePrice: Math.round(Number(draft.votePrice) * 100),
          platformFeeBps: Math.round(Number(draft.platformFeePercent) * 100),
          minimumVotes: Number(draft.minimumVotes),
          maximumVotesPerTransaction: Number(draft.maximumVotes),
          webVotingEnabled: draft.webVotingEnabled,
          ussdVotingEnabled: draft.ussdVotingEnabled,
          resultsVisibility: draft.resultsVisibility,
          bannerUrl: uploadedBannerUrl,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw new Error(
          payload?.error?.message || 'Unable to publish the event.',
        );
      setPublishedEvent(payload.data);
      setComplete(true);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      setPublishError(error.message);
    } finally {
      setPublishing(false);
    }
  }

  function selectBanner(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        banner: 'Choose a JPG, PNG, or WebP image under 5 MB.',
      }));
      return;
    }
    if (bannerUrl) URL.revokeObjectURL(bannerUrl);
    setBannerUrl(URL.createObjectURL(file));
    setBannerFile(file);
    setErrors((current) => ({ ...current, banner: '' }));
  }

  if (complete) {
    return (
      <div className="admin-shell success-screen">
        <div className="success-panel">
          <div className="success-icon">
            <Check />
          </div>
          <span className="eyebrow">Event published</span>
          <h1>{draft.name}</h1>
          <p>
            Your event is now available in Explore. Continue by adding
            categories and candidates.
          </p>
          <div className="success-actions">
            <button
              className="primary-action"
              onClick={() => navigate(`/events/${publishedEvent.slug}`)}
              type="button"
            >
              View public event <ArrowRight />
            </button>
            <button
              className="secondary-action"
              onClick={() => navigate('/dashboard/categories')}
              type="button"
            >
              Add categories
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/">
          <img src={logo} alt="Toabapa" />
        </Link>
        <nav aria-label="Organizer navigation">
          <Link to="/dashboard">
            <LayoutDashboard />
            Overview
          </Link>
          <Link className="active" to="/dashboard/events">
            <CalendarDays />
            Events
          </Link>
          <Link to="/dashboard/categories">
            <Tag />
            Categories
          </Link>
          <Link to="/dashboard/candidates">
            <Users />
            Candidates
          </Link>
          <Link to="/dashboard/payments">
            <ReceiptText />
            Payments
          </Link>
        </nav>
        <div className="admin-profile">
          <span>TM</span>
          <div>
            <strong>Toabapa Organizer</strong>
            <small>Event workspace</small>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="wizard-header">
          <Link
            className="icon-button"
            to="/dashboard"
            aria-label="Back to events"
            title="Back"
          >
            <ArrowLeft />
          </Link>
          <div>
            <span>Create event</span>
            <strong>{steps[step].name}</strong>
          </div>
          <button className="save-action" onClick={saveDraft} type="button">
            {saved ? <Check /> : <Save />}
            {saved ? 'Saved' : 'Save draft'}
          </button>
        </header>

        <div
          className="wizard-progress"
          aria-label={`Step ${step + 1} of ${steps.length}`}
        >
          <div className="progress-label">
            <span>
              Step {step + 1} of {steps.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol>
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <li
                  className={
                    index === step ? 'active' : index < step ? 'done' : ''
                  }
                  key={item.name}
                >
                  <button
                    type="button"
                    onClick={() => index < step && setStep(index)}
                    disabled={index > step}
                  >
                    <span>{index < step ? <Check /> : <Icon />}</span>
                    <small>{item.name}</small>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <section className="wizard-content">
          {step === 0 && (
            <div className="form-step">
              <div className="step-intro">
                <span className="eyebrow">Start with the essentials</span>
                <h1>Tell us about your event</h1>
                <p>This information introduces your event to voters.</p>
              </div>
              <div className="field-group">
                <label>
                  Event banner <span>Optional</span>
                </label>
                <label
                  className={`banner-upload ${bannerUrl ? 'has-image' : ''}`}
                >
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Event banner preview" />
                  ) : (
                    <>
                      <span className="upload-icon">
                        <ImagePlus />
                      </span>
                      <strong>Upload event banner</strong>
                      <small>JPG, PNG or WebP · 16:9 · Max 5 MB</small>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={selectBanner}
                  />
                  {bannerUrl && (
                    <span className="replace-image">
                      <Upload />
                      Replace image
                    </span>
                  )}
                </label>
                <FieldError>{errors.banner}</FieldError>
              </div>
              <div className="field-group">
                <label htmlFor="event-name">Event name</label>
                <input
                  id="event-name"
                  className={errors.name ? 'invalid' : ''}
                  maxLength="100"
                  value={draft.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="e.g. Ghana Student Awards 2026"
                />
                <div className="field-help">
                  <FieldError>{errors.name}</FieldError>
                  <span>{draft.name.length}/100</span>
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="description">
                  Description <span>Optional</span>
                </label>
                <textarea
                  id="description"
                  className={errors.description ? 'invalid' : ''}
                  maxLength="500"
                  rows="6"
                  value={draft.description}
                  onChange={(event) =>
                    update('description', event.target.value)
                  }
                  placeholder="Tell voters what this event celebrates..."
                />
                <div className="field-help">
                  <FieldError>{errors.description}</FieldError>
                  <span>{draft.description.length}/500</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="form-step">
              <div className="step-intro">
                <span className="eyebrow">Voting window</span>
                <h1>Set the event schedule</h1>
                <p>The backend will enforce these dates for every vote.</p>
              </div>
              <div className="field-grid">
                <div className="field-group">
                  <label htmlFor="start-date">Start date</label>
                  <input
                    id="start-date"
                    type="date"
                    value={draft.startDate}
                    onChange={(event) =>
                      update('startDate', event.target.value)
                    }
                  />
                  <FieldError>{errors.startDate}</FieldError>
                </div>
                <div className="field-group">
                  <label htmlFor="start-time">Start time</label>
                  <input
                    id="start-time"
                    type="time"
                    value={draft.startTime}
                    onChange={(event) =>
                      update('startTime', event.target.value)
                    }
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="end-date">End date</label>
                  <input
                    id="end-date"
                    className={errors.endDate ? 'invalid' : ''}
                    type="date"
                    value={draft.endDate}
                    onChange={(event) => update('endDate', event.target.value)}
                  />
                  <FieldError>{errors.endDate}</FieldError>
                </div>
                <div className="field-group">
                  <label htmlFor="end-time">End time</label>
                  <input
                    id="end-time"
                    type="time"
                    value={draft.endTime}
                    onChange={(event) => update('endTime', event.target.value)}
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  value={draft.timezone}
                  onChange={(event) => update('timezone', event.target.value)}
                >
                  <option value="Africa/Accra">Africa/Accra (GMT)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div className="schedule-note">
                <Clock3 />
                <div>
                  <strong>Voting activates automatically</strong>
                  <span>
                    Scheduled events become active at the start time and close
                    at the end time.
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <div className="step-intro">
                <span className="eyebrow">Pricing and access</span>
                <h1>Configure voting</h1>
                <p>
                  All prices are stored and calculated in minor currency units.
                </p>
              </div>
              <div className="field-grid pricing-grid">
                <div className="field-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={draft.currency}
                    onChange={(event) => update('currency', event.target.value)}
                  >
                    <option value="GHS">GHS · Ghana cedi</option>
                    <option value="NGN">NGN · Nigerian naira</option>
                    <option value="USD">USD · US dollar</option>
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="vote-price">Price per vote</label>
                  <div className="input-prefix">
                    <span>{draft.currency}</span>
                    <input
                      id="vote-price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={draft.votePrice}
                      onChange={(event) =>
                        update('votePrice', event.target.value)
                      }
                    />
                  </div>
                  <FieldError>{errors.votePrice}</FieldError>
                </div>
                <div className="field-group">
                  <label htmlFor="minimum-votes">Minimum votes</label>
                  <input
                    id="minimum-votes"
                    type="number"
                    min="1"
                    value={draft.minimumVotes}
                    onChange={(event) =>
                      update('minimumVotes', event.target.value)
                    }
                  />
                  <FieldError>{errors.minimumVotes}</FieldError>
                </div>
                <div className="field-group">
                  <label htmlFor="platform-fee">Platform fee (%)</label>
                  <input id="platform-fee" type="number" min="0" max="100" step="0.01" value={draft.platformFeePercent} onChange={(event) => update('platformFeePercent', event.target.value)} placeholder="Set for this event" />
                  <FieldError>{errors.platformFeePercent}</FieldError>
                </div>
                <div className="field-group">
                  <label htmlFor="maximum-votes">Maximum per transaction</label>
                  <input
                    id="maximum-votes"
                    type="number"
                    min="1"
                    value={draft.maximumVotes}
                    onChange={(event) =>
                      update('maximumVotes', event.target.value)
                    }
                  />
                  <FieldError>{errors.maximumVotes}</FieldError>
                </div>
              </div>
              <fieldset className="channel-options">
                <legend>Voting channels</legend>
                <label>
                  <span>
                    <strong>Web voting</strong>
                    <small>Accept votes from the Toabapa website.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.webVotingEnabled}
                    onChange={(event) =>
                      update('webVotingEnabled', event.target.checked)
                    }
                  />
                </label>
                <label>
                  <span>
                    <strong>USSD voting</strong>
                    <small>
                      Allow voters to use candidate codes through USSD.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.ussdVotingEnabled}
                    onChange={(event) =>
                      update('ussdVotingEnabled', event.target.checked)
                    }
                  />
                </label>
                <FieldError>{errors.channels}</FieldError>
              </fieldset>
              <div className="field-group">
                <label htmlFor="results">Results visibility</label>
                <select
                  id="results"
                  value={draft.resultsVisibility}
                  onChange={(event) =>
                    update('resultsVisibility', event.target.value)
                  }
                >
                  <option value="ADMIN_ONLY">Admins only</option>
                  <option value="EXACT_TOTALS">Show exact totals</option>
                  <option value="PERCENTAGES">Show percentages</option>
                  <option value="RANKING_ONLY">Show ranking only</option>
                  <option value="HIDDEN_UNTIL_END">
                    Hidden until event ends
                  </option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step review-step">
              <div className="step-intro">
                <span className="eyebrow">Final check</span>
                <h1>Review your event</h1>
                <p>
                  Confirm the setup before moving on to categories and
                  candidates.
                </p>
              </div>
              <div className="review-banner">
                {bannerUrl ? <img src={bannerUrl} alt="" /> : <Trophy />}
                <StatusPill text="Draft" />
              </div>
              <div className="review-title">
                <div>
                  <span>
                    {draft.currency} {Number(draft.votePrice || 0).toFixed(2)}{' '}
                    per vote
                  </span>
                  <h2>{draft.name || 'Untitled event'}</h2>
                  <p>{draft.description || 'No description added.'}</p>
                </div>
                <button
                  className="secondary-action"
                  onClick={() => setStep(0)}
                  type="button"
                >
                  Edit
                </button>
              </div>
              <div className="review-grid">
                <ReviewItem
                  icon={CalendarDays}
                  label="Schedule"
                  value={
                    eventWindow
                      ? `${eventWindow.start.toLocaleDateString()} – ${eventWindow.end.toLocaleDateString()}`
                      : 'Not scheduled'
                  }
                />
                <ReviewItem
                  icon={Gauge}
                  label="Vote limits"
                  value={`${draft.minimumVotes} – ${draft.maximumVotes} votes`}
                />
                <ReviewItem icon={ReceiptText} label="Platform fee" value={`${Number(draft.platformFeePercent || 0).toFixed(2)}%`} />
                <ReviewItem
                  icon={Settings2}
                  label="Channels"
                  value={
                    [
                      draft.webVotingEnabled && 'Web',
                      draft.ussdVotingEnabled && 'USSD',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'None'
                  }
                />
                <ReviewItem
                  icon={Trophy}
                  label="Results"
                  value={draft.resultsVisibility
                    .replaceAll('_', ' ')
                    .toLowerCase()}
                />
              </div>
            </div>
          )}
        </section>

        <footer className="wizard-footer">
          <button
            className="secondary-action"
            type="button"
            onClick={() =>
              step ? setStep((current) => current - 1) : navigate('/dashboard')
            }
          >
            <ChevronLeft />
            {step ? 'Back' : 'Cancel'}
          </button>
          {step < steps.length - 1 ? (
            <button className="primary-action" type="button" onClick={next}>
              Continue <ArrowRight />
            </button>
          ) : (
            <div className="publish-actions">
              {publishError && (
                <span className="field-error">{publishError}</span>
              )}
              <button
                className="primary-action"
                type="button"
                onClick={finish}
                disabled={publishing}
              >
                {publishing ? <LoaderCircle className="spin" /> : <Check />}
                {publishing ? 'Publishing...' : 'Publish event'}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function StatusPill({ text }) {
  return (
    <span className="draft-pill">
      <span />
      {text}
    </span>
  );
}

function ReviewItem({ icon: Icon, label, value }) {
  return (
    <div className="review-item">
      <span>
        <Icon />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
