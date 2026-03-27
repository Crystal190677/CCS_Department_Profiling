import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminAccountPages.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export default function AdminCreateFacultyPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    is_sports_faculty: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const raw = localStorage.getItem('ccs_user');
    if (!token || !raw) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(raw);
    if (u.role !== 'ADMIN') {
      navigate('/admin-dashboard');
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/faculty-accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          is_sports_faculty: form.is_sports_faculty,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Faculty account created. Share the password securely with the new faculty member.');
        setForm({ name: '', email: '', password: '', is_sports_faculty: false });
      } else {
        setError(data.message || 'Could not create faculty');
      }
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-account-page">
      <h1>Create faculty</h1>
      <p className="admin-account-lead">
        Faculty cannot self-register. Set a password here and share it with the new faculty member through a secure channel.
      </p>

      {error ? <div className="admin-account-error" role="alert">{error}</div> : null}
      {success ? <div className="admin-account-success" role="status">{success}</div> : null}

      <div className="admin-account-card">
        <form className="admin-account-form" onSubmit={submit}>
          <div className="admin-account-row">
            <label htmlFor="acf-name">Full name</label>
            <input
              id="acf-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="admin-account-row">
            <label htmlFor="acf-email">Email (login)</label>
            <input
              id="acf-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="admin-account-row">
            <label htmlFor="acf-pw">Password</label>
            <input
              id="acf-pw"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div className="admin-account-row admin-account-row-check">
            <label htmlFor="acf-sports">
              <input
                id="acf-sports"
                type="checkbox"
                checked={form.is_sports_faculty}
                onChange={(e) => setForm((f) => ({ ...f, is_sports_faculty: e.target.checked }))}
              />
              <span>Sports faculty (can view full physical profile fields)</span>
            </label>
          </div>
          <div className="admin-account-actions">
            <button type="button" className="admin-account-btn-ghost" onClick={() => navigate('/admin-dashboard')}>
              Back to dashboard
            </button>
            <button type="submit" className="admin-account-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create faculty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
