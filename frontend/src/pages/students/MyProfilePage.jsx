import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PlaceholderPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    height_cm: '', weight_kg: '', course: '', year_level: '',
    sports_interests: '', activity_interests: '', skills: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/student-profile', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.data) {
      setProfile(data.data);
      setForm({
        height_cm: data.data.height_cm || '',
        weight_kg: data.data.weight_kg || '',
        course: data.data.course || '',
        year_level: data.data.year_level || '',
        sports_interests: Array.isArray(data.data.sports_interests) ? data.data.sports_interests.join(', ') : (data.data.sports_interests || ''),
        activity_interests: Array.isArray(data.data.activity_interests) ? data.data.activity_interests.join(', ') : (data.data.activity_interests || ''),
        skills: data.data.skills || '',
        notes: data.data.notes || '',
      });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');
    if (!token || !userData) navigate('/login');
    else {
      setUser(JSON.parse(userData));
      fetchProfile();
    }
  }, [navigate, fetchProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        sports_interests: form.sports_interests ? form.sports_interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
        activity_interests: form.activity_interests ? form.activity_interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      const res = await fetch('/api/student-profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setMessage('Profile saved. You may now appear in activity filters based on your interests.');
      } else setMessage(data.message || 'Failed to save');
    } catch (err) {
      setMessage('Request failed');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="placeholder-page">
      <h1>My Profile</h1>
      <p>Manage your profile. Add sports and activity interests to appear in Admin/Faculty enrollment filters.</p>
      <div className="profile-info">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Student #:</strong> {user.student_number || '—'}</p>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <h2>Profile Data</h2>
        <div className="profile-form-row">
          <label>Height (cm)</label>
          <input type="number" name="height_cm" value={form.height_cm} onChange={handleChange} placeholder="170" step="0.01" />
        </div>
        <div className="profile-form-row">
          <label>Weight (kg)</label>
          <input type="number" name="weight_kg" value={form.weight_kg} onChange={handleChange} placeholder="65" step="0.01" />
        </div>
        <div className="profile-form-row">
          <label>Course</label>
          <input type="text" name="course" value={form.course} onChange={handleChange} placeholder="BS Computer Science" />
        </div>
        <div className="profile-form-row">
          <label>Year Level</label>
          <input type="text" name="year_level" value={form.year_level} onChange={handleChange} placeholder="2" />
        </div>
        <div className="profile-form-row">
          <label>Sports interests (comma-separated)</label>
          <input type="text" name="sports_interests" value={form.sports_interests} onChange={handleChange} placeholder="basketball, volleyball" />
        </div>
        <div className="profile-form-row">
          <label>Activity interests (comma-separated)</label>
          <input type="text" name="activity_interests" value={form.activity_interests} onChange={handleChange} placeholder="hackathon, chess" />
        </div>
        <div className="profile-form-row">
          <label>Skills / Notes</label>
          <textarea name="skills" value={form.skills} onChange={handleChange} rows={2} />
        </div>
        {message && <p className="profile-message">{message}</p>}
        <button type="submit" disabled={saving} className="profile-save-btn">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
