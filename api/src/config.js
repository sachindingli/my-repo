const int = (v, fallback) => (v === undefined || v === '' ? fallback : Number.parseInt(v, 10));

export const config = {
  port: int(process.env.PORT, 4000),
  webOrigin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim()),
  jwtSecret: process.env.JWT_SECRET || '',
  shippingFee: int(process.env.SHIPPING_FEE, 80),
  freeShippingMin: int(process.env.FREE_SHIPPING_MIN, 1000),
  codEnabled: process.env.COD_ENABLED !== 'false',
  maxQtyPerItem: 20,
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
};

export const razorpayEnabled = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);

if (process.env.NODE_ENV === 'production' && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}
