export const MERCH_CART_KEY = 'ccs_merch_cart';
export const MERCH_CART_UPDATED_EVENT = 'ccs-merch-cart-updated';

export function getMerchCartStorageKey() {
  try {
    const raw = localStorage.getItem('ccs_user');
    if (!raw) return `${MERCH_CART_KEY}:guest`;
    const user = JSON.parse(raw);
    const id = user?.id;
    if (id == null || id === '') return `${MERCH_CART_KEY}:guest`;
    return `${MERCH_CART_KEY}:${String(id)}`;
  } catch {
    return `${MERCH_CART_KEY}:guest`;
  }
}

function merchName(item) {
  return String(item?.name || '').toLowerCase();
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function humanizeKey(key) {
  const s = String(key).replace(/_/g, ' ').trim();
  if (!s) return null;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeMerchColors(item) {
  const raw = item?.available_colors;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((c, i) => {
      if (typeof c === 'string') {
        return { key: String(c).toLowerCase().replace(/\s+/g, '_'), label: c, hex: '#ea580c' };
      }
      return {
        key: c.key || `color_${i}`,
        label: c.label || c.key || 'Color',
        hex: c.hex || '#ea580c',
      };
    });
  }
  const name = merchName(item);
  if (/\b(hoodie|shirt)\b/i.test(name)) {
    return [
      { key: 'white', label: 'White', hex: '#f8fafc' },
      { key: 'black', label: 'Black', hex: '#111827' },
      { key: 'orange', label: 'Orange', hex: '#ea580c' },
    ];
  }
  return [{ key: 'default', label: item?.category_label || 'Classic', hex: '#ea580c' }];
}

export function normalizeMerchSizes(item) {
  const raw = item?.available_sizes;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s) => String(s));
  }
  const name = merchName(item);
  if (/\blanyard\b/i.test(name)) {
    return ['BSIT', 'BSCS'];
  }
  return ['S', 'M', 'L'];
}

/**
 * Resolve color/size text for a cart line. Uses stored fields, alternate legacy keys,
 * catalog metadata when `catalogItem` is provided, then normalized color_key.
 * @returns {{ color: string | null, size: string | null }}
 */
export function getCartLineDisplay(line, catalogItem) {
  let color = firstNonEmpty(
    line.color_label,
    line.color,
    line.colorName,
    line.selected_color,
  );

  if (!color && catalogItem) {
    const colors = normalizeMerchColors(catalogItem);
    const key = line.color_key;
    if (key != null && String(key).trim() !== '') {
      const found = colors.find((c) => c.key === key);
      if (found) color = found.label;
    }
    if (!color && colors.length === 1) color = colors[0].label;
  }

  if (!color && line.color_key != null && String(line.color_key).trim() !== '') {
    if (line.color_key === 'default') color = 'Default';
    else color = humanizeKey(line.color_key);
  }

  let size = firstNonEmpty(line.size, line.size_label, line.selected_size);
  if (!size && catalogItem) {
    const sizes = normalizeMerchSizes(catalogItem);
    const keySz = line.size != null ? String(line.size).trim() : '';
    if (keySz && sizes.includes(keySz)) size = keySz;
    if (!size && sizes.length === 1) size = sizes[0];
  }

  return { color, size };
}

function lineHasStoredColor(line) {
  return firstNonEmpty(line.color_label, line.color, line.colorName, line.selected_color) != null;
}

function lineHasStoredSize(line) {
  return firstNonEmpty(line.size, line.size_label, line.selected_size) != null;
}

/**
 * Fills missing color_label / size on cart rows using catalog data so panels show real labels.
 */
export function backfillMerchCartFromCatalog(catalogItems) {
  const byId = new Map((catalogItems || []).map((it) => [Number(it.id), it]));
  const cart = readMerchCart();
  let changed = false;
  const next = cart.map((line) => {
    const item = byId.get(Number(line.merchandise_id));
    if (!item) return line;
    const { color, size } = getCartLineDisplay(line, item);
    const out = { ...line };
    if (!lineHasStoredColor(line) && color) {
      out.color_label = color;
      changed = true;
    }
    if (!lineHasStoredSize(line) && size) {
      out.size = size;
      changed = true;
    }
    return out;
  });
  if (changed) writeMerchCart(next);
}

export function readMerchCart() {
  try {
    const raw = localStorage.getItem(getMerchCartStorageKey());
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeMerchCart(cart) {
  localStorage.setItem(getMerchCartStorageKey(), JSON.stringify(cart));
  notifyMerchCartUpdated();
}

export function notifyMerchCartUpdated() {
  window.dispatchEvent(new CustomEvent(MERCH_CART_UPDATED_EVENT));
}
