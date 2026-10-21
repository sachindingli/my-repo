import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from './errors.js';

const hmac = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Create a Razorpay order. Amount is in rupees; Razorpay expects paise. */
export async function createRazorpayOrder({ amount, receipt }) {
  const { keyId, keySecret } = config.razorpay;
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt }),
  });
  if (!res.ok) {
    console.error('Razorpay order failed', res.status, await res.text());
    throw new HttpError(502, 'Online payment is unavailable right now. Please try Cash on Delivery.');
  }
  return res.json();
}

/** Signature returned to the browser by Razorpay Checkout after payment. */
export const verifyPaymentSignature = ({ orderId, paymentId, signature }) =>
  safeEqual(hmac(config.razorpay.keySecret, `${orderId}|${paymentId}`), signature);

/** Signature on webhook calls (computed over the raw request body). */
export const verifyWebhookSignature = (rawBody, signature) =>
  Boolean(config.razorpay.webhookSecret) && safeEqual(hmac(config.razorpay.webhookSecret, rawBody), signature);
