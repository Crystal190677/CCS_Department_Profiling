import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MERCH_CART_KEY,
  MERCH_CART_UPDATED_EVENT,
  backfillMerchCartFromCatalog,
  getCartLineDisplay,
  readMerchCart,
  writeMerchCart,
} from '../../utils/merchCart';
import './MerchCartPanel.css';

function formatPeso(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '₱0.00';
  return `₱${x.toFixed(2)}`;
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export default function MerchCartPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(() => readMerchCart());
  const [catalogById, setCatalogById] = useState(() => new Map());

  const refresh = useCallback(() => {
    setLines(readMerchCart());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e) => {
      if ((typeof e.key === 'string' && e.key.startsWith(`${MERCH_CART_KEY}:`)) || e.key === null) refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener(MERCH_CART_UPDATED_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MERCH_CART_UPDATED_EVENT, onCustom);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('ccs_token');
        const res = await fetch('/api/merchandise?available_only=1', {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        });
        const data = await res.json();
        if (cancelled || !data.success) {
          if (!cancelled && !data.success) setCatalogById(new Map());
          return;
        }
        const list = data.data || [];
        backfillMerchCartFromCatalog(list);
        setCatalogById(new Map(list.map((it) => [Number(it.id), it])));
      } catch {
        if (!cancelled) setCatalogById(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const totalQty = lines.reduce((s, l) => s + Number(l.quantity || 0), 0);
  const grandTotal = lines.reduce((s, l) => {
    const q = Number(l.quantity || 0);
    const p = Number(l.price || 0);
    return s + q * p;
  }, 0);

  const adjustLineQuantity = (index, delta) => {
    const cart = readMerchCart();
    if (index < 0 || index >= cart.length) return;
    const nextQty = Number(cart[index].quantity) + delta;
    if (nextQty < 1) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = nextQty;
    }
    writeMerchCart(cart);
  };

  const goToCheckout = () => {
    setOpen(false);
    navigate('/dashboard/merch-checkout');
  };

  return (
    <div className="merch-cart-panel-wrap">
      <button
        type="button"
        className="merch-cart-panel-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={totalQty ? `Shopping cart, ${totalQty} items` : 'Shopping cart'}
        aria-expanded={open}
      >
        <CartIcon />
        {totalQty > 0 ? (
          <span className="merch-cart-panel-badge" aria-hidden="true">
            {totalQty > 99 ? '99+' : totalQty}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="merch-cart-panel-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close cart overlay"
          />
          <div className="merch-cart-panel-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
            <div className="merch-cart-panel-header">
              <span className="merch-cart-panel-title">Your cart</span>
              <button type="button" className="merch-cart-panel-close" onClick={() => setOpen(false)} aria-label="Close cart">
                ×
              </button>
            </div>
            <div className="merch-cart-panel-body">
              {lines.length === 0 ? (
                <div className="merch-cart-panel-empty">
                  <p>Your cart is empty.</p>
                  <button
                    type="button"
                    className="merch-cart-panel-cta"
                    onClick={() => {
                      setOpen(false);
                      navigate('/dashboard/merch-store');
                    }}
                  >
                    Go to Merch Store
                  </button>
                </div>
              ) : (
                <ul className="merch-cart-panel-list">
                  {lines.map((line, i) => {
                    const item = catalogById.get(Number(line.merchandise_id));
                    const { color, size } = getCartLineDisplay(line, item);
                    const displayColor = color ?? '—';
                    const displaySize = size ?? '—';
                    const qty = Number(line.quantity || 0);
                    const unit = Number(line.price || 0);
                    const lineTotal = qty * unit;
                    const rowKey = `${Number(line.merchandise_id)}|${line.color_key ?? ''}|${String(line.size ?? '')}|${i}`;
                    return (
                      <li key={rowKey} className="merch-cart-panel-line">
                        <div className="merch-cart-panel-line-name">{line.name || 'Item'}</div>
                        <dl className="merch-cart-panel-dl">
                          <div>
                            <dt>Color</dt>
                            <dd>{displayColor}</dd>
                          </div>
                          <div>
                            <dt>Size</dt>
                            <dd>{displaySize}</dd>
                          </div>
                          <div>
                            <dt>Quantity</dt>
                            <dd className="merch-cart-panel-dd-qty">
                              <div className="merch-cart-qty-stepper">
                                <button
                                  type="button"
                                  className="merch-cart-qty-btn"
                                  onClick={() => adjustLineQuantity(i, -1)}
                                  aria-label={`Decrease quantity of ${line.name || 'item'}`}
                                >
                                  −
                                </button>
                                <span className="merch-cart-qty-value" aria-live="polite">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  className="merch-cart-qty-btn"
                                  onClick={() => adjustLineQuantity(i, 1)}
                                  aria-label={`Increase quantity of ${line.name || 'item'}`}
                                >
                                  +
                                </button>
                              </div>
                            </dd>
                          </div>
                          <div>
                            <dt>Price</dt>
                            <dd>
                              <span className="merch-cart-panel-price-unit">{formatPeso(unit)}</span>
                              <span className="merch-cart-panel-price-hint"> × {qty}</span>
                              <span className="merch-cart-panel-price-eq"> = {formatPeso(lineTotal)}</span>
                            </dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {lines.length > 0 ? (
              <div className="merch-cart-panel-footer">
                <div className="merch-cart-panel-total-row">
                  <span>Total</span>
                  <strong>{formatPeso(grandTotal)}</strong>
                </div>
                <button type="button" className="merch-cart-panel-cta" onClick={goToCheckout}>
                  Place Order
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
