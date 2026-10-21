import Link from 'next/link';
import { StarIcon } from './Icons';
import { discountPct, rupees } from '@/lib/format';

export function Stars({ value = 0, count, size }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" aria-label={`Rated ${value} out of 5${count != null ? ` from ${count} reviews` : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= rounded} style={size ? { width: size, height: size } : undefined} />
      ))}
      {count != null && <span className="count">({count})</span>}
    </span>
  );
}

export function Price({ price, mrp, from = false, large = false }) {
  const off = discountPct(mrp, price);
  return (
    <div className={`price${large ? ' price-lg' : ''}`}>
      {from && <span className="from">from</span>}
      <span className="now">{rupees(price)}</span>
      {off > 0 && (
        <>
          <span className="was"><span className="sr-only">MRP </span>{rupees(mrp)}</span>
          <span className="badge badge-off">{off}% off</span>
        </>
      )}
    </div>
  );
}

export function JsonLd({ data }) {
  // JSON.stringify output is safe in a script tag once "<" is escaped.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) =>
          it.href && i < items.length - 1 ? (
            <li key={it.label}><Link href={it.href}>{it.label}</Link></li>
          ) : (
            <li key={it.label} aria-current="page">{it.label}</li>
          ),
        )}
      </ol>
    </nav>
  );
}
