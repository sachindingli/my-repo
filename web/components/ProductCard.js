import Link from 'next/link';
import Image from 'next/image';
import { Price, Stars } from './ui';
import QuickAdd from './QuickAdd';
import { discountPct } from '@/lib/format';
import { imageUrl } from '@/lib/api';

export default function ProductCard({ product, priority = false }) {
  const v = product.defaultVariant;
  const off = v ? discountPct(v.mrp, v.price) : 0;
  return (
    <article className="card">
      <Link href={`/products/${product.slug}`} className="card-img" tabIndex={-1} aria-hidden="true">
        {product.image && (
          <Image
            src={imageUrl(product.image)}
            alt=""
            fill
            sizes="(min-width: 1050px) 280px, (min-width: 700px) 33vw, 50vw"
            priority={priority}
          />
        )}
        {!product.inStock ? <span className="badge badge-oos">Out of stock</span> : off > 0 && <span className="badge badge-off">{off}% off</span>}
      </Link>
      <div className="card-body">
        <h3 className="card-title"><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        {product.rating.count > 0 && <Stars value={product.rating.average} count={product.rating.count} />}
        <div className="card-sizes">{product.sizes.join(' · ')}</div>
        <div className="card-foot">
          {v && <Price price={v.price} mrp={v.mrp} />}
          {v && v.inStock && (
            <QuickAdd
              item={{
                variantId: v.id,
                productSlug: product.slug,
                productName: product.name,
                variantLabel: v.label,
                price: v.price,
                mrp: v.mrp,
                image: v.images[0] || product.image,
              }}
              label={product.sizes.length > 1 ? `Add ${v.label}` : 'Add'}
            />
          )}
        </div>
      </div>
    </article>
  );
}
