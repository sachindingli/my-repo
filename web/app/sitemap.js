import { getSitemapData } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap() {
  const data = await getSitemapData();
  const url = (p) => `${SITE_URL}${p}`;
  const fixed = ['/', '/products', '/our-story', '/blog', '/contact-us', '/track-order'].map((p) => ({
    url: url(p),
    changeFrequency: p === '/' || p === '/products' ? 'daily' : 'monthly',
    priority: p === '/' ? 1 : 0.6,
  }));
  return [
    ...fixed,
    ...data.categories.map((c) => ({ url: url(`/category/${c.slug}`), changeFrequency: 'weekly', priority: 0.8 })),
    ...data.products.map((p) => ({ url: url(`/products/${p.slug}`), lastModified: p.updatedAt, changeFrequency: 'weekly', priority: 0.9 })),
    ...data.posts.map((p) => ({ url: url(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: 'monthly', priority: 0.5 })),
    ...data.pages
      .filter((p) => p.slug !== 'our-story')
      .map((p) => ({ url: url(`/our-policies/${p.slug}`), lastModified: p.updatedAt, changeFrequency: 'yearly', priority: 0.2 })),
  ];
}
