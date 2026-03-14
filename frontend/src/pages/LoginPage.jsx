import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

const ROLES = [
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Full system access and control',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    value: 'FACULTY',
    label: 'Faculty',
    description: 'Manage students and announcements',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    value: 'OFFICER',
    label: 'Officer',
    description: 'Post merch and announcements',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    value: 'STUDENT',
    label: 'Student',
    description: 'View content and manage profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    role: '',
  });
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setForm((prev) => ({ ...prev, role }));
    setShowLoginForm(true);
    setError('');
  };

  const handleBack = () => {
    setShowLoginForm(false);
    setForm((prev) => ({ ...prev, identifier: '', password: '' }));
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('ccs_token', data.data.token);
      localStorage.setItem('ccs_user', JSON.stringify(data.data.user));
      const role = data.data.user.role;
      navigate(role === 'ADMIN' || role === 'FACULTY' ? '/admin-dashboard' : '/dashboard');
    } catch (err) {
      setError('Unable to connect. Please ensure the backend is running.');
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.value === form.role);

  return (
    <div className="login-page">
      <main className="login-main">
        {!showLoginForm ? (
          <>
            <div className="login-hero">
              <h1 className="login-hero-title">CCS Department System</h1>
              <p className="login-hero-subtitle">College of Computer Studies.</p>
              <p className="login-hero-subtitle2">Computer Science • Information Technology</p>
            </div>

            <div className="login-role-cards">
              {ROLES.map((r) => (
                <div key={r.value} className="login-role-card">
                  <div className="login-role-card-icon">{r.icon}</div>
                  <h3 className="login-role-card-title">{r.label}</h3>
                  <p className="login-role-card-desc">{r.description}</p>
                  <button
                    type="button"
                    className="login-role-card-btn"
                    onClick={() => handleRoleSelect(r.value)}
                  >
                    Login as {r.label}
                  </button>
                </div>
              ))}
            </div>

            <p className="login-role-footer">Select your role to access the system</p>
          </>
        ) : (
          <div className="login-form-card">
            <div className="login-form-header">
              <button type="button" className="login-form-back" onClick={handleBack} aria-label="Back">
                ←
              </button>
              <h2 className="login-form-title">Login as {selectedRole?.label}</h2>
              <p className="login-form-subtitle">Sign in to your account</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="identifier">
                  {form.role === 'STUDENT' ? 'Student number or email' : 'Email'}
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder={form.role === 'STUDENT' ? '2024-001 or you@ccs.edu' : 'you@ccs.edu'}
                  value={form.identifier}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="login-error" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="login-demo">
              Demo: admin@ccs.edu / faculty@ccs.edu / officer@ccs.edu / 2024-001 (student) — Password: admin123
            </p>
            {form.role === 'STUDENT' && (
              <p className="login-signup-link">
                Don&apos;t have an account? <Link to="/signup">Sign up</Link>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
