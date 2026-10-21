'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ORDER_STATUS_LABEL, formatDate, rupees } from '@/lib/format';
import { whatsappLink } from '@/lib/site';

const STEPS = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
export const LAST_ORDER_KEY = 'hitkram-last-order';

export async function fetchOrder(number, phone) {
  const res = await fetch(`/api/orders/track?${new URLSearchParams({ number, phone })}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || (data.fields ? Object.values(data.fields)[0] : 'Could not find the order.'));
  return data;
}

export function OrderDetails({ order }) {
  const reached = STEPS.indexOf(order.status);
  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="muted" style={{ fontSize: '.85rem' }}>Order number</div>
          <strong style={{ fontSize: '1.2rem' }}>{order.number}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted" style={{ fontSize: '.85rem' }}>Placed on {formatDate(order.createdAt)}</div>
          <span className={`pill pill-${order.status}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        </div>
      </div>
      {order.status === 'CANCELLED' ? (
        <p className="alert alert-error">This order was cancelled.</p>
      ) : (
        <ol className="timeline" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= reached ? 'done' : ''}>{ORDER_STATUS_LABEL[s]}</li>
          ))}
        </ol>
      )}
      {order.trackingUrl && (
        <p><a className="btn btn-outline btn-sm" href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Track with courier →</a></p>
      )}
      <table className="table" style={{ marginTop: 8 }}>
        <tbody>
          {order.items.map((i) => (
            <tr key={`${i.productName}-${i.variantLabel}`}>
              <td>{i.productName} ({i.variantLabel}) × {i.quantity}</td>
              <td style={{ textAlign: 'right' }}>{rupees(i.lineTotal)}</td>
            </tr>
          ))}
          <tr><td>Shipping</td><td style={{ textAlign: 'right' }}>{order.shipping ? rupees(order.shipping) : 'Free'}</td></tr>
          <tr><th>Total ({order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentStatus === 'PAID' ? 'Paid online' : 'Online'})</th><th style={{ textAlign: 'right' }}>{rupees(order.total)}</th></tr>
        </tbody>
      </table>
    </div>
  );
}

export function OrderSuccess({ number }) {
  const [order, setOrder] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null');
    } catch {
      /* ignore */
    }
    if (!saved || saved.number !== number) {
      setFailed(true);
      return;
    }
    fetchOrder(saved.number, saved.phone).then(setOrder).catch(() => setFailed(true));
  }, [number]);

  return (
    <div className="prose section-tight">
      <div className="center">
        <div style={{ fontSize: '3rem' }} aria-hidden="true">✅</div>
        <h1>Thank you! Your order is placed.</h1>
        <p className="muted">
          Order <strong>{number}</strong>. We will call or WhatsApp you to confirm, and dispatch within 3 working days.
        </p>
      </div>
      {order && <OrderDetails order={order} />}
      {failed && <p className="center">You can check the status any time on the <Link href="/track-order">track order</Link> page.</p>}
      <p className="center" style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/products" className="btn btn-primary">Continue shopping</Link>
        <a className="btn btn-outline" href={whatsappLink(`Hi Hitkram, my order number is ${number}`)} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
      </p>
    </div>
  );
}

export function TrackOrder() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      setOrder(await fetchOrder(f.number.trim(), f.phone));
    } catch (err) {
      setOrder(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="prose section-tight">
      <h1>Track your order</h1>
      <p className="muted">Enter the order number from your confirmation and the mobile number you ordered with.</p>
      <form onSubmit={submit} className="panel form-grid two" style={{ alignItems: 'end' }}>
        <div className="field">
          <label htmlFor="tr-number">Order number</label>
          <input id="tr-number" name="number" placeholder="HK2610211234" required autoCapitalize="characters" />
        </div>
        <div className="field">
          <label htmlFor="tr-phone">Mobile number</label>
          <input id="tr-phone" name="phone" type="tel" inputMode="numeric" required autoComplete="tel-national" />
        </div>
        <div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Track order'}</button>
        </div>
      </form>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {order && <div style={{ marginTop: 16 }}><OrderDetails order={order} /></div>}
    </div>
  );
}
