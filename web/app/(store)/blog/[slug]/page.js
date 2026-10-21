import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Breadcrumbs, JsonLd } from '@/components/ui';
import { getBlog, getBlogs, imageUrl } from '@/lib/api';
import { formatDate, lazyHtml } from '@/lib/format';
import { SITE_URL, absoluteUrl } from '@/lib/site';

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getBlogs()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlog(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.excerpt, images: post.coverUrl ? [absoluteUrl(post.coverUrl)] : [] },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlog(slug);
  if (!post) notFound();
  return (
    <div className="container">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          image: post.coverUrl ? [absoluteUrl(post.coverUrl)] : undefined,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: { '@type': 'Organization', name: 'Hitkram' },
          publisher: { '@id': `${SITE_URL}/#business` },
          mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        }}
      />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title }]} />
      <article className="section-tight prose">
        <h1>{post.title}</h1>
        <p className="muted"><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · Hitkram</p>
        {post.coverUrl && <Image src={imageUrl(post.coverUrl)} alt="" width={1200} height={675} sizes="(min-width: 800px) 760px, 100vw" priority />}
        <div className="rich" dangerouslySetInnerHTML={{ __html: lazyHtml(post.bodyHtml) }} />
        <div className="panel" style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '1.2rem' }}>Taste the difference</h2>
          <p>Our bilona A2 desi cow ghee is made on our farm in Rajasthan and delivered across India.</p>
          <Link href="/products/a2-desi-cow-bilona-ghee" className="btn btn-primary">Shop A2 Ghee</Link>
        </div>
      </article>
    </div>
  );
}
