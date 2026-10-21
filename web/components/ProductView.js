'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './CartProvider';
import { Price, Stars } from './ui';
import { WhatsAppIcon } from './Icons';
import { discountPct, rupees } from '@/lib/format';
import { site, whatsappLink } from '@/lib/site';

function SizeFromUrl({ onSize }) {
  const sku = useSearchParams().get('size');
  useEffect(() => onSize(sku), [sku, onSize]);
  return null;
}

export default function ProductView({ product, readSizeFromUrl = false }) {
  const router = useRouter();
  const { add } = useCart();
  const initial = product.variants.find((v) => v.isDefault) || product.variants[0];
  const [variant, setVariant] = useState(initial);
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const buyRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);

  const images = useMemo(() => (variant.images.length ? variant.images : product.variants.flatMap((v) => v.images)).slice(0, 10), [variant, product.variants]);

  // Show the bottom "Add to cart" bar on phones only once the main buttons have scrolled out of view.
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [variant.inStock]);

  useEffect(() => {
    document.body.classList.toggle('has-sticky-buy', showSticky);
    return () => document.body.classList.remove('has-sticky-buy');
  }, [showSticky]);

  // Links like ?size=<sku> (and old hitkram.com URLs, redirected here) preselect a size.
  const applySize = useCallback(
    (sku) => {
      const v = sku && product.variants.find((x) => x.sku === sku);
      if (v) {
        setVariant(v);
        setImageIndex(0);
      }
    },
    [product.variants],
  );

  function choose(v) {
    setVariant(v);
    setImageIndex(0);
    const url = new URL(window.location.href);
    url.searchParams.set('size', v.sku);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  const cartItem = {
    variantId: variant.id,
    productSlug: product.slug,
    productName: product.name,
    variantLabel: variant.label,
    price: variant.price,
    mrp: variant.mrp,
    image: variant.images[0] || images[0] || null,
  };

  const addToCart = () => add(cartItem, qty);
  const buyNow = () => {
    add(cartItem, qty, { silent: true });
    router.push('/checkout');
  };
  const saving = variant.mrp - variant.price;

  return (
    <div className="pdp">
      {readSizeFromUrl && <SizeFromUrl onSize={applySize} />}
      <div>
        <div className="gallery-main">
          {images[imageIndex] && (
            <Image
              key={images[imageIndex]}
              src={images[imageIndex]}
              alt={`${product.name} ${variant.label}${imageIndex ? ` – photo ${imageIndex + 1}` : ''}`}
              fill
              sizes="(min-width: 900px) 560px, 100vw"
              priority={imageIndex === 0}
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="thumbs" role="list" aria-label="Product photos">
            {images.map((im, i) => (
              <button
                key={im}
                type="button"
                role="listitem"
                aria-current={i === imageIndex}
                aria-label={`Show photo ${i + 1}`}
                onClick={() => setImageIndex(i)}
              >
                <Image src={im} alt="" width={64} height={64} sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp-info">
        <h1>{product.name}</h1>
        {product.nameHi && <p className="hi" lang="hi">{product.nameHi}</p>}
        {product.rating.count > 0 && (
          <a href="#reviews" style={{ textDecoration: 'none' }}>
            <Stars value={product.rating.average} count={product.rating.count} />
            <span className="sr-only">Read reviews</span>
          </a>
        )}
        {product.tagline && <p className="muted" style={{ marginTop: 8 }}>{product.tagline}</p>}

        <div style={{ margin: '14px 0 6px' }}>
          <Price price={variant.price} mrp={variant.mrp} large />
          <div className="muted" style={{ fontSize: '.85rem' }}>
            {saving > 0 ? `You save ${rupees(saving)} · ` : ''}Inclusive of all taxes
          </div>
        </div>

        {product.variants.length > 1 && (
          <fieldset className="size-picker">
            <legend>Size: <span style={{ fontWeight: 400 }}>{variant.label}</span></legend>
            {product.variants.map((v) => (
              <label key={v.id} className={`size-option${v.inStock ? '' : ' oos'}`}>
                <input type="radio" name="size" value={v.sku} checked={v.id === variant.id} onChange={() => choose(v)} />
                {v.label}
                <small>{v.inStock ? rupees(v.price) : 'Sold out'}</small>
              </label>
            ))}
          </fieldset>
        )}

        {variant.inStock ? (
          <div className="buy-row" ref={buyRef}>
            <div className="qty" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <output aria-live="polite" aria-label="Quantity">{qty}</output>
              <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">+</button>
            </div>
            <button type="button" className="btn btn-outline" onClick={addToCart}>Add to cart</button>
            <button type="button" className="btn btn-primary" onClick={buyNow}>Buy now</button>
          </div>
        ) : (
          <div className="buy-row">
            <p className="stock-out" style={{ margin: 0 }}>This size is sold out.</p>
            <a className="btn btn-outline" href={whatsappLink(`Hi Hitkram, please tell me when ${product.name} (${variant.label}) is back in stock.`)} target="_blank" rel="noopener noreferrer">
              Notify me on WhatsApp
            </a>
          </div>
        )}

        <a
          href={whatsappLink(`Hi Hitkram, I want to order ${product.name} (${variant.label}) × ${qty}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ color: '#128c4a', paddingLeft: 0 }}
        >
          <WhatsAppIcon width={20} height={20} /> Order on WhatsApp instead
        </a>

        {product.bullets.length > 0 && (
          <ul className="bullets">
            {product.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}

        <div className="perks">
          <div><strong>Free shipping</strong><br />on orders over {rupees(site.freeShippingMin)}</div>
          <div><strong>Cash on Delivery</strong><br />pay when it arrives</div>
          <div><strong>Dispatched fast</strong><br />within 3 working days</div>
          <div><strong>Secure packing</strong><br />safe delivery across India</div>
        </div>
      </div>

      {variant.inStock && showSticky && (
        <div className="sticky-buy">
          <div>
            <div style={{ fontWeight: 700 }}>{rupees(variant.price)}</div>
            <div className="muted" style={{ fontSize: '.8rem' }}>
              {variant.label}{discountPct(variant.mrp, variant.price) > 0 ? ` · ${discountPct(variant.mrp, variant.price)}% off` : ''}
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={addToCart}>Add to cart</button>
        </div>
      )}
    </div>
  );
}
