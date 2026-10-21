import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { Breadcrumbs } from '@/components/ui';
import { getCategories, getProducts } from '@/lib/api';

export const revalidate = 60;

export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  return q
    ? { title: `Search: ${q}`, robots: { index: false } }
    : {
        title: 'All Products – A2 Ghee, Buffalo Ghee, Mustard Oil, Pickles & Honey',
        description: 'Shop all Hitkram farm products: bilona A2 desi cow ghee, buffalo ghee, kachi ghani mustard oil, homemade pickles, raw honey and combo packs.',
        alternates: { canonical: '/products' },
      };
}

export default async function ProductsPage({ searchParams }) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim().slice(0, 60) : '';
  const [products, categories] = await Promise.all([getProducts({ q: query }), getCategories()]);

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: query ? 'Search' : 'All products' }]} />
      <section className="section-tight">
        <h1>{query ? `Results for “${query}”` : 'All products'}</h1>
        <nav aria-label="Categories" className="toolbar" style={{ marginTop: 8 }}>
          <Link href="/products" className="btn btn-sm btn-primary">All</Link>
          {categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="btn btn-sm btn-outline">{c.name}</Link>
          ))}
        </nav>
        {products.length ? (
          <div className="grid-products">
            {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)}
          </div>
        ) : (
          <div className="empty">
            <p>No products match “{query}”.</p>
            <Link className="btn btn-primary" href="/products">See all products</Link>
          </div>
        )}
      </section>
    </div>
  );
}
