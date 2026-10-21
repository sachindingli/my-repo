// Runs against the hitkram_test database (see .env.test). `npm test` migrates + seeds it first.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';

process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';

const { createApp } = await import('../src/app.js');
const { prisma } = await import('../src/lib/prisma.js');
const app = createApp();

const customer = {
  name: 'Test Buyer',
  phone: '+91 98765 43210',
  address1: '12 Main Road',
  city: 'Churu',
  state: 'Rajasthan',
  pincode: '331305',
};

let ghee1L;
let ghee200;
let outOfStock;

before(async () => {
  const variants = await prisma.variant.findMany();
  ghee1L = variants.find((v) => v.sku === 'a2-desi-cow-bilona-ghee-1-litre');
  ghee200 = variants.find((v) => v.sku === 'a2-desi-cow-bilona-ghee-200-ml');
  outOfStock = variants.find((v) => !v.inStock);
  assert.ok(ghee1L && ghee200 && outOfStock, 'seed data present');
});

after(async () => {
  await prisma.order.deleteMany({ where: { name: 'Test Buyer' } });
  await prisma.review.deleteMany({ where: { name: 'Test Reviewer' } });
  await prisma.$disconnect();
});

test('product listing returns migrated catalogue with prices and ratings', async () => {
  const res = await request(app).get('/api/products').expect(200);
  assert.equal(res.body.length, 9);
  const ghee = res.body.find((p) => p.slug === 'a2-desi-cow-bilona-ghee');
  assert.equal(ghee.defaultVariant.price, 1499);
  assert.equal(ghee.priceFrom, 348);
  assert.ok(ghee.rating.count > 100);
});

test('category filter and search work', async () => {
  const pickles = await request(app).get('/api/products?category=pickle').expect(200);
  assert.equal(pickles.body.length, 3);
  const honey = await request(app).get('/api/products?q=honey').expect(200);
  assert.deepEqual(honey.body.map((p) => p.slug), ['raw-forest-honey']);
});

test('unknown product is a real 404', async () => {
  await request(app).get('/api/products/does-not-exist').expect(404);
});

test('quote uses database prices and adds shipping below the free threshold', async () => {
  const res = await request(app)
    .post('/api/cart/quote')
    .send({ items: [{ variantId: ghee200.id, quantity: 2 }] })
    .expect(200);
  assert.equal(res.body.subtotal, 696);
  assert.equal(res.body.shipping, 80);
  assert.equal(res.body.total, 776);
  assert.equal(res.body.amountToFreeShipping, 304);
});

test('quote merges duplicate lines and gives free shipping at ₹1000+', async () => {
  const res = await request(app)
    .post('/api/cart/quote')
    .send({ items: [{ variantId: ghee1L.id, quantity: 1 }, { variantId: ghee1L.id, quantity: 1 }] })
    .expect(200);
  assert.equal(res.body.lines.length, 1);
  assert.equal(res.body.lines[0].quantity, 2);
  assert.equal(res.body.shipping, 0);
  assert.equal(res.body.total, 2998);
});

test('COD order is created, priced server-side, and trackable by number + phone', async () => {
  const res = await request(app)
    .post('/api/orders')
    .send({ items: [{ variantId: ghee1L.id, quantity: 1 }], customer, paymentMethod: 'COD' })
    .expect(201);
  assert.match(res.body.number, /^HK\d{10}$/);
  assert.equal(res.body.total, 1499);

  const track = await request(app).get(`/api/orders/track?number=${res.body.number}&phone=9876543210`).expect(200);
  assert.equal(track.body.status, 'PLACED');
  assert.equal(track.body.items[0].productName, 'A2 Desi Cow Bilona Ghee');
  assert.equal(track.body.address1, undefined, 'tracking must not expose the address');

  await request(app).get(`/api/orders/track?number=${res.body.number}&phone=9123456780`).expect(404);
});

test('order rejects out-of-stock items and bad customer details', async () => {
  const oos = await request(app)
    .post('/api/orders')
    .send({ items: [{ variantId: outOfStock.id, quantity: 1 }], customer, paymentMethod: 'COD' })
    .expect(409);
  assert.match(oos.body.error, /out of stock/);

  const bad = await request(app)
    .post('/api/orders')
    .send({ items: [{ variantId: ghee1L.id, quantity: 1 }], customer: { ...customer, phone: '12345', pincode: '0123' }, paymentMethod: 'COD' })
    .expect(400);
  assert.ok(bad.body.fields['customer.phone']);
  assert.ok(bad.body.fields['customer.pincode']);
});

test('Razorpay payment is accepted only with a valid signature', async () => {
  const order = await prisma.order.create({
    data: {
      number: `HKTEST${crypto.randomInt(1000, 9999)}`,
      paymentMethod: 'RAZORPAY',
      status: 'PENDING_PAYMENT',
      razorpayOrderId: `order_${crypto.randomUUID()}`,
      ...customer,
      phone: '9876543210',
      subtotal: 1499,
      shipping: 0,
      total: 1499,
    },
  });
  const paymentId = 'pay_123';
  const goodSig = crypto.createHmac('sha256', 'test_secret').update(`${order.razorpayOrderId}|${paymentId}`).digest('hex');

  await request(app)
    .post(`/api/orders/${order.number}/verify-payment`)
    .send({ razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: 'f'.repeat(64) })
    .expect(400);

  const ok = await request(app)
    .post(`/api/orders/${order.number}/verify-payment`)
    .send({ razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: goodSig })
    .expect(200);
  assert.equal(ok.body.paymentStatus, 'PAID');
});

test('Razorpay webhook rejects bad signatures and marks paid on a good one', async () => {
  const order = await prisma.order.create({
    data: {
      number: `HKTEST${crypto.randomInt(1000, 9999)}`,
      paymentMethod: 'RAZORPAY',
      status: 'PENDING_PAYMENT',
      razorpayOrderId: `order_${crypto.randomUUID()}`,
      ...customer,
      phone: '9876543210',
      subtotal: 348,
      shipping: 80,
      total: 428,
    },
  });
  const body = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_wh', order_id: order.razorpayOrderId } } },
  });
  await request(app)
    .post('/api/payments/razorpay/webhook')
    .set('content-type', 'application/json')
    .set('x-razorpay-signature', 'bad')
    .send(body)
    .expect(400);
  const sig = crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex');
  await request(app)
    .post('/api/payments/razorpay/webhook')
    .set('content-type', 'application/json')
    .set('x-razorpay-signature', sig)
    .send(body)
    .expect(200);
  const updated = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(updated.paymentStatus, 'PAID');
});

test('new reviews wait for approval and never ask for a phone number', async () => {
  await request(app)
    .post('/api/products/raw-forest-honey/reviews')
    .send({ name: 'Test Reviewer', rating: 5, body: 'Very pure honey, loved it.' })
    .expect(201);
  const r = await prisma.review.findFirst({ where: { name: 'Test Reviewer' } });
  assert.equal(r.status, 'PENDING');
  const product = await request(app).get('/api/products/raw-forest-honey').expect(200);
  assert.ok(!product.body.reviews.some((x) => x.name === 'Test Reviewer'));
  assert.ok(!JSON.stringify(product.body).includes('phone'));
});

test('admin routes require login; admin can change a price', async () => {
  await request(app).get('/api/admin/orders').expect(401);
  await request(app).get('/api/admin/orders').set('authorization', 'Bearer nonsense').expect(401);
  await request(app).post('/api/admin/login').send({ email: 'admin@hitkram.com', password: 'wrong' }).expect(401);

  const login = await request(app)
    .post('/api/admin/login')
    .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
    .expect(200);
  const auth = { authorization: `Bearer ${login.body.token}` };

  const product = (await request(app).get('/api/admin/products').set(auth).expect(200)).body.find(
    (p) => p.slug === 'raw-forest-honey',
  );
  const original = product.variants.map((v) => ({ ...v }));
  const edited = { ...product, variants: product.variants.map((v) => ({ ...v, price: v.price + 1 })) };
  delete edited.id;
  const saved = await request(app).put(`/api/admin/products/${product.id}`).set(auth).send(edited).expect(200);
  assert.deepEqual(saved.body.variants.map((v) => v.price), original.map((v) => v.price + 1));

  // Restore.
  await request(app).put(`/api/admin/products/${product.id}`).set(auth).send({ ...edited, variants: original }).expect(200);
  const stats = await request(app).get('/api/admin/stats').set(auth).expect(200);
  assert.ok(stats.body.pendingReviews >= 1);
});
