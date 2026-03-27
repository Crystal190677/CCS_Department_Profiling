import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OFFICER', label: 'Officer' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'STUDENT', label: 'Student' },
];

const REMEMBER_KEY = 'ccs_one_dangal_remember';

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
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.role) {
      setError('Please select your role.');
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

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      if (remember30) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({
            role: form.role,
            identifier: form.identifier.trim(),
            exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
          }),
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      localStorage.setItem('ccs_token', data.data.token);
      localStorage.setItem('ccs_user', JSON.stringify(data.data.user));
      const role = data.data.user.role;
      if (role === 'ADMIN' || role === 'FACULTY') navigate('/admin-dashboard');
      else navigate('/dashboard');
    } catch {
      setError('Unable to connect. Please ensure the backend is running.');
      setLoading(false);
    }
  };

  const usesStudentNumber = form.role === 'STUDENT' || form.role === 'OFFICER';
  const idLabel = usesStudentNumber ? 'Student number' : 'Email';
  const idPlaceholder = usesStudentNumber ? 'e.g. 1' : 'you@ccs.edu';
  const idAutoComplete = usesStudentNumber ? 'username' : 'email';
  const idInputType = usesStudentNumber ? 'text' : 'email';

  return (
    <div className="od-login-page">
      <div className="od-login-card">
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
              />
            </div>

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
                  required
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
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="od-login-demo">
            Demo: admin@ccs.edu / faculty@ccs.edu — Student #1 / Officer #OFC001 — password123
          </p>
          {(form.role === 'STUDENT' || form.role === 'OFFICER') && (
            <p className="od-signup">
              First time? <Link to="/claim-account">Claim your account</Link> (student number on file)
            </p>
          )}
        </div>

        <div className="od-login-photo-side">
          <div className="od-photo-placeholder">
            <p className="od-photo-label">Your Photo Goes Here</p>
          </div>
          <div className="od-photo-frost">
            One Dangal · CCS Portal
          </div>
        </div>
      </div>
    </div>
  );
}
