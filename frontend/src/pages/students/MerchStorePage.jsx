import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MERCH_CART_KEY, normalizeMerchColors, normalizeMerchSizes, notifyMerchCartUpdated } from '../../utils/merchCart';
import './MerchStorePage.css';

function getAuthHeaders(json = true) {
  const token = localStorage.getItem('ccs_token');
  return {
    ...(json && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function getMerchImageSrc(item) {
  const path = item?.image_path;
  if (path && typeof path === 'string') {
    const clean = path.replace(/^\/+/, '').replace(/^storage\//, '');
    return `/storage/${clean}`;
  }
  if (item?.image_url) {
    try {
      const u = new URL(item.image_url);
      if (u.pathname.startsWith('/storage/')) {
        return u.pathname;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function addToMerchCart(item, color, size) {
  const color_key = color?.key ?? 'default';
  const color_label = color?.label ?? 'Default';
  const sz = String(size);
  const cart = JSON.parse(localStorage.getItem(MERCH_CART_KEY) || '[]');
  const id = Number(item.id);
  const idx = cart.findIndex(
    (x) => Number(x.merchandise_id) === id && x.color_key === color_key && String(x.size) === sz,
  );
  if (idx >= 0) {
    cart[idx].quantity = Number(cart[idx].quantity) + 1;
  } else {
    cart.push({
      merchandise_id: id,
      name: item.name,
      price: item.price,
      quantity: 1,
      color_key,
      color_label,
      size: sz,
    });
  }
  localStorage.setItem(MERCH_CART_KEY, JSON.stringify(cart));
  notifyMerchCartUpdated();
}

export default function MerchStorePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [sizeChoice, setSizeChoice] = useState('M');

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

  const n = items.length;
  const current = n ? items[Math.min(activeIndex, n - 1)] : null;
  const colors = useMemo(() => (current ? normalizeMerchColors(current) : []), [current]);
  const sizes = useMemo(() => (current ? normalizeMerchSizes(current) : []), [current]);

  useEffect(() => {
    if (!n) return;
    setActiveIndex((i) => Math.min(Math.max(i, 0), n - 1));
  }, [n]);

  useEffect(() => {
    if (!current) return;
    setColorIndex(0);
    const sz = normalizeMerchSizes(current);
    setSizeChoice(sz.includes('M') ? 'M' : sz[0]);
  }, [current?.id]);

  const prevIndex = n ? (activeIndex - 1 + n) % n : 0;
  const nextIndex = n ? (activeIndex + 1) % n : 0;
  const prevItem = n > 1 ? items[prevIndex] : null;
  const nextItem = n > 1 ? items[nextIndex] : null;

  const effectiveColorIndex = colors.length ? Math.min(colorIndex, colors.length - 1) : 0;
  const selectedColor = colors[effectiveColorIndex] || colors[0];
  const subtitleText = useMemo(() => {
    if (selectedColor?.label) return String(selectedColor.label).toUpperCase();
    return (current?.category_label || 'ORANGE').toUpperCase();
  }, [selectedColor, current]);

  const handleAddToCart = () => {
    if (!current?.is_available || !selectedColor) return;
    addToMerchCart(current, selectedColor, sizeChoice);
    setMessage({
      type: 'success',
      text: `“${current.name}” (${selectedColor.label}, size ${sizeChoice}) added to your cart.`,
    });
  };

  const goPrev = () => {
    if (!n) return;
    setSlideDir(-1);
    setActiveIndex((i) => (i - 1 + n) % n);
  };

  const goNext = () => {
    if (!n) return;
    setSlideDir(1);
    setActiveIndex((i) => (i + 1) % n);
  };

  if (!user) return null;

  return (
    <div className="merch-store-page merch-store-page--carousel">
      <div className="merch-store-bound">
        <header className="merch-store-top">
          <button type="button" className="merch-store-back" onClick={() => navigate(-1)} aria-label="Go back">
            ‹
          </button>
          <div className="merch-store-titles">
            <h1 className="merch-store-brand">CCS MERCH</h1>
            <p
              className="merch-store-accentline"
              style={{ color: selectedColor?.hex || '#ea580c' }}
              key={`${current?.id}-${subtitleText}`}
            >
              {subtitleText}
            </p>
          </div>
          <div className="merch-store-top-spacer" aria-hidden />
        </header>

        {message.text && (
          <div className={`merch-store-msg ${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="merch-store-loading">Loading…</p>
        ) : n === 0 ? (
          <p className="merch-store-empty">No merchandise available at the moment.</p>
        ) : null}
      </div>

      {!loading && n > 0 && (
        <>
          <div className="merch-carousel merch-carousel--bleed">
            <div
              className="merch-carousel-row"
              key={activeIndex}
              style={{ '--merch-slide-x': `${slideDir * 40}px` }}
            >
              {n > 1 && prevItem && (
                <button
                  type="button"
                  className="merch-carousel-side merch-carousel-side--left"
                  onClick={goPrev}
                  aria-label="Previous product"
                >
                  <CarouselCard item={prevItem} />
                </button>
              )}

              <div className="merch-carousel-center">
                <CarouselCard item={current} featured />
              </div>

              {n > 1 && nextItem && (
                <button
                  type="button"
                  className="merch-carousel-side merch-carousel-side--right"
                  onClick={goNext}
                  aria-label="Next product"
                >
                  <CarouselCard item={nextItem} />
                </button>
              )}
            </div>

            {n > 1 && (
              <div className="merch-carousel-arrows merch-store-bound merch-store-bound--arrows">
                <button type="button" className="merch-carousel-arrow merch-carousel-arrow--outline" onClick={goPrev} aria-label="Previous">
                  ‹
                </button>
                <button type="button" className="merch-carousel-arrow merch-carousel-arrow--solid" onClick={goNext} aria-label="Next">
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="merch-store-bound">
            <footer className="merch-store-detail">
              <div className="merch-store-detail-main">
              <h2 className="merch-store-detail-name">{current.name}</h2>
              <p className="merch-store-detail-price">₱{Number(current.price).toFixed(2)}</p>
              {current.description && <p className="merch-store-detail-desc">{current.description}</p>}

              <div className="merch-store-options">
                <div className="merch-store-option-block">
                  <span className="merch-store-option-label">Color</span>
                  <div className="merch-store-color-dots" role="list">
                    {colors.map((c, i) => (
                      <button
                        key={c.key}
                        type="button"
                        role="listitem"
                        className={`merch-store-color-dot ${i === effectiveColorIndex ? 'is-selected' : ''}`}
                        style={{ '--dot': c.hex }}
                        title={c.label}
                        aria-label={`Color ${c.label}`}
                        aria-pressed={i === effectiveColorIndex}
                        onClick={() => setColorIndex(i)}
                      />
                    ))}
                  </div>
                </div>
                <div className="merch-store-option-block">
                  <span className="merch-store-option-label">Size</span>
                  <div className="merch-store-sizes">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`merch-store-size-col ${s === sizeChoice ? 'is-selected' : ''}`}
                        aria-pressed={s === sizeChoice}
                        onClick={() => setSizeChoice(s)}
                      >
                        <span className="merch-store-size-col-dot" aria-hidden />
                        <span className="merch-store-size-col-label">{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

                <button
                  type="button"
                  className="merch-store-add-cart"
                  onClick={handleAddToCart}
                  disabled={!current.is_available}
                >
                  Add to cart
                </button>
              </div>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}

function CarouselCard({ item, featured }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = getMerchImageSrc(item);
  const showImg = Boolean(imgSrc) && !imgFailed;

  return (
    <div className={`merch-cvisual ${featured ? 'merch-cvisual--featured' : 'merch-cvisual--small'}`}>
      {showImg ? (
        <img src={imgSrc} alt="" className="merch-cvisual-img" onError={() => setImgFailed(true)} />
      ) : (
        <div className="merch-cvisual-fallback" aria-hidden>
          <span>🛍</span>
        </div>
      )}
    </div>
  );
}
