'use client';

import { useState } from 'react';
import { useAdmin, useAdminData } from '@/components/admin/AdminShell';

function Editor({ item, kind, onSaved, onCancel }) {
  const { api } = useAdmin();
  const [form, setForm] = useState(item);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e) {
    e.preventDefault();
    try {
      const saved =
        kind === 'page'
          ? await api(`/pages/${form.slug}`, { method: 'PUT', body: { title: form.title, bodyHtml: form.bodyHtml } })
          : await api(form.id ? `/blogs/${form.id}` : '/blogs', {
              method: form.id ? 'PUT' : 'POST',
              body: { slug: form.slug, title: form.title, excerpt: form.excerpt, coverUrl: form.coverUrl || null, bodyHtml: form.bodyHtml, isPublished: form.isPublished },
            });
      onSaved(saved);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <form onSubmit={save} className="panel form-grid" style={{ marginTop: 16 }}>
      <div className="form-grid two">
        <div className="field"><label htmlFor="ce-title">Title</label><input id="ce-title" value={form.title} onChange={set('title')} required /></div>
        {kind === 'blog' && <div className="field"><label htmlFor="ce-slug">URL <span className="hint">/blog/…</span></label><input id="ce-slug" value={form.slug} onChange={set('slug')} required pattern="[a-z0-9-]+" /></div>}
        {kind === 'blog' && <div className="field"><label htmlFor="ce-cover">Cover image URL</label><input id="ce-cover" value={form.coverUrl || ''} onChange={set('coverUrl')} placeholder="/uploads/…" /></div>}
        {kind === 'blog' && <div className="field"><label htmlFor="ce-ex">Summary</label><input id="ce-ex" value={form.excerpt} onChange={set('excerpt')} maxLength={300} /></div>}
      </div>
      <div className="field">
        <label htmlFor="ce-body">Content <span className="hint">(HTML)</span></label>
        <textarea id="ce-body" rows={16} value={form.bodyHtml} onChange={set('bodyHtml')} style={{ fontFamily: 'monospace', fontSize: '.85rem' }} required />
      </div>
      {kind === 'blog' && <label className="check"><input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} /> Published</label>}
      {msg && <p className="alert alert-error">{msg}</p>}
      <div className="toolbar" style={{ margin: 0 }}>
        <button className="btn btn-primary">Save</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function ContentAdmin() {
  const pages = useAdminData('/pages');
  const blogs = useAdminData('/blogs');
  const [editing, setEditing] = useState(null);

  const done = () => {
    setEditing(null);
    pages.reload();
    blogs.reload();
  };

  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Pages &amp; blog</h1>
      {editing && <Editor key={`${editing.kind}-${editing.item.id ?? 'new'}`} {...editing} onSaved={done} onCancel={() => setEditing(null)} />}
      <h2 style={{ fontSize: '1.15rem', marginTop: 24 }}>Pages</h2>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {pages.data?.map((p) => (
              <tr key={p.slug}><td>{p.title}</td><td style={{ textAlign: 'right' }}><button className="btn btn-outline btn-sm" onClick={() => setEditing({ kind: 'page', item: p })}>Edit</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 24 }}>
        <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Blog posts</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ kind: 'blog', item: { slug: '', title: '', excerpt: '', coverUrl: '', bodyHtml: '', isPublished: true } })}>+ New post</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {blogs.data?.map((b) => (
              <tr key={b.id}>
                <td>{b.title}{!b.isPublished && <> <span className="pill">Draft</span></>}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-outline btn-sm" onClick={() => setEditing({ kind: 'blog', item: b })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
