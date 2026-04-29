import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import './ProfileSettingsPage.css';

function getAuthHeadersJson() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function authHeaderMultipart() {
  const token = localStorage.getItem('ccs_token');
  return {
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function mergeStoredUser(partial) {
  try {
    const raw = localStorage.getItem('ccs_user');
    if (!raw) return;
    const u = JSON.parse(raw);
    localStorage.setItem('ccs_user', JSON.stringify({ ...u, ...partial }));
  } catch {
    /* ignore */
  }
}

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [role, setRole] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', variant: 'success' });
  const [studentProfileForm, setStudentProfileForm] = useState({
    address: '',
    sports_interests: '',
    activity_interests: '',
    skills: '',
    notes: '',
  });
  const [savingStudentProfile, setSavingStudentProfile] = useState(false);

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant });
  };

  const dismissToast = () => setToast((t) => ({ ...t, message: '' }));

  const isAdmin = role === 'ADMIN';

  const loadProfile = useCallback(async () => {
    setError('');
    const res = await fetch('/api/profile', { headers: getAuthHeadersJson() });
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Could not load profile');
      setLoading(false);
      return;
    }
    const p = data.data;
    setName(p.name || '');
    setEmail(p.email || '');
    setContactNumber(p.contact_number || '');
    setAvatarUrl(p.avatar_url || null);
    setCompletion(typeof p.profile_completion_percent === 'number' ? p.profile_completion_percent : 0);
    setRole(p.role || '');
    setStudentNumber(p.student_number || '');
    setAdminIdentifier(p.employee_id || p.admin_id || p.admin_identifier || p.staff_id || p.user_id || p.id || '');
    setLoading(false);
  }, []);

  const loadStudentProfile = useCallback(async () => {
    const res = await fetch('/api/student-profile', { headers: getAuthHeadersJson() });
    const data = await res.json();
    if (!data.success || !data.data) {
      setStudentProfileForm({
        address: '',
        sports_interests: '',
        activity_interests: '',
        skills: '',
        notes: '',
      });
      return;
    }
    const p = data.data;
    setStudentProfileForm({
      address: p.address || '',
      sports_interests: Array.isArray(p.sports_interests) ? p.sports_interests.join(', ') : (p.sports_interests || ''),
      activity_interests: Array.isArray(p.activity_interests) ? p.activity_interests.join(', ') : (p.activity_interests || ''),
      skills: p.skills || '',
      notes: p.notes || '',
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [navigate, loadProfile]);

  useEffect(() => {
    if (role !== 'STUDENT' && role !== 'OFFICER') return;
    loadStudentProfile();
  }, [role, loadStudentProfile]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const localCompletion = () => {
    let n = 0;
    const total = 4;
    if (avatarUrl || avatarPreview) n += 1;
    if (name.trim()) n += 1;
    if (email.trim()) n += 1;
    if (contactNumber.trim()) n += 1;
    return Math.round((n / total) * 100);
  };

  const displayCompletion = Math.max(completion, localCompletion());

  const onAvatarPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const ok =
      f.type === 'image/jpeg' ||
      f.type === 'image/png' ||
      (!f.type && (/\.jpe?g$/i.test(f.name) || /\.png$/i.test(f.name)));
    if (!ok) {
      setError('Please choose a JPEG or PNG image.');
      return;
    }
    setError('');
    setAvatarFile(f);
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      showToast('Choose a photo first.', 'error');
      return;
    }
    setUploadingAvatar(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      const res = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        headers: authHeaderMultipart(),
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        const p = data.data;
        setAvatarUrl(p.avatar_url || null);
        setCompletion(p.profile_completion_percent ?? 0);
        setAvatarFile(null);
        if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
        mergeStoredUser({ avatar_url: p.avatar_url });
        showToast(data.message || 'Photo updated');
      } else {
        showToast(data.message || 'Upload failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const rosterIdentityLocked = role === 'STUDENT' || role === 'OFFICER';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = rosterIdentityLocked
        ? { contact_number: contactNumber.trim() || null }
        : {
            name: name.trim(),
            email: email.trim(),
            contact_number: contactNumber.trim() || null,
          };
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: getAuthHeadersJson(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        const p = data.data;
        setCompletion(p.profile_completion_percent ?? 0);
        mergeStoredUser({
          name: p.name,
          email: p.email,
          contact_number: p.contact_number,
          avatar_url: p.avatar_url,
        });
        showToast(data.message || 'Profile saved');
      } else {
        showToast(data.message || 'Could not save', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdNew !== pwdConfirm) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    setChangingPassword(true);
    setError('');
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: getAuthHeadersJson(),
        body: JSON.stringify({
          current_password: pwdCurrent,
          password: pwdNew,
          password_confirmation: pwdConfirm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
        showToast(data.message || 'Password updated');
      } else {
        showToast(data.message || 'Could not change password', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveStudentProfile = async (e) => {
    e.preventDefault();
    if (role !== 'STUDENT' && role !== 'OFFICER') return;
    setSavingStudentProfile(true);
    setError('');
    try {
      const body = {
        address: studentProfileForm.address.trim() || null,
        sports_interests: studentProfileForm.sports_interests
          ? studentProfileForm.sports_interests.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        activity_interests: studentProfileForm.activity_interests
          ? studentProfileForm.activity_interests.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        skills: studentProfileForm.skills.trim() || null,
        notes: studentProfileForm.notes.trim() || null,
      };
      const res = await fetch('/api/student-profile', {
        method: 'POST',
        headers: getAuthHeadersJson(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Personal details updated');
      } else {
        showToast(data.message || 'Could not save personal details', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSavingStudentProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="ps-page">
        <p className="ps-muted">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="ps-page">
      <Toast message={toast.message} variant={toast.variant} onDismiss={dismissToast} />

      <header className="ccs-gradient-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner">
          <h1 className="ccs-gradient-hero-title">{isAdmin ? 'My Profile' : 'Profile settings'}</h1>
          <p className="ccs-gradient-hero-subtitle">
            {isAdmin ? 'System Administrator profile details' : `Manage how you appear in CCS One Dangal · ${role}`}
          </p>
        </div>
      </header>

      {error && (
        <div className="ps-banner-error" role="alert">
          {error}
        </div>
      )}

      <section className="ps-completion-card ccs-surface-gradient">
        <div className="ps-completion-head">
          <span className="ps-completion-label">Profile completion</span>
          <span className="ps-completion-value">{displayCompletion}%</span>
        </div>
        <div className="ps-progress-track" role="progressbar" aria-valuenow={displayCompletion} aria-valuemin={0} aria-valuemax={100}>
          <div className="ps-progress-fill" style={{ width: `${displayCompletion}%` }} />
        </div>
        <p className="ps-completion-hint">
          {rosterIdentityLocked
            ? 'Add a photo and contact number to complete your profile. Name and email come from the official roster.'
            : 'Add a photo, name, email, and contact number to reach 100%.'}
        </p>
      </section>

      {isAdmin && (
        <section className="ps-admin-summary-grid">
          <article className="ps-card ccs-surface-gradient">
            <h2 className="ps-card-title">Personal Information</h2>
            <div className="ps-admin-info-list">
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">Full Name</span>
                <span className="ps-admin-info-value">{name || '—'}</span>
              </div>
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">Email Address</span>
                <span className="ps-admin-info-value">{email || '—'}</span>
              </div>
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">Phone Number</span>
                <span className="ps-admin-info-value">{contactNumber || '—'}</span>
              </div>
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">Profile Picture</span>
                <span className="ps-admin-info-value">{avatarUrl || avatarPreview ? 'Uploaded' : 'Not uploaded'}</span>
              </div>
            </div>
          </article>
          <article className="ps-card ccs-surface-gradient">
            <h2 className="ps-card-title">School/Admin Information</h2>
            <div className="ps-admin-info-list">
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">School Name</span>
                <span className="ps-admin-info-value">Pamantasan ng Cabuyao</span>
              </div>
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">Department</span>
                <span className="ps-admin-info-value">College of Computing Studies</span>
              </div>
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">Position/Role</span>
                <span className="ps-admin-info-value">{role || 'System Admin'}</span>
              </div>
              <div className="ps-admin-info-row">
                <span className="ps-admin-info-label">Employee/Admin ID</span>
                <span className="ps-admin-info-value">{adminIdentifier ? String(adminIdentifier) : '—'}</span>
              </div>
            </div>
          </article>
        </section>
      )}

      <div className="ps-grid">
        <section className="ps-card ps-card-accent ccs-surface-gradient">
          <h2 className="ps-card-title">Profile photo</h2>
          <p className="ps-card-desc">JPEG or PNG, up to 2 MB. Stored securely on the server.</p>
          <div className="ps-avatar-block">
            <div className="ps-avatar-ring">
              {(avatarPreview || avatarUrl) ? (
                <img src={avatarPreview || avatarUrl} alt="" className="ps-avatar-img" />
              ) : (
                <div className="ps-avatar-placeholder">{name ? name.slice(0, 2).toUpperCase() : '?'}</div>
              )}
            </div>
            <div className="ps-avatar-actions">
              <label className="ps-btn-secondary ps-file-label">
                Choose image
                <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={onAvatarPick} className="ps-file-input" />
              </label>
              <button type="button" className="ps-btn-primary" onClick={handleUploadAvatar} disabled={uploadingAvatar || !avatarFile}>
                {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
              </button>
            </div>
          </div>
        </section>

        <section className="ps-card ccs-surface-gradient">
          <h2 className="ps-card-title">Account details</h2>
          {rosterIdentityLocked && (
            <p className="ps-card-desc">
              Your legal name, email, and student number are set by the department. You can update your contact number below.
            </p>
          )}
          <form onSubmit={handleSaveProfile} className="ps-form">
            {rosterIdentityLocked && studentNumber && (
              <div className="ps-field">
                <label htmlFor="ps-student-no">Student number</label>
                <input id="ps-student-no" value={studentNumber} readOnly className="ps-input-readonly" tabIndex={-1} />
              </div>
            )}
            <div className="ps-field">
              <label htmlFor="ps-name">Display name</label>
              <input
                id="ps-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!rosterIdentityLocked}
                readOnly={rosterIdentityLocked}
                className={rosterIdentityLocked ? 'ps-input-readonly' : undefined}
                autoComplete="name"
              />
            </div>
            <div className="ps-field">
              <label htmlFor="ps-email">Email</label>
              <input
                id="ps-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!rosterIdentityLocked}
                readOnly={rosterIdentityLocked}
                className={rosterIdentityLocked ? 'ps-input-readonly' : undefined}
                autoComplete="email"
              />
            </div>
            <div className="ps-field">
              <label htmlFor="ps-phone">Contact number</label>
              <input
                id="ps-phone"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g. +63 9xx xxx xxxx"
                autoComplete="tel"
              />
            </div>
            <button type="submit" className="ps-btn-primary ps-btn-wide" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        {(role === 'STUDENT' || role === 'OFFICER') && (
          <section className="ps-card ccs-surface-gradient">
            <h2 className="ps-card-title">Personal details</h2>
            <p className="ps-card-desc">
              Update profile details used by your My Profile page (address, hobbies, talents/skills, achievements notes).
            </p>
            <form onSubmit={handleSaveStudentProfile} className="ps-form">
              <div className="ps-field">
                <label htmlFor="ps-address">Address</label>
                <input
                  id="ps-address"
                  value={studentProfileForm.address}
                  onChange={(e) => setStudentProfileForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street, city, province"
                />
              </div>
              <div className="ps-field">
                <label htmlFor="ps-hobbies">Hobbies (comma-separated)</label>
                <input
                  id="ps-hobbies"
                  value={studentProfileForm.activity_interests}
                  onChange={(e) => setStudentProfileForm((f) => ({ ...f, activity_interests: e.target.value }))}
                  placeholder="Coding, gaming, chess"
                />
              </div>
              <div className="ps-field">
                <label htmlFor="ps-sports">Sports interests (comma-separated)</label>
                <input
                  id="ps-sports"
                  value={studentProfileForm.sports_interests}
                  onChange={(e) => setStudentProfileForm((f) => ({ ...f, sports_interests: e.target.value }))}
                  placeholder="Basketball, volleyball"
                />
              </div>
              <div className="ps-field">
                <label htmlFor="ps-talents">Talents / skills</label>
                <textarea
                  id="ps-talents"
                  rows={3}
                  value={studentProfileForm.skills}
                  onChange={(e) => setStudentProfileForm((f) => ({ ...f, skills: e.target.value }))}
                  placeholder="Programming, UI design, public speaking"
                />
              </div>
              <div className="ps-field">
                <label htmlFor="ps-achievements">Achievements notes</label>
                <textarea
                  id="ps-achievements"
                  rows={3}
                  value={studentProfileForm.notes}
                  onChange={(e) => setStudentProfileForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Recent awards and achievements"
                />
              </div>
              <button type="submit" className="ps-btn-primary ps-btn-wide" disabled={savingStudentProfile}>
                {savingStudentProfile ? 'Saving…' : 'Save personal details'}
              </button>
            </form>
          </section>
        )}

        <section className="ps-card ps-card-wide ccs-surface-gradient">
          <h2 className="ps-card-title">Change password</h2>
          <p className="ps-card-desc">Use a strong password you don&apos;t use elsewhere.</p>
          <form onSubmit={handleChangePassword} className="ps-form ps-form-password">
            <div className="ps-field">
              <label htmlFor="ps-cur-pwd">Current password</label>
              <input
                id="ps-cur-pwd"
                type="password"
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="ps-field-row">
              <div className="ps-field">
                <label htmlFor="ps-new-pwd">New password</label>
                <input
                  id="ps-new-pwd"
                  type="password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="ps-field">
                <label htmlFor="ps-conf-pwd">Confirm new password</label>
                <input
                  id="ps-conf-pwd"
                  type="password"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <button type="submit" className="ps-btn-outline" disabled={changingPassword}>
              {changingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
