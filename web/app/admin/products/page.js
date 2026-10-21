'use client';

import Link from 'next/link';
import { useAdminData } from '@/components/admin/AdminShell';
import { rupees } from '@/lib/format';

export default function ProductsAdmin() {
  const { data, error } = useAdminData('/products');
  return (
    <>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">+ Add product</Link>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Product</th><th>Sizes · price · stock</th><th>Shown</th></tr></thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`}><strong>{p.name}</strong></Link><br />
                  <span className="muted">{p.categories.join(', ')}</span>
                </td>
                <td>
                  {p.variants.map((v) => (
                    <div key={v.id}>
                      {v.label}: {rupees(v.price)} <span className="muted">(MRP {rupees(v.mrp)})</span>{' '}
                      {!v.inStock && <span className="pill pill-CANCELLED">Out of stock</span>}
                    </div>
                  ))}
                </td>
                <td>{p.isActive ? 'Yes' : <span className="pill">Hidden</span>}{p.isFeatured && <><br /><span className="pill pill-PAID">Bestseller</span></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
