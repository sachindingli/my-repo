'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const KEY = 'hitkram-cart-v1';
const MAX_QTY = 20;
const CartContext = createContext(null);

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => Number.isInteger(i.variantId) && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setItems(load());
    setReady(true);
    const sync = (e) => e.key === KEY && setItems(load());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* private mode: cart still works for this visit */
    }
  }, [items, ready]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /** item: { variantId, productSlug, productName, variantLabel, price, mrp, image } */
  const add = useCallback((item, quantity = 1, { silent = false } = {}) => {
    setItems((cur) => {
      const found = cur.find((i) => i.variantId === item.variantId);
      if (found) {
        return cur.map((i) =>
          i.variantId === item.variantId ? { ...i, ...item, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i,
        );
      }
      return [...cur, { ...item, quantity: Math.min(MAX_QTY, quantity) }];
    });
    if (!silent) setToast(`${item.productName} (${item.variantLabel}) added to cart`);
  }, []);

  const setQuantity = useCallback((variantId, quantity) => {
    setItems((cur) =>
      quantity <= 0
        ? cur.filter((i) => i.variantId !== variantId)
        : cur.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((variantId) => setItems((cur) => cur.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      ready,
      count: items.reduce((s, i) => s + i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      maxQty: MAX_QTY,
    }),
    [items, ready, add, setQuantity, remove, clear],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <Link href="/cart">View cart</Link>
        </div>
      )}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
