import Link from 'next/link';
import { FacebookIcon, InstagramIcon, WhatsAppIcon, YoutubeIcon } from './Icons';
import { site, whatsappLink } from '@/lib/site';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <>
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h2>Hitkram Farm</h2>
              <address>
                {site.address.line1}<br />
                {site.address.line2}, {site.address.region} {site.address.postalCode}
              </address>
              <p style={{ marginTop: 10 }}>
                <a href={site.phoneHref}>{site.phone}</a><br />
                <a href={`mailto:${site.email}`}>{site.email}</a><br />
                <a href={site.mapUrl} target="_blank" rel="noopener noreferrer">View on Google Maps</a>
              </p>
              <div className="social">
                <a href={site.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Hitkram on Facebook"><FacebookIcon /></a>
                <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Hitkram on Instagram"><InstagramIcon /></a>
                <a href={site.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="Hitkram on YouTube"><YoutubeIcon /></a>
              </div>
            </div>
            <div>
              <h2>Shop</h2>
              <ul>
                <li><Link href="/category/a2-desi-cow-ghee">A2 Desi Cow Ghee</Link></li>
                <li><Link href="/category/buffalo-bilona-ghee">Buffalo Bilona Ghee</Link></li>
                <li><Link href="/category/cold-pressed-oil">Cold Pressed Oil</Link></li>
                <li><Link href="/category/pickle">Pickles</Link></li>
                <li><Link href="/category/honey">Honey</Link></li>
                <li><Link href="/category/combo-pack">Combo Packs</Link></li>
              </ul>
            </div>
            <div>
              <h2>Help</h2>
              <ul>
                <li><Link href="/track-order">Track your order</Link></li>
                <li><Link href="/contact-us">Contact us</Link></li>
                <li><Link href="/our-policies/shipping-and-delivery">Shipping policy</Link></li>
                <li><Link href="/our-policies/refund-and-cancellation">Returns &amp; refunds</Link></li>
              </ul>
            </div>
            <div>
              <h2>About</h2>
              <ul>
                <li><Link href="/our-story">Our story</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/our-policies/privacy-and-policy">Privacy policy</Link></li>
                <li><Link href="/our-policies/terms-and-conditions">Terms &amp; conditions</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {year} Hitkram. All rights reserved.</span>
            {/* TODO(owner): add the FSSAI licence number here once provided. */}
            <span>Made on our farm in Deengli, Rajasthan</span>
          </div>
        </div>
      </footer>
      <a className="wa-float" href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
        <WhatsAppIcon />
      </a>
    </>
  );
}
