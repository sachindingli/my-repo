import CmsPage, { cmsMetadata } from '@/components/CmsPage';

export const revalidate = 300;
export const generateMetadata = () => cmsMetadata('our-story', '/our-story');

export default function OurStoryPage() {
  return <CmsPage slug="our-story" />;
}
