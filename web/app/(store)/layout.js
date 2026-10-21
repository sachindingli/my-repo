import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { JsonLd } from '@/components/ui';
import { SITE_URL, site } from '@/lib/site';

const organization = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  '@id': `${SITE_URL}/#business`,
  name: 'Hitkram',
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo.webp`,
  image: `${SITE_URL}/brand/hero-organic-living.webp`,
  telephone: '+919920093004',
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.line1,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
  sameAs: Object.values(site.social),
};

export default function StoreLayout({ children }) {
  return (
    <>
      <JsonLd data={organization} />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
