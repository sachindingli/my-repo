'use client';

import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';

/** Server-side pricing for the current cart (the API is the source of truth for prices and stock). */
export function useQuote() {
  const { items, ready } = useCart();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const key = items.map((i) => `${i.variantId}:${i.quantity}`).join(',');

  useEffect(() => {
    if (!ready) return undefined;
    if (!items.length) {
      setQuote(null);
      setLoading(false);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items.map(({ variantId, quantity }) => ({ variantId, quantity })) }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not load prices');
        setQuote(await res.json());
        setError('');
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { quote, error, loading };
}
