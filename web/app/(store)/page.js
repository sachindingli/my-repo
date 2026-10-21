import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import { JsonLd, Stars } from '@/components/ui';
import { getCategories, getProduct, getProducts, imageUrl } from '@/lib/api';
import { rupees } from '@/lib/format';
import { site, whatsappLink } from '@/lib/site';

export const revalidate = 60;

const CATEGORY_IMAGES = {
  'a2-desi-cow-ghee': '/brand/cat-a2-ghee.webp',
  'buffalo-bilona-ghee': '/brand/cat-buffalo-ghee.webp',
  'cold-pressed-oil': '/brand/cat-mustard-oil.webp',
  pickle: '/brand/cat-pickle.webp',
};

const VALUES = [
  { img: '/brand/value-authenticity.png', title: 'Straight from our farm', text: 'Made with milk from our own animals in Deengli, Rajasthan.' },
  { img: '/brand/value-tradition.png', title: 'Traditional bilona', text: 'Curd is hand-churned into butter, then slow-cooked into ghee.' },
  { img: '/brand/value-honesty.png', title: 'Lab tested', text: 'Every batch is tested for purity before it reaches you.' },
  { img: '/brand/value-purpose.png', title: 'Rural jobs', text: 'We employ people from our village and pay farmers fairly.' },
];

// TODO(owner): review these answers; they are based on the current site's policies.
const FAQS = [
  {
    q: 'What is bilona ghee?',
    a: 'Bilona is the traditional way of making ghee. Whole milk is set into curd, the curd is hand-churned into makkhan (butter), and the butter is slowly heated into ghee. It takes much more milk than cream-based ghee, which is why it tastes richer and costs more.',
  },
  {
    q: 'Do you offer Cash on Delivery?',
    a: 'Yes. You can pay with Cash on Delivery, or pay online with UPI, cards or net banking where available at checkout.',
  },
  {
    q: 'How much is shipping and how long does delivery take?',
    a: `Shipping is free on orders above ${rupees(site.freeShippingMin)}. In-stock orders are packed and dispatched within 3 working days, and we share tracking details as soon as your parcel leaves the farm.`,
  },
  {
    q: 'Why is my ghee grainy, or sometimes liquid?',
    a: 'Granules (dana) are a natural sign of slow-cooked bilona ghee. Whether ghee is solid or liquid depends on the room temperature and how it was stored, not on its purity.',
  },
  {
    q: 'How should I store ghee and pickles?',
    a: 'Keep the jar tightly closed in a cool, dry place away from sunlight. Always use a clean, dry spoon. Ghee does not need a fridge.',
  },
  {
    q: 'Can I return or cancel an order?',
    a: 'Please see our refund and cancellation policy, or message us on WhatsApp and we will help you quickly.',
  },
];

export default async function HomePage() {
  const [featured, categories, all, ghee] = await Promise.all([
    getProducts({ featured: 'true' }),
    getCategories(),
    getProducts(),
    getProduct('a2-desi-cow-bilona-ghee'),
  ]);
  const productImage = (slug) => all.find((p) => p.categories.includes(slug))?.image;
  const reviews = (ghee?.reviews || []).filter((r) => r.body.length > 40).slice(0, 3);
  const totalReviews = all.reduce((s, p) => s + p.rating.count, 0);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">From our farm in Deengli, Rajasthan</p>
            <h1>Pure bilona A2 ghee, made the way our mother makes it</h1>
            <p className="lead">
              Hand-churned A2 desi cow ghee, buffalo ghee, kachi ghani mustard oil, homemade pickles and raw honey.
              Made in small batches, packed in glass, delivered across India.
            </p>
            <div className="hero-cta">
              <Link href="/products/a2-desi-cow-bilona-ghee" className="btn btn-primary">Shop A2 Ghee</Link>
              <Link href="/products" className="btn btn-outline">See all products</Link>
            </div>
            <ul className="hero-points">
              <li>Cash on Delivery</li>
              <li>Free shipping over {rupees(site.freeShippingMin)}</li>
              <li>{totalReviews}+ happy reviews</li>
            </ul>
          </div>
          <div className="hero-media">
            <Image
              src="/brand/hero-organic-living.webp"
              alt="Hitkram A2 desi cow ghee, buffalo ghee and mustard oil jars"
              width={1200}
              height={1600}
              sizes="(min-width: 900px) 420px, 92vw"
              priority
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container trust">
          <div><strong>Bilona method</strong>Hand-churned from curd</div>
          <div><strong>Lab tested</strong>Every batch checked</div>
          <div><strong>Glass jars</strong>Plastic-free packing</div>
          <div><strong>Pan-India delivery</strong>COD available</div>
        </div>
      </section>

      <section className="section" aria-labelledby="cat-h">
        <div className="container">
          <div className="section-head"><h2 id="cat-h">Shop by category</h2></div>
          <div className="cat-grid">
            {categories.map((c) => {
              const src = CATEGORY_IMAGES[c.slug] || productImage(c.slug);
              return (
                <Link key={c.slug} href={`/category/${c.slug}`} className="cat-tile">
                  <div className="cat-img">
                    {src && (
                      <Image
                        src={src.startsWith('/brand') ? src : imageUrl(src)}
                        alt=""
                        width={300}
                        height={300}
                        sizes="(min-width: 900px) 180px, 31vw"
                      />
                    )}
                  </div>
                  <span>{c.name}</span>
                  <small lang="hi">{c.nameHi}</small>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="best-h">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Customer favourites</p>
              <h2 id="best-h">Bestsellers</h2>
            </div>
            <Link href="/products">View all products →</Link>
          </div>
          <div className="grid-products">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="why-h" style={{ background: 'var(--green-50)' }}>
        <div className="container">
          <div className="section-head"><h2 id="why-h">Why families choose Hitkram</h2></div>
          <div className="values">
            {VALUES.map((v) => (
              <div className="value" key={v.title}>
                <Image src={v.img} alt="" width={56} height={56} />
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
          <p className="center" style={{ marginTop: 20 }}>
            <Link href="/our-story" className="btn btn-outline">Read our story</Link>
          </p>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section" aria-labelledby="rev-h">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Real customers</p>
                <h2 id="rev-h">What our customers say</h2>
              </div>
              {ghee && <Stars value={ghee.rating.average} count={ghee.rating.count} />}
            </div>
            <div className="quote-grid">
              {reviews.map((r) => (
                <figure className="review" key={r.id} style={{ margin: 0 }}>
                  <Stars value={r.rating} />
                  <blockquote style={{ margin: '8px 0' }}><p>{r.body}</p></blockquote>
                  <figcaption><strong>{r.name}</strong>{r.verified && <span className="verified"> · Verified buyer</span>}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section faq" aria-labelledby="faq-h">
        <div className="container" style={{ maxWidth: 820 }}>
          <h2 id="faq-h" className="center">Frequently asked questions</h2>
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
          <p className="center muted" style={{ marginTop: 16 }}>
            Still have a question? <a href={whatsappLink('Hi Hitkram, I have a question')} target="_blank" rel="noopener noreferrer">Ask us on WhatsApp</a>
          </p>
        </div>
      </section>
    </>
  );
}
