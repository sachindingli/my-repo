import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import ProductView from '@/components/ProductView';
import ProductCard from '@/components/ProductCard';
import ReviewForm from '@/components/ReviewForm';
import { Breadcrumbs, JsonLd, Stars } from '@/components/ui';
import { API_BASE, getLegacyProduct, getProduct, getProducts } from '@/lib/api';
import { formatDate, lazyHtml } from '@/lib/format';
import { SITE_URL, absoluteUrl } from '@/lib/site';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

async function load(slug) {
  const product = await getProduct(slug);
  if (product) return product;
  // Old hitkram.com URLs listed each size separately, e.g. /products/a2-desi-cow-ghee-1-liter.
  const legacy = await getLegacyProduct(slug);
  if (legacy) permanentRedirect(`/products/${legacy.productSlug}?size=${legacy.variantSku}`);
  notFound();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const v = p.variants.find((x) => x.isDefault) || p.variants[0];
  return {
    title: p.name,
    description: p.metaDescription,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: 'website', title: p.name, description: p.metaDescription, url: `/products/${p.slug}`, images: v?.images[0] ? [absoluteUrl(v.images[0])] : [] },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const p = await load(slug);
  const url = `${SITE_URL}/products/${p.slug}`;
  const category = p.categories[0];
  const allImages = [...new Set(p.variants.flatMap((v) => v.images))].slice(0, 8).map(absoluteUrl);
  const prices = p.variants.map((v) => v.price);
  const reviewsShown = p.reviews.slice(0, 8);
  const reviewsMore = p.reviews.slice(8);

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.metaDescription,
    image: allImages,
    brand: { '@type': 'Brand', name: 'Hitkram' },
    sku: (p.variants.find((v) => v.isDefault) || p.variants[0]).sku,
    url,
    ...(p.rating.count > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating.average, reviewCount: p.rating.count, bestRating: 5, worstRating: 1 },
      review: p.reviews.slice(0, 5).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.name },
        datePublished: r.createdAt.slice(0, 10),
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
        reviewBody: r.body,
      })),
    }),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: p.variants.length,
      offers: p.variants.map((v) => ({
        '@type': 'Offer',
        name: `${p.name} ${v.label}`,
        sku: v.sku,
        price: v.price,
        priceCurrency: 'INR',
        availability: v.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        url: `${url}?size=${v.sku}`,
      })),
    },
  };

  const crumbs = [
    { label: 'Home', href: '/' },
    ...(category ? [{ label: category.name, href: `/category/${category.slug}` }] : []),
    { label: p.name },
  ];

  return (
    <div className="container">
      <JsonLd data={productLd} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, ...(c.href && { item: `${SITE_URL}${c.href}` }) })),
        }}
      />
      <Breadcrumbs items={crumbs} />
      <Suspense fallback={<ProductView product={p} apiUrl={API_BASE} />}>
        <ProductView product={p} apiUrl={API_BASE} readSizeFromUrl />
      </Suspense>

      <nav className="tabs" aria-label="Product sections">
        {p.descriptionHtml && <a href="#details">Details</a>}
        {p.specs.length > 0 && <a href="#specs">Specifications</a>}
        <a href="#reviews">Reviews ({p.rating.count})</a>
      </nav>

      {p.descriptionHtml && (
        <section id="details" className="section rich" aria-label="Product details">
          <div dangerouslySetInnerHTML={{ __html: lazyHtml(p.descriptionHtml) }} />
        </section>
      )}

      {p.specs.length > 0 && (
        <section id="specs" className="section-tight" aria-labelledby="specs-h">
          <h2 id="specs-h">Specifications</h2>
          <table className="spec-table">
            <tbody>
              {p.specs.map((s) => (
                <tr key={s.label}><th scope="row">{s.label}</th><td>{s.value}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section id="reviews" className="section" aria-labelledby="reviews-h">
        <h2 id="reviews-h">Customer reviews</h2>
        <div className="review-summary">
          <div>
            <div className="review-avg">{p.rating.count ? p.rating.average.toFixed(1) : '–'}</div>
            <Stars value={p.rating.average} />
            <div className="muted" style={{ fontSize: '.88rem' }}>{p.rating.count} reviews</div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const c = p.ratingBreakdown[n] || 0;
              const pct = p.rating.count ? Math.round((c / p.rating.count) * 100) : 0;
              return (
                <div className="bar-row" key={n}>
                  <span>{n} ★</span>
                  <div className="bar" role="img" aria-label={`${pct}% gave ${n} stars`}><span style={{ width: `${pct}%` }} /></div>
                  <span className="muted">{c}</span>
                </div>
              );
            })}
          </div>
          <ReviewForm slug={p.slug} />
        </div>
        {p.reviews.length > 0 ? (
          <div className="review-list">
            {reviewsShown.map((r) => <ReviewItem key={r.id} r={r} />)}
            {reviewsMore.length > 0 && (
              <details>
                <summary className="btn btn-outline" style={{ listStyle: 'none' }}>Show {reviewsMore.length} more reviews</summary>
                <div className="review-list">{reviewsMore.map((r) => <ReviewItem key={r.id} r={r} />)}</div>
              </details>
            )}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 16 }}>No reviews yet. Be the first to review this product.</p>
        )}
      </section>

      {p.related.length > 0 && (
        <section className="section" aria-labelledby="related-h">
          <h2 id="related-h">You may also like</h2>
          <div className="grid-products">
            {p.related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewItem({ r }) {
  return (
    <article className="review">
      <div className="review-head">
        <div>
          <strong>{r.name}</strong>
          {r.verified && <span className="verified"> · ✓ Verified buyer</span>}
        </div>
        <time className="muted" dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
      </div>
      <Stars value={r.rating} />
      <p>{r.body}</p>
    </article>
  );
}
