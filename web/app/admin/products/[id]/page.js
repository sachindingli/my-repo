'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdmin, useAdminData } from '@/components/admin/AdminShell';

/** Resize to max 1600px and re-encode as WebP so uploads are small and the shop stays fast. */
async function shrinkImage(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }) : file;
  } catch {
    return file;
  }
}

const EMPTY = {
  slug: '', name: '', nameHi: '', tagline: '', bullets: [], descriptionHtml: '', specs: [], metaTitle: '', metaDescription: '',
  isActive: true, isFeatured: false, categories: [], variants: [{ label: '', mrp: 0, price: 0, inStock: true, isDefault: true, images: [] }],
};

function VariantRow({ v, onChange, onRemove, onUpload, single }) {
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="variant-row">
      <div className="field"><label>Size label</label><input value={v.label} onChange={set('label')} placeholder="1 Litre" required /></div>
      <div className="field"><label>Price ₹</label><input type="number" min="1" value={v.price} onChange={set('price')} required /></div>
      <div className="field"><label>MRP ₹</label><input type="number" min="0" value={v.mrp} onChange={set('mrp')} /></div>
      <label className="check"><input type="checkbox" checked={v.inStock} onChange={set('inStock')} /> In stock</label>
      <label className="check"><input type="radio" name="default-variant" checked={v.isDefault} onChange={() => onChange({ ...v, isDefault: true }, true)} /> Default</label>
      {!single && <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}>Remove</button>}
      <div className="img-strip">
        {v.images.map((src, i) => (
          <figure key={src}>
            <img src={src} alt="" width={56} height={56} />
            <button type="button" aria-label="Remove photo" onClick={() => onChange({ ...v, images: v.images.filter((_, j) => j !== i) })}>×</button>
          </figure>
        ))}
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          + Photos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onUpload(e.target.files)} />
        </label>
      </div>
    </div>
  );
}

export default function ProductEditor({ params }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const { api } = useAdmin();
  const { data: loaded, error: loadError } = useAdminData(isNew ? '/categories' : `/products/${id}`);
  const { data: cats } = useAdminData('/categories');
  const [p, setP] = useState(isNew ? EMPTY : null);
  const [msg, setMsg] = useState({ ok: true, text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && loaded) setP({ ...loaded, nameHi: loaded.nameHi || '', tagline: loaded.tagline || '', metaTitle: loaded.metaTitle || '', metaDescription: loaded.metaDescription || '' });
  }, [loaded, isNew]);

  if (loadError) return <p className="alert alert-error">{loadError}</p>;
  if (!p) return <p>Loading…</p>;

  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setVariant = (i, v, makeDefault) =>
    setP({ ...p, variants: p.variants.map((x, j) => (j === i ? v : makeDefault ? { ...x, isDefault: false } : x)) });

  async function upload(i, files) {
    if (!files?.length) return;
    setMsg({ ok: true, text: 'Uploading photos…' });
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('files', await shrinkImage(file));
        const { urls } = await api('/uploads', { method: 'POST', body: fd, raw: true });
        setP((cur) => ({ ...cur, variants: cur.variants.map((x, j) => (j === i ? { ...x, images: [...x.images, ...urls] } : x)) }));
      }
      setMsg({ ok: true, text: 'Photos added. Remember to save the product.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ ok: true, text: '' });
    const body = {
      slug: p.slug, name: p.name, nameHi: p.nameHi || null, tagline: p.tagline || null,
      bullets: p.bullets.filter(Boolean), descriptionHtml: p.descriptionHtml, specs: p.specs.filter((s) => s.label && s.value),
      metaTitle: p.metaTitle || null, metaDescription: p.metaDescription || null, isActive: p.isActive, isFeatured: p.isFeatured,
      categories: p.categories,
      variants: p.variants.map((v) => ({ ...(v.id && { id: v.id }), label: v.label, mrp: Number(v.mrp) || Number(v.price), price: Number(v.price), inStock: v.inStock, isDefault: v.isDefault, images: v.images })),
    };
    try {
      const saved = await api(isNew ? '/products' : `/products/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      setMsg({ ok: true, text: 'Saved. The shop updates within a minute.' });
      if (isNew) router.replace(`/admin/products/${saved.id}`);
      else setP({ ...p, variants: saved.variants });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="form-grid">
      <p style={{ margin: 0 }}><Link href="/admin/products">← All products</Link></p>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{isNew ? 'New product' : p.name}</h1>
        {!isNew && <Link href={`/products/${p.slug}`} target="_blank">View in shop ↗</Link>}
      </div>

      <section className="panel form-grid">
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Sizes, prices &amp; stock</h2>
        {p.variants.map((v, i) => (
          <VariantRow
            key={v.id || `new-${i}`}
            v={v}
            single={p.variants.length === 1}
            onChange={(nv, makeDefault) => setVariant(i, nv, makeDefault)}
            onRemove={() => setP({ ...p, variants: p.variants.filter((_, j) => j !== i) })}
            onUpload={(files) => upload(i, files)}
          />
        ))}
        <div><button type="button" className="btn btn-outline btn-sm" onClick={() => setP({ ...p, variants: [...p.variants, { label: '', mrp: 0, price: 0, inStock: true, isDefault: false, images: [] }] })}>+ Add size</button></div>
      </section>

      <section className="panel form-grid two">
        <div className="field"><label htmlFor="pe-name">Name</label><input id="pe-name" value={p.name} onChange={set('name')} required /></div>
        <div className="field"><label htmlFor="pe-hi">Hindi name</label><input id="pe-hi" value={p.nameHi} onChange={set('nameHi')} lang="hi" /></div>
        <div className="field"><label htmlFor="pe-slug">URL <span className="hint">/products/…</span></label><input id="pe-slug" value={p.slug} onChange={set('slug')} required pattern="[a-z0-9-]+" /></div>
        <div className="field"><label htmlFor="pe-tag">Short tagline</label><input id="pe-tag" value={p.tagline} onChange={set('tagline')} /></div>
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 6 }}>Categories</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {cats?.map((c) => (
              <label key={c.slug} className="check">
                <input type="checkbox" checked={p.categories.includes(c.slug)} onChange={(e) => setP({ ...p, categories: e.target.checked ? [...p.categories, c.slug] : p.categories.filter((x) => x !== c.slug) })} /> {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <label className="check"><input type="checkbox" checked={p.isActive} onChange={set('isActive')} /> Show in shop</label>
          <label className="check"><input type="checkbox" checked={p.isFeatured} onChange={set('isFeatured')} /> Bestseller (homepage)</label>
        </div>
      </section>

      <section className="panel form-grid">
        <div className="field">
          <label htmlFor="pe-bullets">Key points <span className="hint">(one per line)</span></label>
          <textarea id="pe-bullets" rows={6} value={p.bullets.join('\n')} onChange={(e) => setP({ ...p, bullets: e.target.value.split('\n') })} />
        </div>
        <div className="field">
          <label htmlFor="pe-specs">Specifications <span className="hint">(one per line, “Label: value”)</span></label>
          <textarea
            id="pe-specs"
            rows={6}
            value={p.specs.map((s) => `${s.label}: ${s.value}`).join('\n')}
            onChange={(e) => setP({ ...p, specs: e.target.value.split('\n').map((l) => { const i = l.indexOf(':'); return i < 0 ? { label: l, value: '' } : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() }; }) })}
          />
        </div>
        <div className="field">
          <label htmlFor="pe-desc">Description <span className="hint">(HTML)</span></label>
          <textarea id="pe-desc" rows={10} value={p.descriptionHtml} onChange={set('descriptionHtml')} style={{ fontFamily: 'monospace', fontSize: '.85rem' }} />
        </div>
      </section>

      <section className="panel form-grid two">
        <div className="field"><label htmlFor="pe-mt">Google title <span className="hint">({p.metaTitle.length}/70)</span></label><input id="pe-mt" maxLength={70} value={p.metaTitle} onChange={set('metaTitle')} /></div>
        <div className="field"><label htmlFor="pe-md">Google description <span className="hint">({p.metaDescription.length}/170)</span></label><textarea id="pe-md" maxLength={170} value={p.metaDescription} onChange={set('metaDescription')} /></div>
      </section>

      {msg.text && <p className={`alert ${msg.ok ? 'alert-ok' : 'alert-error'}`} role="status">{msg.text}</p>}
      <div><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button></div>
    </form>
  );
}
