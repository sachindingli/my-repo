import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config, razorpayEnabled } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { ah, HttpError, notFound } from '../lib/errors.js';
import { assertOrderable, quoteCart } from '../lib/pricing.js';
import { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } from '../lib/razorpay.js';

export const checkout = Router();

const cartItems = z
  .array(z.object({ variantId: z.coerce.number().int().positive(), quantity: z.coerce.number().int().min(1).max(50) }))
  .min(1, 'Your cart is empty.')
  .max(30);

/** Indian mobile: keeps the last 10 digits, must start 6–9. */
const phone = z
  .string()
  .transform((s) => s.replace(/\D/g, '').slice(-10))
  .refine((s) => /^[6-9]\d{9}$/.test(s), 'Enter a valid 10-digit mobile number');

const customer = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(80),
  phone,
  email: z.string().trim().email('Enter a valid email').max(120).optional().or(z.literal('').transform(() => undefined)),
  address1: z.string().trim().min(5, 'Please enter your house / street').max(200),
  address2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'Please enter your city').max(80),
  state: z.string().trim().min(2, 'Please choose your state').max(80),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  notes: z.string().trim().max(500).optional(),
});

checkout.get('/checkout/options', (req, res) => {
  res.json({
    cod: config.codEnabled,
    razorpay: razorpayEnabled() ? { keyId: config.razorpay.keyId } : null,
    shippingFee: config.shippingFee,
    freeShippingMin: config.freeShippingMin,
  });
});

checkout.post(
  '/cart/quote',
  ah(async (req, res) => {
    const { items } = z.object({ items: cartItems }).parse(req.body);
    res.json(await quoteCart(items));
  }),
);

const newOrderNumber = () => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000); // IST date in the number
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  return `HK${ymd}${crypto.randomInt(1000, 9999)}`;
};

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

checkout.post(
  '/orders',
  orderLimiter,
  ah(async (req, res) => {
    const body = z
      .object({ items: cartItems, customer, paymentMethod: z.enum(['COD', 'RAZORPAY']) })
      .parse(req.body);
    if (body.paymentMethod === 'COD' && !config.codEnabled) throw new HttpError(400, 'Cash on Delivery is not available.');
    if (body.paymentMethod === 'RAZORPAY' && !razorpayEnabled()) throw new HttpError(400, 'Online payment is not available yet.');

    const quote = await quoteCart(body.items);
    assertOrderable(quote);

    let order;
    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
      try {
        order = await prisma.order.create({
          data: {
            number: newOrderNumber(),
            paymentMethod: body.paymentMethod,
            status: body.paymentMethod === 'COD' ? 'PLACED' : 'PENDING_PAYMENT',
            ...body.customer,
            subtotal: quote.subtotal,
            shipping: quote.shipping,
            total: quote.total,
            items: {
              create: quote.lines.map((l) => ({
                variantId: l.variantId,
                productName: l.productName,
                variantLabel: l.variantLabel,
                unitPrice: l.unitPrice,
                quantity: l.quantity,
                lineTotal: l.lineTotal,
              })),
            },
          },
        });
      } catch (e) {
        if (e.code !== 'P2002') throw e; // retry only on duplicate order number
      }
    }
    if (!order) throw new HttpError(500, 'Could not create the order. Please try again.');

    if (body.paymentMethod === 'COD') {
      return res.status(201).json({ number: order.number, total: order.total, status: order.status });
    }

    const rzp = await createRazorpayOrder({ amount: order.total, receipt: order.number });
    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });
    return res.status(201).json({
      number: order.number,
      total: order.total,
      status: order.status,
      razorpay: { keyId: config.razorpay.keyId, orderId: rzp.id, amount: rzp.amount, currency: rzp.currency },
    });
  }),
);

checkout.post(
  '/orders/:number/verify-payment',
  ah(async (req, res) => {
    const body = z
      .object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() })
      .parse(req.body);
    const order = await prisma.order.findUnique({ where: { number: req.params.number } });
    if (!order || order.razorpayOrderId !== body.razorpay_order_id) throw notFound('Order not found');
    const valid = verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!valid) throw new HttpError(400, 'Payment could not be verified. If money was deducted, please contact us.');
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', status: 'PLACED', razorpayPaymentId: body.razorpay_payment_id },
    });
    res.json({ number: updated.number, status: updated.status, paymentStatus: updated.paymentStatus });
  }),
);

/** Razorpay webhook: a backup in case the shopper closes the tab before verify-payment runs. */
export async function razorpayWebhook(req, res) {
  const signature = req.get('x-razorpay-signature') || '';
  if (!verifyWebhookSignature(req.body, signature)) return res.status(400).json({ error: 'Bad signature' });
  const event = JSON.parse(req.body.toString('utf8'));
  const payment = event?.payload?.payment?.entity;
  if (payment?.order_id) {
    const order = await prisma.order.findUnique({ where: { razorpayOrderId: payment.order_id } });
    if (order && order.paymentStatus !== 'PAID') {
      if (event.event === 'payment.captured' || event.event === 'order.paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'PAID', status: 'PLACED', razorpayPaymentId: payment.id },
        });
      } else if (event.event === 'payment.failed') {
        await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
      }
    }
  }
  return res.json({ ok: true });
}

const trackLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

checkout.get(
  '/orders/track',
  trackLimiter,
  ah(async (req, res) => {
    const q = z.object({ number: z.string().trim().toUpperCase().max(20), phone }).parse(req.query);
    const order = await prisma.order.findUnique({ where: { number: q.number }, include: { items: true } });
    // Same message whether the number or the phone is wrong, so numbers can't be probed.
    if (!order || order.phone !== q.phone) throw notFound('No order found with that number and mobile.');
    res.json({
      number: order.number,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      city: order.city,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      trackingUrl: order.trackingUrl,
      items: order.items.map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
    });
  }),
);
