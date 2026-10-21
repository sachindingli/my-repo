'use client';

import { useState } from 'react';
import { useAdmin, useAdminData } from '@/components/admin/AdminShell';
import { formatDate } from '@/lib/format';

export default function ReviewsAdmin() {
  const { api } = useAdmin();
  const [status, setStatus] = useState('PENDING');
  const { data, error, setData } = useAdminData(`/reviews?status=${status}`);
  const [msg, setMsg] = useState('');

  async function act(r, next) {
    try {
      if (next === 'DELETE') await api(`/reviews/${r.id}`, { method: 'DELETE' });
      else await api(`/reviews/${r.id}`, { method: 'PATCH', body: { status: next } });
      setData(data.filter((x) => x.id !== r.id));
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Reviews</h1>
      <div className="toolbar" role="tablist">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatus(s)}>
            {s === 'PENDING' ? 'Waiting' : s === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>
      {(error || msg) && <p className="alert alert-error">{error || msg}</p>}
      <div className="review-list">
        {data?.map((r) => (
          <article key={r.id} className="review">
            <div className="review-head">
              <span><strong>{r.name}</strong> · {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.product.name}</span>
              <span className="muted">{formatDate(r.createdAt)}</span>
            </div>
            <p>{r.body}</p>
            <div className="toolbar" style={{ marginTop: 10, marginBottom: 0 }}>
              {status !== 'APPROVED' && <button type="button" className="btn btn-primary btn-sm" onClick={() => act(r, 'APPROVED')}>Approve</button>}
              {status !== 'REJECTED' && <button type="button" className="btn btn-outline btn-sm" onClick={() => act(r, 'REJECTED')}>Reject</button>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirm('Delete this review permanently?') && act(r, 'DELETE')}>Delete</button>
            </div>
          </article>
        ))}
        {data && !data.length && <p className="muted">Nothing here.</p>}
      </div>
    </>
  );
}
