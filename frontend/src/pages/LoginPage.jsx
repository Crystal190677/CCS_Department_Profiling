import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const ROLES = [
  { value: 'ADMIN', label: 'Admin', icon: '◆' },
  { value: 'FACULTY', label: 'Faculty', icon: '◇' },
  { value: 'OFFICER', label: 'Officer', icon: '▣' },
  { value: 'STUDENT', label: 'Student', icon: '○' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'STUDENT',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      navigate('/dashboard');
    } catch (err) {
      setError('Unable to connect. Please ensure the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-grid" aria-hidden="true" />
        <div className="login-glow login-glow-1" />
        <div className="login-glow login-glow-2" />
      </div>

      <main className="login-main">
        <div className="login-card">
          <header className="login-header">
            <div className="login-logo">
              <span className="login-logo-icon">CCS</span>
            </div>
            <h1 className="login-title">CCS Management System</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="role">User Type</label>
              <div className="login-role-group">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`login-role-btn ${form.role === r.value ? 'active' : ''}`}
                    onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                  >
                    <span className="login-role-icon">{r.icon}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@ccs.edu"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
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

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="login-demo">
            Demo: admin@ccs.edu / faculty@ccs.edu / officer@ccs.edu / student@ccs.edu
            <br />
            <span>Password: admin123</span>
          </p>
        </div>
      </main>
    </div>
  );
}
