import { config } from '../config.js';
import { prisma } from './prisma.js';
import { HttpError } from './errors.js';

export const shippingFor = (subtotal) => (subtotal >= config.freeShippingMin ? 0 : config.shippingFee);

/**
 * Price a cart from the database (never trust prices sent by the browser).
 * @param {{variantId:number, quantity:number}[]} items
 */
export async function quoteCart(items, db = prisma) {
  const merged = new Map();
  for (const { variantId, quantity } of items) {
    merged.set(variantId, (merged.get(variantId) || 0) + quantity);
  }
  const variants = await db.variant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: { select: { name: true, slug: true, isActive: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines = [];
  const problems = [];
  for (const [variantId, quantity] of merged) {
    const v = byId.get(variantId);
    if (!v || !v.product.isActive) {
      problems.push({ variantId, reason: 'This item is no longer available.' });
      continue;
    }
    if (!v.inStock) {
      problems.push({ variantId, reason: `${v.product.name} (${v.label}) is out of stock.` });
      continue;
    }
    const qty = Math.min(quantity, config.maxQtyPerItem);
    lines.push({
      variantId: v.id,
      productSlug: v.product.slug,
      productName: v.product.name,
      variantLabel: v.label,
      image: v.images[0] || null,
      unitPrice: v.price,
      mrp: v.mrp,
      quantity: qty,
      lineTotal: v.price * qty,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = lines.length ? shippingFor(subtotal) : 0;
  return {
    lines,
    problems,
    subtotal,
    shipping,
    total: subtotal + shipping,
    freeShippingMin: config.freeShippingMin,
    amountToFreeShipping: Math.max(0, config.freeShippingMin - subtotal),
  };
}

export function assertOrderable(quote) {
  if (quote.problems.length) throw new HttpError(409, quote.problems[0].reason, quote.problems);
  if (!quote.lines.length) throw new HttpError(400, 'Your cart is empty.');
}
