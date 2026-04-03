import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  backfillMerchCartFromCatalog,
  getCartLineDisplay,
  readMerchCart,
  writeMerchCart,
} from '../../utils/merchCart';
import './MerchCheckoutPage.css';

const COURSE_OPTIONS = [
  { value: '', label: 'Select course' },
  { value: 'BSCS', label: 'BSCS — Computer Science' },
  { value: 'BSIT', label: 'BSIT — Information Technology' },
];

function formatPeso(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '₱0.00';
  return `₱${x.toFixed(2)}`;
}

export default function MerchCheckoutPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [lines, setLines] = useState(() => readMerchCart());
  const [catalogById, setCatalogById] = useState(() => new Map());
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [fullName, setFullName] = useState('');
  const [section, setSection] = useState('');
  const [course, setCourse] = useState('');
  const [gcashRef, setGcashRef] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const refreshCart = useCallback(() => {
    setLines(readMerchCart());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const raw = localStorage.getItem('ccs_user');
    if (!token || !raw) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(raw);
    setUser(u);
    setFullName(u.name || '');
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingCatalog(true);
      try {
        const token = localStorage.getItem('ccs_token');
        const res = await fetch('/api/merchandise?available_only=1', {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        });
        const data = await res.json();
        if (cancelled || !data.success) return;
        const list = data.data || [];
        backfillMerchCartFromCatalog(list);
        refreshCart();
        setCatalogById(new Map(list.map((it) => [Number(it.id), it])));
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshCart]);

  useEffect(() => {
    if (!user || loadingCatalog) return;
    if (readMerchCart().length === 0 && !success) {
      navigate('/dashboard/merch-store', { replace: true });
    }
  }, [user, loadingCatalog, success, navigate]);

  const grandTotal = useMemo(
    () =>
      lines.reduce((s, l) => {
        const q = Number(l.quantity || 0);
        const p = Number(l.price || 0);
        return s + q * p;
      }, 0),
    [lines],
  );

  const validate = () => {
    const err = {};
    if (!fullName.trim()) err.fullName = 'Full name is required.';
    if (!section.trim()) err.section = 'Section is required.';
    if (!course) err.course = 'Please select your course.';
    const digits = gcashRef.replace(/\D/g, '');
    if (digits.length !== 13) err.gcashRef = 'GCash reference must be exactly 13 digits.';
    if (!proofFile) err.proof = 'Proof of payment image is required.';
    else if (!proofFile.type.startsWith('image/')) err.proof = 'Please upload an image file.';
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleGcashInput = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 13);
    setGcashRef(v);
    if (fieldErrors.gcashRef) setFieldErrors((x) => ({ ...x, gcashRef: undefined }));
  };

  const handleProofChange = (e) => {
    const f = e.target.files?.[0] || null;
    setProofFile(f);
    if (fieldErrors.proof) setFieldErrors((x) => ({ ...x, proof: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    const token = localStorage.getItem('ccs_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const snapshot = readMerchCart();
    if (snapshot.length === 0) return;

    setSubmitting(true);
    const remaining = [];
    const errors = [];

    for (const line of snapshot) {
      try {
        const fd = new FormData();
        fd.append('merchandise_id', String(Number(line.merchandise_id)));
        fd.append('quantity', String(Math.max(1, Math.floor(Number(line.quantity)))));
        fd.append('payer_full_name', fullName.trim());
        fd.append('section', section.trim());
        fd.append('course', course);
        fd.append('gcash_reference', gcashRef.replace(/\D/g, ''));
        fd.append('proof_image', proofFile);

        const res = await fetch('/api/merchandise-orders', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) continue;
        remaining.push(line);
        errors.push(data.message || `Could not submit “${line.name || 'item'}”.`);
      } catch {
        remaining.push(line);
        errors.push(`Network error for “${line.name || 'item'}”.`);
      }
    }

    writeMerchCart(remaining);
    setLines(remaining);
    setSubmitting(false);

    if (remaining.length === 0) {
      setSuccess(true);
    } else if (remaining.length === snapshot.length) {
      setSubmitError(errors[0] || 'Could not submit your order. Please try again.');
    } else {
      setSubmitError(
        `${errors.join(' ')} Items that could not be submitted are still in your cart.`,
      );
    }
  };

  if (!user) return null;

  if (success) {
    return (
      <div className="merch-checkout">
        <div className="merch-checkout-card merch-checkout-success">
          <div className="merch-checkout-success-icon" aria-hidden>
            ✓
          </div>
          <h1 className="merch-checkout-title">Thank you!</h1>
          <p className="merch-checkout-success-msg">
            Your order has been submitted! Please wait for confirmation.
          </p>
          <button
            type="button"
            className="merch-checkout-btn merch-checkout-btn-primary"
            onClick={() => navigate('/dashboard/merch-store')}
          >
            Back to Merch Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="merch-checkout">
      <header className="merch-checkout-top">
        <button type="button" className="merch-checkout-back" onClick={() => navigate(-1)} aria-label="Go back">
          ‹
        </button>
        <h1 className="merch-checkout-heading">Place order &amp; pay</h1>
      </header>

      <p className="merch-checkout-lead">
        Scan the GCash QR code, complete payment, then fill in your details and upload your proof of payment.
      </p>

      <section className="merch-checkout-card merch-checkout-qr-card" aria-label="GCash payment QR">
        <h2 className="merch-checkout-card-title">Pay with GCash</h2>
        <div className="merch-checkout-qr-wrap">
          <img
            src="/gcash-qr-placeholder.svg"
            alt=""
            className="merch-checkout-qr-img"
            width={240}
            height={240}
          />
        </div>
      </section>

      <form className="merch-checkout-page-form" onSubmit={handleSubmit} noValidate>
        <section className="merch-checkout-card">
          <h2 className="merch-checkout-card-title">Payment details</h2>
          <div className="merch-checkout-form">
          <label className="merch-checkout-field">
            <span className="merch-checkout-label">Full name</span>
            <input
              type="text"
              className={`merch-checkout-input ${fieldErrors.fullName ? 'is-invalid' : ''}`}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((x) => ({ ...x, fullName: undefined }));
              }}
              autoComplete="name"
              placeholder="Your full name"
            />
            {fieldErrors.fullName ? <span className="merch-checkout-error">{fieldErrors.fullName}</span> : null}
          </label>

          <label className="merch-checkout-field">
            <span className="merch-checkout-label">Section</span>
            <input
              type="text"
              className={`merch-checkout-input ${fieldErrors.section ? 'is-invalid' : ''}`}
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                if (fieldErrors.section) setFieldErrors((x) => ({ ...x, section: undefined }));
              }}
            />
            {fieldErrors.section ? <span className="merch-checkout-error">{fieldErrors.section}</span> : null}
          </label>

          <label className="merch-checkout-field">
            <span className="merch-checkout-label">Course</span>
            <select
              className={`merch-checkout-input merch-checkout-select ${fieldErrors.course ? 'is-invalid' : ''}`}
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                if (fieldErrors.course) setFieldErrors((x) => ({ ...x, course: undefined }));
              }}
            >
              {COURSE_OPTIONS.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {fieldErrors.course ? <span className="merch-checkout-error">{fieldErrors.course}</span> : null}
          </label>

          <label className="merch-checkout-field">
            <span className="merch-checkout-label">GCash reference number</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              className={`merch-checkout-input ${fieldErrors.gcashRef ? 'is-invalid' : ''}`}
              value={gcashRef}
              onChange={handleGcashInput}
              placeholder="13-digit reference"
              aria-describedby="gcash-ref-hint"
            />
            <span id="gcash-ref-hint" className="merch-checkout-hint">
              The 13-digit reference from your GCash receipt.
            </span>
            {fieldErrors.gcashRef ? <span className="merch-checkout-error">{fieldErrors.gcashRef}</span> : null}
          </label>

          <div className="merch-checkout-field">
            <span className="merch-checkout-label">Proof of payment</span>
            <input
              type="file"
              accept="image/*"
              className={`merch-checkout-file ${fieldErrors.proof ? 'is-invalid' : ''}`}
              onChange={handleProofChange}
            />
            <span className="merch-checkout-hint">Screenshot or photo — image files only (PNG, JPG, etc.).</span>
            {fieldErrors.proof ? <span className="merch-checkout-error">{fieldErrors.proof}</span> : null}
          </div>
          </div>
        </section>

        <section className="merch-checkout-card" aria-label="Order summary">
          <h2 className="merch-checkout-card-title">Order summary</h2>
          {loadingCatalog ? (
            <p className="merch-checkout-muted">Loading…</p>
          ) : (
            <ul className="merch-checkout-summary-list">
              {lines.map((line, i) => {
                const item = catalogById.get(Number(line.merchandise_id));
                const { color, size } = getCartLineDisplay(line, item);
                const qty = Number(line.quantity || 0);
                const unit = Number(line.price || 0);
                const lineTotal = qty * unit;
                return (
                  <li key={`${line.merchandise_id}-${line.color_key}-${line.size}-${i}`} className="merch-checkout-summary-line">
                    <div className="merch-checkout-summary-name">{line.name || 'Item'}</div>
                    <dl className="merch-checkout-summary-dl">
                      <div>
                        <dt>Color</dt>
                        <dd>{color ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Size</dt>
                        <dd>{size ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Quantity</dt>
                        <dd>{qty}</dd>
                      </div>
                      <div>
                        <dt>Line total</dt>
                        <dd>{formatPeso(lineTotal)}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="merch-checkout-summary-total">
            <span>Total</span>
            <strong>{formatPeso(grandTotal)}</strong>
          </div>
        </section>

        {submitError ? (
          <p className="merch-checkout-banner merch-checkout-banner-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          className="merch-checkout-btn merch-checkout-btn-primary"
          disabled={submitting || loadingCatalog || lines.length === 0}
        >
          {submitting ? 'Submitting…' : 'Confirm Payment'}
        </button>
      </form>
    </div>
  );
}
