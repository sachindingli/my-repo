import Link from 'next/link';
import Image from 'next/image';
import { CartButton, MobileMenu, NavLinks } from './HeaderClient';
import { SearchIcon } from './Icons';
import { rupees } from '@/lib/format';
import { site } from '@/lib/site';

const NAV = [
  { href: '/products', label: 'All Products' },
  { href: '/category/a2-desi-cow-ghee', label: 'A2 Cow Ghee' },
  { href: '/category/buffalo-bilona-ghee', label: 'Buffalo Ghee' },
  { href: '/category/cold-pressed-oil', label: 'Mustard Oil' },
  { href: '/category/pickle', label: 'Pickles' },
  { href: '/category/honey', label: 'Honey' },
  { href: '/category/combo-pack', label: 'Combos' },
  { href: '/our-story', label: 'Our Story' },
  { href: '/blog', label: 'Blog' },
  { href: '/track-order', label: 'Track Order' },
  { href: '/contact-us', label: 'Contact' },
];

function SearchForm({ id }) {
  return (
    <form action="/products" role="search" className="search-form">
      <label htmlFor={id} className="sr-only">Search products</label>
      <input id={id} name="q" type="search" placeholder="Search ghee, oil, pickle, honey…" autoComplete="off" />
      <button type="submit" aria-label="Search"><SearchIcon width={18} height={18} /></button>
    </form>
  );
}

export default function Header() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="announce">
        <strong>Free shipping</strong> on orders above {rupees(site.freeShippingMin)} · Cash on Delivery available
      </div>
      <header className="header">
        <div className="container">
          <div className="header-row">
            <MobileMenu links={NAV} />
            <Link href="/" className="logo" aria-label="Hitkram home">
              <Image src="/brand/logo.webp" alt="Hitkram" width={150} height={44} priority />
            </Link>
            <div className="header-search"><SearchForm id="search-desktop" /></div>
            <div className="header-actions">
              <CartButton />
            </div>
          </div>
          <div className="mobile-search"><SearchForm id="search-mobile" /></div>
        </div>
        <nav className="nav" aria-label="Main">
          <div className="container"><NavLinks links={NAV} /></div>
        </nav>
      </header>
    </>
  );
}
