import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumbs } from '@/components/ui';
import { getBlogs, imageUrl } from '@/lib/api';
import { formatDate } from '@/lib/format';

export const revalidate = 300;

export const metadata = {
  title: 'Blog – Ghee, Mustard Oil & Traditional Food',
  description: 'Guides from the Hitkram farm: A2 vs regular ghee, how bilona ghee is made, choosing a cooking oil and more.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage() {
  const posts = await getBlogs();
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} />
      <section className="section-tight">
        <h1>From the Hitkram farm</h1>
        <div className="blog-grid">
          {posts.map((p, i) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
              <div className="card-img">
                <Image src={p.coverUrl ? imageUrl(p.coverUrl) : '/brand/hero-bilona.webp'} alt="" fill style={{ objectFit: 'cover' }} sizes="(min-width: 1050px) 380px, (min-width: 700px) 50vw, 100vw" priority={i === 0} />
              </div>
              <div className="body">
                <time className="muted" style={{ fontSize: '.82rem' }} dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
