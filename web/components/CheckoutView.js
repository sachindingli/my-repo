'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { useQuote } from './useQuote';
import { OrderSummary } from './CartView';
import { rupees } from '@/lib/format';
import { LAST_ORDER_KEY } from './OrderStatus';

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function Field({ name, label, hint, error, children, ...input }) {
  return (
    <div className="field">
      <label htmlFor={`co-${name}`}>{label} {hint && <span className="hint">{hint}</span>}</label>
      {children || <input id={`co-${name}`} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `co-${name}-err` : undefined} {...input} />}
      {error && <div className="field-error" id={`co-${name}-err`}>{error}</div>}
    </div>
  );
}

export default function CheckoutView() {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const { quote, loading } = useQuote();
  const [options, setOptions] = useState(null);
  const [method, setMethod] = useState('COD');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/checkout/options')
      .then((r) => r.json())
      .then((o) => {
        setOptions(o);
        if (!o.cod && o.razorpay) setMethod('RAZORPAY');
      })
      .catch(() => setOptions({ cod: true, razorpay: null }));
  }, []);

  if (!ready) return <div className="empty">Loading…</div>;
  if (!items.length) {
    return (
      <div className="empty">
        <h1>Your cart is empty</h1>
        <Link href="/products" className="btn btn-primary">Shop products</Link>
      </div>
    );
  }

  function finish(number, phone) {
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ number, phone }));
    } catch {
      /* ignore */
    }
    clear();
    router.push(`/order-success?number=${encodeURIComponent(number)}`);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setFields({});
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const customer = {
      name: form.name, phone: form.phone, email: form.email, address1: form.address1, address2: form.address2 || undefined,
      city: form.city, state: form.state, pincode: form.pincode, notes: form.notes || undefined,
    };
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(({ variantId, quantity }) => ({ variantId, quantity })), customer, paymentMethod: method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const f = Object.fromEntries(Object.entries(data.fields || {}).map(([k, v]) => [k.replace(/^customer\./, ''), v]));
        setFields(f);
        setError(data.error || 'Could not place the order.');
        const first = Object.keys(f)[0];
        if (first) document.getElementById(`co-${first}`)?.focus();
        setSubmitting(false);
        return;
      }

      if (method === 'COD') return finish(data.number, customer.phone);

      if (!(await loadRazorpay())) {
        setError('Could not load the payment window. Check your connection or choose Cash on Delivery.');
        setSubmitting(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: data.razorpay.keyId,
        order_id: data.razorpay.orderId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: 'Hitkram',
        description: `Order ${data.number}`,
        prefill: { name: customer.name, contact: customer.phone, email: customer.email || undefined },
        theme: { color: '#2b6b33' },
        handler: async (resp) => {
          const v = await fetch(`/api/orders/${data.number}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resp),
          });
          if (v.ok) finish(data.number, customer.phone);
          else {
            setError(`We could not confirm the payment for order ${data.number}. If money was deducted, WhatsApp us and we will sort it out.`);
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError('Payment was cancelled. You can try again or choose Cash on Delivery.');
            setSubmitting(false);
          },
        },
      });
      rzp.open();
    } catch {
      setError('Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  return (
    <form
      className="cart-layout"
      onSubmit={submit}
      noValidate
      onInput={(e) => fields[e.target.name] && setFields((f) => ({ ...f, [e.target.name]: undefined }))}
    >
      <section aria-labelledby="co-h">
        <h1 id="co-h">Checkout</h1>
        <div className="panel">
          <h2 style={{ fontSize: '1.15rem' }}>Delivery details</h2>
          <div className="form-grid two">
            <Field name="name" label="Full name" autoComplete="name" required error={fields.name} />
            <Field name="phone" label="Mobile number" hint="(for delivery updates)" type="tel" inputMode="numeric" autoComplete="tel-national" required error={fields.phone} />
            <Field name="address1" label="House no., street, area" autoComplete="address-line1" required error={fields.address1} />
            <Field name="address2" label="Landmark" hint="(optional)" autoComplete="address-line2" error={fields.address2} />
            <Field name="pincode" label="PIN code" inputMode="numeric" maxLength={6} autoComplete="postal-code" required error={fields.pincode} />
            <Field name="city" label="City / Town" autoComplete="address-level2" required error={fields.city} />
            <Field name="state" label="State" error={fields.state}>
              <select id="co-state" name="state" required defaultValue="" autoComplete="address-level1" aria-invalid={Boolean(fields.state)}>
                <option value="" disabled>Choose state</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field name="email" label="Email" hint="(optional, for receipt)" type="email" autoComplete="email" error={fields.email} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="co-notes">Order note <span className="hint">(optional)</span></label>
            <textarea id="co-notes" name="notes" maxLength={500} />
          </div>
        </div>

        <fieldset className="panel" style={{ marginTop: 16 }}>
          <legend style={{ fontWeight: 600, fontSize: '1.15rem', padding: '0 6px' }}>Payment</legend>
          <div className="form-grid">
            {options?.razorpay && (
              <label className="radio-card">
                <input type="radio" name="pm" value="RAZORPAY" checked={method === 'RAZORPAY'} onChange={() => setMethod('RAZORPAY')} />
                <span><strong>Pay online</strong><br /><span className="muted">UPI, cards, net banking, wallets (secured by Razorpay)</span></span>
              </label>
            )}
            {(options?.cod ?? true) && (
              <label className="radio-card">
                <input type="radio" name="pm" value="COD" checked={method === 'COD'} onChange={() => setMethod('COD')} />
                <span><strong>Cash on Delivery</strong><br /><span className="muted">Pay in cash or UPI when your order arrives</span></span>
              </label>
            )}
          </div>
        </fieldset>
      </section>

      <OrderSummary quote={quote} loading={loading}>
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', fontSize: '.88rem' }}>
          {quote?.lines.map((l) => (
            <li key={l.variantId} className="summary-row" style={{ gap: 8 }}>
              <span>{l.productName} ({l.variantLabel}) × {l.quantity}</span>
              <span>{rupees(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        {quote?.problems.length > 0 && <p className="field-error">{quote.problems[0].reason} <Link href="/cart">Edit cart</Link></p>}
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={submitting || !quote || quote.problems.length > 0}>
          {submitting ? 'Placing order…' : method === 'COD' ? `Place order · ${quote ? rupees(quote.total) : ''}` : `Pay ${quote ? rupees(quote.total) : ''}`}
        </button>
        <p className="muted center" style={{ fontSize: '.8rem', marginTop: 10 }}>
          By placing the order you agree to our <Link href="/our-policies/terms-and-conditions">terms</Link>.
        </p>
      </OrderSummary>
    </form>
  );
}
