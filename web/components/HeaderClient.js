'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartProvider';
import { CartIcon, CloseIcon, MenuIcon } from './Icons';

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="icon-btn" aria-label={ready ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}>
      <CartIcon />
      {ready && count > 0 && <span className="cart-count" aria-hidden="true">{count}</span>}
    </Link>
  );
}

export function NavLinks({ links }) {
  const pathname = usePathname();
  return (
    <ul>
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} aria-current={pathname === l.href ? 'page' : undefined}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MobileMenu({ links }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button type="button" className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <MenuIcon />
      </button>
      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav className="drawer" aria-label="Main menu">
            <div className="drawer-head">
              <strong>Menu</strong>
              <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
