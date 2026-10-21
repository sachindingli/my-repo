'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminData } from '@/components/admin/AdminShell';
import { ORDER_STATUS_LABEL, formatDate, rupees } from '@/lib/format';

function OrdersList() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get('status') || '';
  const q = sp.get('q') || '';
  const page = Number(sp.get('page') || 1);
  const [search, setSearch] = useState(q);
  const qs = new URLSearchParams(Object.entries({ status, q, page: page > 1 ? String(page) : '' }).filter(([, v]) => v));
  const { data, error } = useAdminData(`/orders?${qs}`);

  const go = (next) => {
    const p = new URLSearchParams(Object.entries({ status, q, ...next }).filter(([, v]) => v));
    router.push(`/admin/orders?${p}`);
  };

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Orders</h1>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); go({ q: search, page: '' }); }}>
        <input className="input" placeholder="Search order no., name or phone" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        <select className="input" style={{ maxWidth: 200 }} value={status} onChange={(e) => go({ status: e.target.value, page: '' })} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-primary btn-sm">Search</button>
      </form>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {data?.rows.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                <td>{formatDate(o.createdAt)}</td>
                <td>{o.name}<br /><a href={`tel:${o.phone}`} className="muted">{o.phone}</a></td>
                <td>{o._count.items}</td>
                <td>{rupees(o.total)}</td>
                <td>{o.paymentMethod}<br /><span className={`pill pill-${o.paymentStatus}`}>{o.paymentStatus}</span></td>
                <td><span className={`pill pill-${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
              </tr>
            ))}
            {data && !data.rows.length && <tr><td colSpan={7} className="muted">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.pages > 1 && (
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}>← Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => go({ page: String(page + 1) })}>Next →</button>
        </div>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <OrdersList />
    </Suspense>
  );
}
