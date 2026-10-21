'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useAdmin, useAdminData } from '@/components/admin/AdminShell';
import { ORDER_STATUS_LABEL, formatDate, rupees } from '@/lib/format';

export default function OrderDetail({ params }) {
  const { id } = use(params);
  const { api } = useAdmin();
  const { data: o, error, setData } = useAdminData(`/orders/${id}`);
  const [msg, setMsg] = useState('');

  async function save(patch) {
    setMsg('');
    try {
      setData(await api(`/orders/${id}`, { method: 'PATCH', body: patch }));
      setMsg('Saved.');
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!o) return <p>Loading…</p>;
  const waText = encodeURIComponent(`Namaste ${o.name}, your Hitkram order ${o.number} (${rupees(o.total)}) is ${ORDER_STATUS_LABEL[o.status].toLowerCase()}.${o.trackingUrl ? ` Track it here: ${o.trackingUrl}` : ''} Thank you!`);

  return (
    <>
      <p><Link href="/admin/orders">← All orders</Link></p>
      <h1 style={{ fontSize: '1.5rem' }}>Order {o.number}</h1>
      <p className="muted">Placed {formatDate(o.createdAt)} · {o.paymentMethod} · <span className={`pill pill-${o.paymentStatus}`}>{o.paymentStatus}</span></p>
      <div className="form-grid two">
        <div className="panel">
          <h2 style={{ fontSize: '1.1rem' }}>Customer</h2>
          <p style={{ margin: 0 }}>
            <strong>{o.name}</strong><br />
            <a href={`tel:${o.phone}`}>{o.phone}</a>{o.email && <> · <a href={`mailto:${o.email}`}>{o.email}</a></>}<br />
            {o.address1}{o.address2 && <>, {o.address2}</>}<br />
            {o.city}, {o.state} – {o.pincode}
          </p>
          {o.notes && <p className="alert alert-info" style={{ marginBottom: 0 }}>Note: {o.notes}</p>}
          <p style={{ marginTop: 12 }}>
            <a className="btn btn-outline btn-sm" href={`https://wa.me/91${o.phone}?text=${waText}`} target="_blank" rel="noopener noreferrer">Send status on WhatsApp</a>
          </p>
        </div>
        <div className="panel form-grid">
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Update</h2>
          <div className="field">
            <label htmlFor="o-status">Order status</label>
            <select id="o-status" value={o.status} onChange={(e) => save({ status: e.target.value })}>
              {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="o-pay">Payment</label>
            <select id="o-pay" value={o.paymentStatus} onChange={(e) => save({ paymentStatus: e.target.value })}>
              {['UNPAID', 'PAID', 'FAILED', 'REFUNDED'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <form className="field" onSubmit={(e) => { e.preventDefault(); save({ trackingUrl: new FormData(e.currentTarget).get('t') }); }}>
            <label htmlFor="o-track">Courier tracking link</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="o-track" name="t" defaultValue={o.trackingUrl || ''} placeholder="https://…" />
              <button className="btn btn-primary btn-sm">Save</button>
            </div>
          </form>
          {msg && <p className={`alert ${msg === 'Saved.' ? 'alert-ok' : 'alert-error'}`} role="status" style={{ margin: 0 }}>{msg}</p>}
        </div>
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id}><td>{i.productName} ({i.variantLabel})</td><td>{rupees(i.unitPrice)}</td><td>{i.quantity}</td><td style={{ textAlign: 'right' }}>{rupees(i.lineTotal)}</td></tr>
            ))}
            <tr><td colSpan={3}>Shipping</td><td style={{ textAlign: 'right' }}>{rupees(o.shipping)}</td></tr>
            <tr><th colSpan={3}>Total</th><th style={{ textAlign: 'right' }}>{rupees(o.total)}</th></tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 16 }}><button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print packing slip</button></p>
    </>
  );
}
