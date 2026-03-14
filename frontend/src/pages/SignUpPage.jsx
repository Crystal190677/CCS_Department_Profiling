import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignUpPage.css';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    student_number: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
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

    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Registration failed');
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
    <div className="signup-page">
      <main className="signup-main">
        <div className="signup-card">
          <h1 className="signup-title">Student Sign Up</h1>
          <p className="signup-subtitle">Create your account using your student number</p>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-field">
              <label htmlFor="student_number">Student Number</label>
              <input
                id="student_number"
                name="student_number"
                type="text"
                placeholder="e.g. 2024-001"
                value={form.student_number}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="signup-field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="signup-field">
              <label htmlFor="email">Email (optional)</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@ccs.edu"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="signup-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="signup-field">
              <label htmlFor="password_confirmation">Confirm Password</label>
              <input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                placeholder="Re-enter password"
                value={form.password_confirmation}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="signup-error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="signup-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="signup-login">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
