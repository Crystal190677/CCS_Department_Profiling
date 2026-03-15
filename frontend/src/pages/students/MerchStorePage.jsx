import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MerchStorePage.css';

function getAuthHeaders(json = true) {
  const token = localStorage.getItem('ccs_token');
  return {
    ...(json && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export default function MerchStorePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

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
    fetch('/api/merchandise?available_only=1', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setItems(data.data || []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleOrder = async (item, quantity, proofFile) => {
    if (!quantity || quantity < 1) {
      setMessage({ type: 'error', text: 'Enter quantity' });
      return;
    }
    setOrdering(item.id);
    setMessage({ type: '', text: '' });
    try {
      const form = new FormData();
      form.append('merchandise_id', item.id);
      form.append('quantity', quantity);
      if (proofFile) form.append('proof_image', proofFile);
      const token = localStorage.getItem('ccs_token');
      const res = await fetch('/api/merchandise-orders', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Order placed. An officer will confirm your payment status.' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Order failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Request failed' });
    } finally {
      setOrdering(null);
    }
  };

  if (!user) return null;

  return (
    <div className="merch-store-page">
      <h1>Merch Store</h1>
      <p className="merch-store-desc">Browse CCS department merchandise. Place an order and submit proof of payment (GCash or cash) for officers to confirm.</p>

      {message.text && (
        <div className={`merch-store-msg ${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="merch-store-loading">Loading…</p>
      ) : items.length === 0 ? (
        <p className="merch-store-empty">No merchandise available at the moment.</p>
      ) : (
        <div className="merch-store-grid">
          {items.map((item) => (
            <MerchCard
              key={item.id}
              item={item}
              onOrder={handleOrder}
              ordering={ordering === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MerchCard({ item, onOrder, ordering }) {
  const [qty, setQty] = useState(1);
  const [proofFile, setProofFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onOrder(item, qty, proofFile || undefined);
  };

  return (
    <article className="merch-card">
      {item.image_url && (
        <div className="merch-card-img-wrap">
          <img src={item.image_url} alt={item.name} className="merch-card-img" />
        </div>
      )}
      <div className="merch-card-body">
        <h3 className="merch-card-name">{item.name}</h3>
        {item.description && <p className="merch-card-desc">{item.description}</p>}
        <p className="merch-card-price">₱{Number(item.price).toFixed(2)}</p>
      </div>
      <form className="merch-card-form" onSubmit={handleSubmit}>
        <div className="merch-card-row">
          <label htmlFor={`qty-${item.id}`}>Quantity</label>
          <input
            id={`qty-${item.id}`}
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="merch-card-row">
          <label htmlFor={`proof-${item.id}`}>Proof of payment (optional)</label>
          <input
            id={`proof-${item.id}`}
            type="file"
            accept="image/*"
            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
          />
        </div>
        <button type="submit" className="merch-card-btn" disabled={ordering}>
          {ordering ? 'Placing…' : 'Place order'}
        </button>
      </form>
    </article>
  );
}
