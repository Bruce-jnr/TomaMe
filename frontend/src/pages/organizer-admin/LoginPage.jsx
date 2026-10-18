import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { api } from './adminApi.js';
export function LoginPage({ onLogin, portal = 'administrator' }) {
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
          <img src={logo} alt="Toabapa" />
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
          <img src={logo} alt="Toabapa" />
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
        <img src={logo} alt="Toabapa" />
      </Link>
      <form onSubmit={submit}>
        <span className="eyebrow">
          {portal === 'superadmin'
            ? 'Superadmin console'
            : 'Event administrator workspace'}
        </span>
        <h1>
          {portal === 'superadmin'
            ? 'Sign in to manage Toabapa.'
            : 'Sign in to manage your events.'}
        </h1>
        <p>{portal === 'superadmin' ? '' : ''}</p>
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
