import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuditLogPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function actionLabel(action) {
  const a = String(action || '').toLowerCase();
  if (a === 'created') return 'Created';
  if (a === 'updated') return 'Updated';
  if (a === 'deleted') return 'Deleted';
  return action || '—';
}

function rowClassForAction(action) {
  const a = String(action || '').toLowerCase();
  if (a === 'created') return 'audit-row audit-row--created';
  if (a === 'updated') return 'audit-row audit-row--updated';
  if (a === 'deleted') return 'audit-row audit-row--deleted';
  return 'audit-row';
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (actionFilter) params.set('action', actionFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const res = await fetch(`/api/admin/audit-log?${params}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));

    if (res.status === 403) {
      setError('You do not have permission to view the audit log.');
      setRows([]);
      setMeta(null);
      setLoading(false);
      return;
    }

    if (!data.success) {
      setError(data.message || 'Could not load audit log.');
      setRows([]);
      setMeta(null);
      setLoading(false);
      return;
    }

    setRows(Array.isArray(data.data) ? data.data : []);
    setMeta(data.meta || null);
    setLoading(false);
  }, [page, actionFilter, dateFrom, dateTo]);

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
      return;
    }
    load();
  }, [navigate, load]);

  const onFilterActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const onDateFromChange = (e) => {
    setDateFrom(e.target.value);
    setPage(1);
  };

  const onDateToChange = (e) => {
    setDateTo(e.target.value);
    setPage(1);
  };

  const lastPage = meta?.last_page ?? 1;
  const currentPage = meta?.current_page ?? page;
  const total = meta?.total ?? 0;

  return (
    <div className="audit-log-page">
      <div className="audit-log-header">
        <div>
          <h1 className="audit-log-title">Audit log</h1>
          <p className="audit-log-sub">Administrative actions across the system.</p>
        </div>
      </div>

      {error ? <div className="audit-log-error" role="alert">{error}</div> : null}

      <div className="audit-log-filters">
        <label className="audit-log-field">
          <span className="audit-log-label">Action</span>
          <select
            className="audit-log-select"
            value={actionFilter}
            onChange={onFilterActionChange}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </select>
        </label>
        <label className="audit-log-field">
          <span className="audit-log-label">From</span>
          <input
            type="date"
            className="audit-log-date"
            value={dateFrom}
            onChange={onDateFromChange}
            aria-label="Date from"
          />
        </label>
        <label className="audit-log-field">
          <span className="audit-log-label">To</span>
          <input
            type="date"
            className="audit-log-date"
            value={dateTo}
            onChange={onDateToChange}
            aria-label="Date to"
          />
        </label>
      </div>

      <div className="audit-log-table-wrap">
        {loading ? (
          <p className="audit-log-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="audit-log-muted">No entries match your filters.</p>
        ) : (
          <table className="audit-log-table">
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Performed by</th>
                <th scope="col">Date &amp; time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={rowClassForAction(row.action)}>
                  <td className="audit-log-cell-action">{actionLabel(row.action)}</td>
                  <td>{row.target || '—'}</td>
                  <td>{row.performed_by || '—'}</td>
                  <td className="audit-log-cell-time">{formatDateTime(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && meta && lastPage > 1 ? (
        <div className="audit-log-pagination">
          <button
            type="button"
            className="audit-log-page-btn"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="audit-log-page-info">
            Page {currentPage} of {lastPage}
            <span className="audit-log-total"> · {total} total</span>
          </span>
          <button
            type="button"
            className="audit-log-page-btn"
            disabled={currentPage >= lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
