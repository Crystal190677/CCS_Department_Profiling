import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ManageMerchPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

const PAYMENT_LABELS = { pending: 'Pending', paid_online: 'Paid Online', paid_cash: 'Paid (Cash)' };

export default function ManageMerchPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('items'); // items | orders
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', is_available: true });
  const [saving, setSaving] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(null);

  const loadUser = useCallback(() => {
    const userData = localStorage.getItem('ccs_user');
    if (!userData) return null;
    return JSON.parse(userData);
  }, []);

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/merchandise', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setItems(data.data || []);
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/merchandise-orders?per_page=50', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setOrders(data.data?.data || []);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const u = loadUser();
    if (!token || !u) {
      navigate('/login');
      return;
    }
    if (u.role !== 'OFFICER' && u.role !== 'ADMIN' && u.role !== 'FACULTY') {
      navigate('/dashboard');
      return;
    }
    setUser(u);
  }, [navigate, loadUser]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchItems(), fetchOrders()]).finally(() => setLoading(false));
  }, [user, fetchItems, fetchOrders]);

  const handleCreateItem = () => {
    setEditingItem(null);
    setShowAddForm(true);
    setForm({ name: '', description: '', price: '', is_available: true });
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowAddForm(false);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      is_available: item.is_available,
    });
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price || Number(form.price) < 0) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        is_available: !!form.is_available,
      };
      const url = editingItem
        ? `/api/merchandise/${editingItem.id}`
        : '/api/merchandise';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchItems();
        setEditingItem(null);
        setShowAddForm(false);
        setForm({ name: '', description: '', price: '', is_available: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await fetch(`/api/merchandise/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchItems();
  };

  const handlePaymentStatusChange = async (orderId, status) => {
    setUpdatingPayment(orderId);
    try {
      const res = await fetch(`/api/merchandise-orders/${orderId}/payment-status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ payment_status: status }),
      });
      const data = await res.json();
      if (data.success) fetchOrders();
    } finally {
      setUpdatingPayment(null);
    }
  };

  if (!user) return null;

  return (
    <div className="manage-merch-page">
      <h1>Manage Merchandise</h1>
      <p className="manage-merch-desc">Post and manage department merchandise. Accept GCash or cash and set payment status to &quot;Paid Online&quot; or &quot;Paid (Cash)&quot;.</p>

      <div className="manage-merch-tabs">
        <button
          type="button"
          className={tab === 'items' ? 'active' : ''}
          onClick={() => setTab('items')}
        >
          Items
        </button>
        <button
          type="button"
          className={tab === 'orders' ? 'active' : ''}
          onClick={() => setTab('orders')}
        >
          Orders
        </button>
      </div>

      {loading ? (
        <p className="manage-merch-loading">Loading…</p>
      ) : tab === 'items' ? (
        <>
          <div className="manage-merch-toolbar">
            <button type="button" className="manage-merch-btn primary" onClick={handleCreateItem}>
              Add item
            </button>
          </div>
          {(editingItem || showAddForm) && (
            <form className="manage-merch-form" onSubmit={handleSaveItem}>
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
              <label className="manage-merch-check">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
                />
                Available
              </label>
              <button type="submit" className="manage-merch-btn primary" disabled={saving}>
                {editingItem ? 'Update' : 'Create'}
              </button>
              {(editingItem || showAddForm) && (
                <button type="button" className="manage-merch-btn" onClick={() => { setEditingItem(null); setShowAddForm(false); setForm({ name: '', description: '', price: '', is_available: true }); }}>
                  Cancel
                </button>
              )}
            </form>
          )}
          <ul className="manage-merch-list">
            {items.map((item) => (
              <li key={item.id} className="manage-merch-li">
                <div>
                  <strong>{item.name}</strong> — ₱{Number(item.price).toFixed(2)}
                  {!item.is_available && <span className="manage-merch-badge">Unavailable</span>}
                </div>
                <div className="manage-merch-actions">
                  <button type="button" className="manage-merch-btn small" onClick={() => handleEditItem(item)}>Edit</button>
                  <button type="button" className="manage-merch-btn small danger" onClick={() => handleDeleteItem(item.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="manage-merch-orders">
          {orders.length === 0 ? (
            <p className="manage-merch-empty">No orders yet.</p>
          ) : (
            <table className="manage-merch-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.user?.name} {o.user?.student_number && `(${o.user.student_number})`}</td>
                    <td>{o.merchandise?.name}</td>
                    <td>{o.quantity}</td>
                    <td>₱{Number(o.amount).toFixed(2)}</td>
                    <td>
                      <select
                        value={o.payment_status}
                        onChange={(e) => handlePaymentStatusChange(o.id, e.target.value)}
                        disabled={updatingPayment === o.id}
                        className="manage-merch-select"
                      >
                        <option value="pending">{PAYMENT_LABELS.pending}</option>
                        <option value="paid_online">{PAYMENT_LABELS.paid_online}</option>
                        <option value="paid_cash">{PAYMENT_LABELS.paid_cash}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
