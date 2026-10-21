import { notFound } from 'next/navigation';
import { Breadcrumbs } from './ui';
import { getPage } from '@/lib/api';
import { lazyHtml } from '@/lib/format';

/** Renders an editable page (Our Story, policies) stored in the API. */
export default async function CmsPage({ slug, parent }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...(parent ? [parent] : []), { label: page.title }]} />
      <article className="section-tight prose">
        <h1>{page.title}</h1>
        <div className="rich" dangerouslySetInnerHTML={{ __html: lazyHtml(page.bodyHtml) }} />
      </article>
    </div>
  );
}

export async function cmsMetadata(slug, canonical) {
  const page = await getPage(slug);
  if (!page) return {};
  const text = page.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { title: page.title, description: text.slice(0, 155), alternates: { canonical } };
}
