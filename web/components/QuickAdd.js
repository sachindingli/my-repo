'use client';

import { useCart } from './CartProvider';

export default function QuickAdd({ item, label }) {
  const { add } = useCart();
  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={() => add(item, 1)} aria-label={`Add ${item.productName} ${item.variantLabel} to cart`}>
      {label}
    </button>
  );
}
