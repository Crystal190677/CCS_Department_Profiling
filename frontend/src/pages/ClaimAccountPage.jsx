import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignUpPage.css';

export default function ClaimAccountPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [studentNumber, setStudentNumber] = useState('');
  const [lookup, setLookup] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/claim/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_number: studentNumber.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Lookup failed');
        setLoading(false);
        return;
      }
      setLookup(data.data);
      setStep(2);
    } catch {
      setError('Unable to connect. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_number: studentNumber.trim(),
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Could not activate account');
        setLoading(false);
        return;
      }
      localStorage.setItem('ccs_token', data.data.token);
      localStorage.setItem('ccs_user', JSON.stringify(data.data.user));
      navigate('/dashboard');
    } catch {
      setError('Unable to connect. Please ensure the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <main className="signup-main">
        <div className="signup-card">
          <h1 className="signup-title">Claim your account</h1>
          <p className="signup-subtitle">
            Your student number must already be on file. Enter it to set your password and sign in.
          </p>

          {step === 1 && (
            <form className="signup-form" onSubmit={handleLookup}>
              <div className="signup-field">
                <label htmlFor="claim_student_number">Student number</label>
                <input
                  id="claim_student_number"
                  type="text"
                  placeholder="e.g. 2024-001"
                  value={studentNumber}
                  onChange={(e) => {
                    setStudentNumber(e.target.value);
                    setError('');
                  }}
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
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 2 && lookup && (
            <form className="signup-form" onSubmit={handleClaim}>
              <p className="signup-subtitle" style={{ marginBottom: '1rem' }}>
                <strong>{lookup.name}</strong>
                <br />
                <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>
                  {lookup.role === 'OFFICER' ? 'Officer account' : 'Student account'} — #{lookup.student_number}
                </span>
              </p>
              <div className="signup-field">
                <label htmlFor="claim_password">Password</label>
                <input
                  id="claim_password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                  minLength={8}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              <div className="signup-field">
                <label htmlFor="claim_password_confirmation">Confirm password</label>
                <input
                  id="claim_password_confirmation"
                  type="password"
                  placeholder="Re-enter password"
                  value={passwordConfirmation}
                  onChange={(e) => {
                    setPasswordConfirmation(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <div className="signup-error" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" className="signup-submit" disabled={loading}>
                {loading ? 'Activating…' : 'Activate account'}
              </button>
              <button
                type="button"
                className="signup-submit"
                style={{ marginTop: '0.5rem', background: 'transparent', border: '1px solid currentColor' }}
                disabled={loading}
                onClick={() => {
                  setStep(1);
                  setLookup(null);
                  setPassword('');
                  setPasswordConfirmation('');
                  setError('');
                }}
              >
                Back
              </button>
            </form>
          )}

          <p className="signup-login">
            Already activated? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
