import { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, variant = 'success', onDismiss, duration = 3200 }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className={`ccs-toast ccs-toast-${variant}`} role="status">
      <span className="ccs-toast-msg">{message}</span>
      <button type="button" className="ccs-toast-close" onClick={() => onDismiss?.()} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
