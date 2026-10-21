'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from './CartProvider';
import { useQuote } from './useQuote';
import { rupees } from '@/lib/format';

export function OrderSummary({ quote, loading, children }) {
  if (!quote) return <div className="summary">{loading ? 'Calculating…' : null}{children}</div>;
  const pct = Math.min(100, Math.round((quote.subtotal / quote.freeShippingMin) * 100));
  return (
    <div className="summary" aria-busy={loading}>
      <h2 style={{ fontSize: '1.15rem' }}>Order summary</h2>
      <div className="summary-row"><span>Subtotal</span><span>{rupees(quote.subtotal)}</span></div>
      <div className="summary-row"><span>Shipping</span><span>{quote.shipping ? rupees(quote.shipping) : 'Free'}</span></div>
      {quote.amountToFreeShipping > 0 && (
        <div style={{ fontSize: '.85rem' }}>
          <div className="progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          Add <strong>{rupees(quote.amountToFreeShipping)}</strong> more for free shipping
        </div>
      )}
      <div className="summary-row summary-total"><span>Total</span><span>{rupees(quote.total)}</span></div>
      {children}
    </div>
  );
}

export default function CartView() {
  const { items, ready, setQuantity, remove, maxQty } = useCart();
  const { quote, error, loading } = useQuote();

  if (!ready) return <div className="empty">Loading your cart…</div>;
  if (!items.length) {
    return (
      <div className="empty">
        <h1>Your cart is empty</h1>
        <p className="muted">Start with our bestselling bilona A2 desi cow ghee.</p>
        <Link href="/products" className="btn btn-primary">Shop products</Link>
      </div>
    );
  }

  const priced = new Map((quote?.lines || []).map((l) => [l.variantId, l]));
  const problems = new Map((quote?.problems || []).map((p) => [p.variantId, p.reason]));

  return (
    <div className="cart-layout">
      <section aria-labelledby="cart-h">
        <h1 id="cart-h">Your cart</h1>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {items.map((i) => {
          const line = priced.get(i.variantId);
          const problem = problems.get(i.variantId);
          return (
            <div className="cart-line" key={i.variantId}>
              {i.image ? <Image src={i.image} alt="" width={76} height={76} /> : <span />}
              <div>
                <h3><Link href={`/products/${i.productSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{i.productName}</Link></h3>
                <div className="muted" style={{ fontSize: '.88rem' }}>{i.variantLabel} · {rupees(line?.unitPrice ?? i.price)} each</div>
                {problem && <p className="field-error">{problem}</p>}
                <div className="cart-line-foot">
                  <div className="qty" role="group" aria-label={`Quantity for ${i.productName}`}>
                    <button type="button" onClick={() => setQuantity(i.variantId, i.quantity - 1)} aria-label="Decrease quantity">−</button>
                    <span aria-live="polite">{i.quantity}</span>
                    <button type="button" onClick={() => setQuantity(i.variantId, i.quantity + 1)} disabled={i.quantity >= maxQty} aria-label="Increase quantity">+</button>
                  </div>
                  <strong>{rupees(line?.lineTotal ?? i.price * i.quantity)}</strong>
                  <button type="button" className="link-btn" onClick={() => remove(i.variantId)}>Remove</button>
                </div>
              </div>
            </div>
          );
        })}
        <p style={{ marginTop: 16 }}><Link href="/products">← Continue shopping</Link></p>
      </section>
      <OrderSummary quote={quote} loading={loading}>
        <Link
          href="/checkout"
          className="btn btn-primary btn-block"
          style={{ marginTop: 12 }}
          aria-disabled={problems.size > 0 || !quote}
          onClick={(e) => (problems.size > 0 || !quote) && e.preventDefault()}
        >
          Proceed to checkout
        </Link>
        {problems.size > 0 && <p className="field-error">Remove unavailable items to continue.</p>}
        <p className="muted center" style={{ fontSize: '.82rem', marginTop: 10 }}>Cash on Delivery available</p>
      </OrderSummary>
    </div>
  );
}
