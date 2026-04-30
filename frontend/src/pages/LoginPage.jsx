import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OFFICER', label: 'Officer' },
  { value: 'STUDENT', label: 'Student' },
];

const REMEMBER_KEY = 'ccs_one_dangal_remember';

const STUDENT_NUMBER_LEN = 7;

function normalizeSevenDigitStudentNumber(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, STUDENT_NUMBER_LEN);
}

function isSevenDigitStudentNumber(s) {
  return /^\d{7}$/.test(String(s || '').trim());
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    role: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [remember30, setRemember30] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsClaim, setNeedsClaim] = useState(false);
  const [claimPassword, setClaimPassword] = useState('');
  const [claimPasswordConfirm, setClaimPasswordConfirm] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.exp && parsed.exp > Date.now() && parsed.role && ROLE_OPTIONS.some((r) => r.value === parsed.role)) {
        setForm((prev) => ({
          ...prev,
          role: parsed.role,
          identifier: typeof parsed.identifier === 'string' ? parsed.identifier : '',
        }));
        setRemember30(true);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError('');
    if (name === 'role') {
      setForm((prev) => ({
        ...prev,
        role: value,
        identifier:
          value === 'STUDENT' || value === 'OFFICER' ? normalizeSevenDigitStudentNumber(prev.identifier) : prev.identifier,
      }));
      setNeedsClaim(false);
      setClaimPassword('');
      setClaimPasswordConfirm('');
      return;
    }
    if (name === 'identifier' && (form.role === 'STUDENT' || form.role === 'OFFICER')) {
      setForm((prev) => ({ ...prev, identifier: normalizeSevenDigitStudentNumber(value) }));
      setNeedsClaim(false);
      setClaimPassword('');
      setClaimPasswordConfirm('');
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'identifier') {
      setNeedsClaim(false);
      setClaimPassword('');
      setClaimPasswordConfirm('');
    }
  };

  const persistSessionAndRedirect = (token, userPayload) => {
    if (remember30) {
      localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          role: userPayload.role,
          identifier: form.identifier.trim(),
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
        }),
      );
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    localStorage.setItem('ccs_token', token);
    localStorage.setItem('ccs_user', JSON.stringify(userPayload));
    const r = userPayload.role;
    if (r === 'ADMIN' || r === 'OFFICER') navigate('/admin-dashboard');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.role) {
      setError('Please select your role.');
      return;
    }

    const usesStudentNumber = form.role === 'STUDENT' || form.role === 'OFFICER';

    if (usesStudentNumber && needsClaim) {
      const sn = form.identifier.trim();
      if (!sn) {
        setError('Enter your student number.');
        return;
      }
      if (claimPassword.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (claimPassword !== claimPasswordConfirm) {
        setError('Password and confirmation do not match.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_number: sn,
            password: claimPassword,
            password_confirmation: claimPasswordConfirm,
          }),
        });
        let data;
        try {
          data = await res.json();
        } catch {
          setError('Invalid response from server.');
          setLoading(false);
          return;
        }
        if (!data.success) {
          setError(data.message || 'Could not activate account.');
          setLoading(false);
          return;
        }
        persistSessionAndRedirect(data.data.token, data.data.user);
      } catch {
        setError('Unable to connect. Please ensure the backend is running.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (usesStudentNumber && !isSevenDigitStudentNumber(form.identifier.trim())) {
      setError(`Student number must be exactly ${STUDENT_NUMBER_LEN} digits (numbers only).`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: form.identifier.trim(),
          password: form.password,
          role: form.role,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setError('Invalid response from server.');
        setLoading(false);
        return;
      }

      if (!data.success) {
        if (data.code === 'INVALID_STUDENT_NUMBER') {
          setError(data.message || `Student number must be exactly ${STUDENT_NUMBER_LEN} digits.`);
          setLoading(false);
          return;
        }
        if (data.code === 'CLAIM_REQUIRED' && usesStudentNumber) {
          setNeedsClaim(true);
          setError(data.message || 'Set a password below to activate your account, then submit again.');
          setLoading(false);
          return;
        }
        if (res.status === 401 && usesStudentNumber && isSevenDigitStudentNumber(form.identifier.trim())) {
          try {
            const lookupRes = await fetch('/api/auth/claim/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ student_number: form.identifier.trim() }),
            });
            const lookupData = await lookupRes.json();
            if (lookupData.success && lookupData.data) {
              setNeedsClaim(true);
              if (lookupData.data.role && lookupData.data.role !== form.role) {
                setForm((prev) => ({ ...prev, role: lookupData.data.role }));
              }
              setError(
                'This account is not activated yet. Create and confirm a password below, then use Activate & sign in.',
              );
              setLoading(false);
              return;
            }
            if (lookupData.code === 'ALREADY_CLAIMED') {
              setError('Incorrect student number or password.');
              setLoading(false);
              return;
            }
            if (lookupRes.status === 404) {
              setError('No account found for this student number. Check your number or contact the department.');
              setLoading(false);
              return;
            }
          } catch {
            /* fall through */
          }
        }
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      persistSessionAndRedirect(data.data.token, data.data.user);
    } catch {
      setError('Unable to connect. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const usesStudentNumber = form.role === 'STUDENT' || form.role === 'OFFICER';
  const idLabel = usesStudentNumber ? 'Student number' : 'Email';
  const idPlaceholder = usesStudentNumber ? 'e.g. 2203428' : 'you@ccs.edu';
  const idAutoComplete = usesStudentNumber ? 'username' : 'email';
  const idInputType = usesStudentNumber ? 'text' : 'email';

  return (
    <div className="od-login-page">
      <div className="od-login-card">
        <div className="od-login-photo-side">
          <div className="od-login-hero-glow" aria-hidden />
          <div className="od-login-hero-grid" aria-hidden />
          <div className="od-login-hero-content">
            <div className="od-login-hero-logo-ring">
              <img
                src={`${import.meta.env.BASE_URL}ccs-logo.png`}
                alt="College of Computing Studies — Pamantasan ng Cabuyao official seal"
                className="od-login-hero-logo"
                width={200}
                height={200}
                decoding="async"
              />
            </div>
            <div className="od-login-hero-text">
              <p className="od-login-hero-line od-login-hero-line--accent">College of Computing Studies</p>
              <p className="od-login-hero-line od-login-hero-line--school">Pamantasan ng Cabuyao</p>
            </div>
          </div>
          <div className="od-photo-frost">
            <span className="od-photo-frost-brand">One Dangal</span>
            <span className="od-photo-frost-sep" aria-hidden>
              ·
            </span>
            <span className="od-photo-frost-sub">CCS Portal</span>
          </div>
        </div>

        <div className="od-login-form-side">
          <header className="od-login-brand">
            <h1 className="od-login-logo">One Dangal</h1>
            <p className="od-login-tagline">CCS Department</p>
          </header>

          <div className="od-login-rule" aria-hidden />

          <div className="od-login-welcome">
            <h2 className="od-login-welcome-title">Welcome back</h2>
            <p className="od-login-welcome-sub">Sign in to your CCS account to continue.</p>
          </div>

          <form className="od-login-form" onSubmit={handleSubmit} noValidate>
            <div className="od-field">
              <label className="od-label" htmlFor="od-role">Role</label>
              <select
                id="od-role"
                name="role"
                className="od-input od-input-pill od-select"
                value={form.role}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="" disabled>
                  Select role
                </option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="od-field">
              <label className="od-label" htmlFor="od-identifier">{idLabel}</label>
              <input
                id="od-identifier"
                name="identifier"
                type={idInputType}
                className="od-input od-input-pill"
                placeholder={idPlaceholder}
                value={form.identifier}
                onChange={handleChange}
                required
                autoComplete={idAutoComplete}
                disabled={loading}
                maxLength={usesStudentNumber ? STUDENT_NUMBER_LEN : undefined}
                inputMode={usesStudentNumber ? 'numeric' : undefined}
                pattern={usesStudentNumber ? '\\d{7}' : undefined}
              />
              {usesStudentNumber && (
                <p className="od-field-hint">Use your 7-digit student number (e.g. 2203428).</p>
              )}
            </div>

            {usesStudentNumber && needsClaim ? (
              <>
                <div className="od-field">
                  <label className="od-label" htmlFor="od-claim-pw">Create password</label>
                  <div className="od-password-row">
                    <input
                      id="od-claim-pw"
                      name="claimPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="od-input od-input-pill od-password-input"
                      placeholder="At least 8 characters"
                      value={claimPassword}
                      onChange={(e) => {
                        setClaimPassword(e.target.value);
                        setError('');
                      }}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="od-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={loading}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="od-field">
                  <label className="od-label" htmlFor="od-claim-pw2">Confirm password</label>
                  <input
                    id="od-claim-pw2"
                    name="claimPasswordConfirm"
                    type={showPassword ? 'text' : 'password'}
                    className="od-input od-input-pill"
                    placeholder="Re-enter password"
                    value={claimPasswordConfirm}
                    onChange={(e) => {
                      setClaimPasswordConfirm(e.target.value);
                      setError('');
                    }}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </>
            ) : (
              <div className="od-field">
                <label className="od-label" htmlFor="od-password">Password</label>
                <div className="od-password-row">
                  <input
                    id="od-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="od-input od-input-pill od-password-input"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    required={!needsClaim}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="od-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <div className="od-login-row">
              <label className="od-check-label">
                <input
                  type="checkbox"
                  className="od-check"
                  checked={remember30}
                  onChange={(e) => setRemember30(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember for 30 days</span>
              </label>
              <a
                href="#"
                className="od-forgot"
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="od-login-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="od-login-submit" disabled={loading}>
              {loading
                ? usesStudentNumber && needsClaim
                  ? 'Activating…'
                  : 'Signing in…'
                : usesStudentNumber && needsClaim
                  ? 'Activate & sign in'
                  : 'Login'}
            </button>
          </form>

          <p className="od-login-demo">
            Demo: admin@ccs.edu / Student #2299999 / Officer #2299998 — password123. Roster (7-digit numbers, e.g. BSIT 4-A #2203428, #2203416): first visit sets password on this page or via{' '}
            <Link to="/claim-account">claim account</Link>.
          </p>
          {(form.role === 'STUDENT' || form.role === 'OFFICER') && !needsClaim && (
            <p className="od-signup">
              Prefer a dedicated page? <Link to="/claim-account">Claim your account</Link> (student number on file)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
