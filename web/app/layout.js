import { Jost } from 'next/font/google';
import { CartProvider } from '@/components/CartProvider';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const jost = Jost({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-body' });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Hitkram | Farm-made A2 Desi Cow Ghee, Mustard Oil, Pickles & Honey', template: '%s | Hitkram' },
  description:
    'Hitkram makes bilona A2 desi cow ghee, buffalo ghee, kachi ghani mustard oil, homemade pickles and raw honey on our family farm in Deengli, Rajasthan. Free shipping above ₹1000.',
  applicationName: 'Hitkram',
  openGraph: { type: 'website', siteName: 'Hitkram', locale: 'en_IN', images: ['/brand/hero-organic-living.webp'] },
  icons: { icon: '/brand/logo.webp' },
  formatDetection: { telephone: false },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#173f1e' };

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={jost.variable}>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
