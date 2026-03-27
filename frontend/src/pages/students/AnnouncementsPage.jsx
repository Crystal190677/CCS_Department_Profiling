import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import './AnnouncementsPage.css';

function getAuthHeadersJson() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function authHeaderOnly() {
  const token = localStorage.getItem('ccs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ACCEPT_IMAGES = 'image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png';

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tag: 'general' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [removeImageOnSave, setRemoveImageOnSave] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canPost = user && (user.role === 'ADMIN' || user.role === 'FACULTY');

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch('/api/announcements', { headers: getAuthHeadersJson() });
    const data = await res.json();
    if (data.success) setList(data.data || []);
    else setError(data.message || 'Could not load announcements');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    fetchAnnouncements().finally(() => setLoading(false));
  }, [user, fetchAnnouncements]);

  const resetComposer = () => {
    setForm({ title: '', content: '', tag: 'general' });
    setImageFile(null);
    setImagePreview(null);
    setEditing(null);
    setRemoveImageOnSave(false);
  };

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const ok =
      f.type === 'image/jpeg' ||
      f.type === 'image/png' ||
      (!f.type && (/\.jpe?g$/i.test(f.name) || /\.png$/i.test(f.name)));
    if (!ok) {
      setError('Please choose a JPEG or PNG image (.jpg, .jpeg, .png).');
      return;
    }
    setError('');
    setImageFile(f);
    setRemoveImageOnSave(false);
    setImagePreview(URL.createObjectURL(f));
  };

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('content', form.content.trim());
      fd.append('tag', form.tag || 'general');
      if (imageFile) fd.append('image', imageFile);
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: authHeaderOnly(),
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        resetComposer();
        fetchAnnouncements();
      } else setError(data.message || 'Could not post announcement');
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ann) => {
    setEditing(ann);
    setForm({ title: ann.title, content: ann.content, tag: ann.tag || 'general' });
    setImageFile(null);
    setImagePreview(null);
    setRemoveImageOnSave(false);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editing || !form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('content', form.content.trim());
      fd.append('tag', form.tag || 'general');
      if (removeImageOnSave) fd.append('remove_image', '1');
      if (imageFile) fd.append('image', imageFile);
      const res = await fetch(`/api/announcements/${editing.id}`, {
        method: 'POST',
        headers: authHeaderOnly(),
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        resetComposer();
        fetchAnnouncements();
      } else setError(data.message || 'Could not update announcement');
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/announcements/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeadersJson(),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        if (editing?.id === deleteTarget.id) resetComposer();
        fetchAnnouncements();
      } else setError(data.message || 'Delete failed');
    } catch {
      setError('Request failed');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="announcements-page">
      <header className="ccs-gradient-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner">
          <h1 className="ccs-gradient-hero-title">Announcements</h1>
          <p className="ccs-gradient-hero-subtitle">
            Official updates from CCS. {canPost ? 'You can post and attach JPEG or PNG images.' : ''}
          </p>
        </div>
      </header>

      {error && (
        <div className="ann-page-error" role="alert">
          {error}
        </div>
      )}

      {canPost && (
        <section className="ann-composer-card ccs-surface-gradient">
          <h2 className="ann-composer-title">{editing ? 'Edit announcement' : 'New announcement'}</h2>
          <form className="ann-composer-form" onSubmit={editing ? submitEdit : submitCreate}>
            <div className="ann-form-row">
              <label htmlFor="ann-title">Title</label>
              <input
                id="ann-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                disabled={saving}
              />
            </div>
            <div className="ann-form-row">
              <label htmlFor="ann-content">Message</label>
              <textarea
                id="ann-content"
                rows={4}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                required
                disabled={saving}
              />
            </div>
            <div className="ann-form-row">
              <label htmlFor="ann-tag">Tag</label>
              <select
                id="ann-tag"
                value={form.tag}
                onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                disabled={saving}
              >
                <option value="general">General</option>
                <option value="event">Event</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="ann-form-row">
              <label htmlFor="ann-image">Photo (optional)</label>
              <input
                id="ann-image"
                type="file"
                accept={ACCEPT_IMAGES}
                onChange={onPickImage}
                disabled={saving}
              />
              <p className="ann-form-hint">JPEG, JPG, or PNG only. Max 5 MB.</p>
              {(imagePreview || (editing?.image_url && !removeImageOnSave)) && (
                <div className="ann-image-preview-wrap">
                  <img
                    src={imagePreview || editing?.image_url}
                    alt=""
                    className="ann-image-preview"
                  />
                  {editing?.image_url && !imageFile && (
                    <button
                      type="button"
                      className="ann-remove-image-btn"
                      disabled={saving}
                      onClick={() => {
                        setRemoveImageOnSave(true);
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                    >
                      Remove image
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="ann-form-actions">
              {editing && (
                <button type="button" className="ann-btn-secondary" disabled={saving} onClick={resetComposer}>
                  Cancel edit
                </button>
              )}
              <button type="submit" className="ann-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Post'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="ann-list-section">
        <h2 className="ann-list-heading">All announcements</h2>
        {loading ? (
          <p className="ann-muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="ann-muted">No announcements yet.</p>
        ) : (
          <ul className="ann-list">
            {list.map((ann) => (
              <li key={ann.id} className="ann-card ccs-surface-gradient">
                <div className="ann-card-head">
                  <h3 className="ann-card-title">{ann.title}</h3>
                  <span className={`ann-tag ann-tag-${ann.tag || 'general'}`}>{ann.tag || 'general'}</span>
                </div>
                {ann.image_url && (
                  <div className="ann-card-image-wrap">
                    <img src={ann.image_url} alt="" className="ann-card-image" />
                  </div>
                )}
                <p className="ann-card-body">{ann.content}</p>
                <div className="ann-card-meta">
                  <span>By {ann.author?.name ?? 'Staff'}</span>
                  <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                {canPost && (
                  <div className="ann-card-actions">
                    <button type="button" className="ann-btn-text" onClick={() => startEdit(ann)}>
                      Edit
                    </button>
                    <button type="button" className="ann-btn-text ann-btn-danger" onClick={() => setDeleteTarget(ann)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        open={deleteTarget != null}
        title="Delete announcement"
        message="Remove this announcement and its attached image? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}
