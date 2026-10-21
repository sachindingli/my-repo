'use client';

import { useState } from 'react';

export default function ReviewForm({ slug }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle', message: '', fields: {} });

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ status: 'sending', message: '', fields: {} });
    try {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name'), rating: Number(form.get('rating')), body: form.get('body') }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: 'error', message: res.status === 429 ? 'Too many reviews from this connection. Please try later.' : data.error, fields: data.fields || {} });
        return;
      }
      setState({ status: 'done', message: data.message, fields: {} });
    } catch {
      setState({ status: 'error', message: 'Network error. Please try again.', fields: {} });
    }
  }

  if (state.status === 'done') return <p className="alert alert-ok" role="status">{state.message}</p>;
  if (!open) {
    return <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>Write a review</button>;
  }

  return (
    <form onSubmit={submit} className="panel form-grid" noValidate style={{ maxWidth: 560 }}>
      <h3 style={{ margin: 0 }}>Write a review</h3>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Your rating</legend>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="check">
              <input type="radio" name="rating" value={n} defaultChecked={n === 5} /> {n} ★
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="rv-name">Your name</label>
        <input id="rv-name" name="name" required minLength={2} maxLength={60} aria-invalid={Boolean(state.fields.name)} />
        {state.fields.name && <div className="field-error">{state.fields.name}</div>}
      </div>
      <div className="field">
        <label htmlFor="rv-body">Your review</label>
        <textarea id="rv-body" name="body" required minLength={5} maxLength={1000} aria-invalid={Boolean(state.fields.body)} />
        {state.fields.body && <div className="field-error">{state.fields.body}</div>}
      </div>
      {state.status === 'error' && state.message && <p className="alert alert-error" role="alert">{state.message}</p>}
      <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>We only show your name. Reviews appear after a quick check.</p>
      <div>
        <button type="submit" className="btn btn-primary" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? 'Sending…' : 'Submit review'}
        </button>
      </div>
    </form>
  );
}
