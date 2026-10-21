import { notFound } from 'next/navigation';
import CmsPage, { cmsMetadata } from '@/components/CmsPage';

export const revalidate = 300;

const POLICIES = ['terms-and-conditions', 'privacy-and-policy', 'refund-and-cancellation', 'shipping-and-delivery'];

export function generateStaticParams() {
  return POLICIES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return POLICIES.includes(slug) ? cmsMetadata(slug, `/our-policies/${slug}`) : {};
}

export default async function PolicyPage({ params }) {
  const { slug } = await params;
  if (!POLICIES.includes(slug)) notFound();
  return <CmsPage slug={slug} />;
}
