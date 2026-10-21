import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { Breadcrumbs } from '@/components/ui';
import { getCategories, getProducts } from '@/lib/api';

export const revalidate = 60;

const INTRO = {
  'a2-desi-cow-ghee': 'Bilona A2 desi cow ghee, hand-churned from curd made with milk from our farm cows. Packed in glass jars, from 200 ml to 5 litres.',
  'buffalo-bilona-ghee': 'Rich, grainy buffalo ghee made with the traditional bilona method from curd, never from cream.',
  'cold-pressed-oil': 'Kachi ghani black mustard oil, cold pressed and unrefined, with its natural pungency and aroma.',
  pickle: 'Homemade Rajasthani pickles made in small batches with mustard oil and spices ground on the farm.',
  honey: 'Raw forest honey: unheated, unprocessed and with nothing added.',
  'combo-pack': 'Our kitchen staples together, at a better price.',
};

async function category(slug) {
  const cats = await getCategories();
  return { cats, cat: cats.find((c) => c.slug === slug) };
}

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { cat } = await category(slug);
  if (!cat) return {};
  return { title: `${cat.name} – Buy Online`, description: INTRO[slug], alternates: { canonical: `/category/${slug}` } };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const { cats, cat } = await category(slug);
  if (!cat) notFound();
  const products = await getProducts({ category: slug });

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Products', href: '/products' }, { label: cat.name }]} />
      <section className="section-tight">
        <h1>{cat.name} <span lang="hi" className="muted" style={{ fontSize: '.6em', fontWeight: 400 }}>{cat.nameHi}</span></h1>
        {INTRO[slug] && <p className="muted" style={{ maxWidth: 680 }}>{INTRO[slug]}</p>}
        <nav aria-label="Categories" className="toolbar">
          <Link href="/products" className="btn btn-sm btn-outline">All</Link>
          {cats.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className={`btn btn-sm ${c.slug === slug ? 'btn-primary' : 'btn-outline'}`} aria-current={c.slug === slug ? 'page' : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="grid-products">
          {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)}
        </div>
      </section>
    </div>
  );
}
