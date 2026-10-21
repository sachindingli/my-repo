import { prisma } from './prisma.js';

/** Average rating and count of approved reviews per product id. */
export async function ratingsFor(productIds) {
  const rows = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds }, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((r) => [r.productId, { average: Math.round((r._avg.rating || 0) * 10) / 10, count: r._count._all }]),
  );
}

const pickDefault = (variants) => variants.find((v) => v.isDefault) || variants[0];

export const variantOut = (v) => ({
  id: v.id,
  sku: v.sku,
  label: v.label,
  mrp: v.mrp,
  price: v.price,
  inStock: v.inStock,
  isDefault: v.isDefault,
  images: v.images,
});

/** Compact product shape used on listing pages. */
export function productCard(p, rating) {
  const v = pickDefault(p.variants);
  const prices = p.variants.map((x) => x.price);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameHi: p.nameHi,
    tagline: p.tagline,
    image: v?.images[0] || null,
    priceFrom: Math.min(...prices),
    sizes: p.variants.map((x) => x.label),
    defaultVariant: v ? variantOut(v) : null,
    inStock: p.variants.some((x) => x.inStock),
    rating: rating || { average: 0, count: 0 },
    categories: p.categories?.map((c) => c.category.slug) || [],
  };
}
