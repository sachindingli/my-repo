'use client';

import Link from 'next/link';
import { useAdminData } from '@/components/admin/AdminShell';
import { ORDER_STATUS_LABEL, formatDate, rupees } from '@/lib/format';

export default function Dashboard() {
  const { data: stats, error } = useAdminData('/stats');
  const { data: recent } = useAdminData('/orders');

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Dashboard</h1>
      {error && <p className="alert alert-error">{error}</p>}
      {stats && (
        <div className="stat-grid">
          <div className="stat"><span className="muted">Today’s orders</span><b>{stats.today.orders}</b>{rupees(stats.today.revenue)}</div>
          <div className="stat"><span className="muted">All orders</span><b>{stats.allTime.orders}</b>{rupees(stats.allTime.revenue)}</div>
          <Link className="stat" href="/admin/orders?status=PLACED" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="muted">To confirm / ship</span><b>{stats.ordersToShip}</b>open orders →
          </Link>
          <Link className="stat" href="/admin/reviews" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="muted">Reviews waiting</span><b>{stats.pendingReviews}</b>approve →
          </Link>
          <Link className="stat" href="/admin/products" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="muted">Sizes out of stock</span><b>{stats.outOfStockSizes}</b>update stock →
          </Link>
        </div>
      )}
      <h2 style={{ fontSize: '1.2rem', marginTop: 28 }}>Latest orders</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {recent?.rows.slice(0, 10).map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                <td>{formatDate(o.createdAt)}</td>
                <td>{o.name}<br /><span className="muted">{o.city}</span></td>
                <td>{rupees(o.total)}</td>
                <td>{o.paymentMethod} <span className={`pill pill-${o.paymentStatus}`}>{o.paymentStatus}</span></td>
                <td><span className={`pill pill-${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
              </tr>
            ))}
            {recent && !recent.rows.length && <tr><td colSpan={6} className="muted">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
