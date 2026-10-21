import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, HttpError, notFound } from '../lib/errors.js';
import { requireAdmin, signAdminToken } from '../lib/auth.js';
import { variantOut } from '../lib/serialize.js';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

export const admin = Router();

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

admin.post(
  '/login',
  loginLimiter,
  ah(async (req, res) => {
    const { email, password } = z.object({ email: z.string().trim().toLowerCase(), password: z.string() }).parse(req.body);
    const user = await prisma.adminUser.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Wrong email or password.');
    res.json({ token: signAdminToken(user), email: user.email });
  }),
);

admin.use(requireAdmin);

admin.get(
  '/stats',
  ah(async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const counted = { status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] } };
    const [today, all, toShip, pendingReviews, outOfStock] = await Promise.all([
      prisma.order.aggregate({ where: { ...counted, createdAt: { gte: startOfDay } }, _sum: { total: true }, _count: true }),
      prisma.order.aggregate({ where: counted, _sum: { total: true }, _count: true }),
      prisma.order.count({ where: { status: { in: ['PLACED', 'CONFIRMED'] } } }),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.variant.count({ where: { inStock: false } }),
    ]);
    res.json({
      today: { orders: today._count, revenue: today._sum.total || 0 },
      allTime: { orders: all._count, revenue: all._sum.total || 0 },
      ordersToShip: toShip,
      pendingReviews,
      outOfStockSizes: outOfStock,
    });
  }),
);

// ---- Orders ----
const ORDER_STATUS = ['PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

admin.get(
  '/orders',
  ah(async (req, res) => {
    const q = z
      .object({
        status: z.enum(ORDER_STATUS).optional(),
        q: z.string().trim().max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.query);
    const where = {
      ...(q.status && { status: q.status }),
      ...(q.q && {
        OR: [
          { number: { contains: q.q, mode: 'insensitive' } },
          { name: { contains: q.q, mode: 'insensitive' } },
          { phone: { contains: q.q.replace(/\D/g, '') || q.q } },
        ],
      }),
    };
    const take = 25;
    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * take,
        take,
        include: { _count: { select: { items: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ rows, total, page: q.page, pages: Math.max(1, Math.ceil(total / take)) });
  }),
);

admin.get(
  '/orders/:id',
  ah(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: { items: true } });
    if (!order) throw notFound('Order not found');
    res.json(order);
  }),
);

admin.patch(
  '/orders/:id',
  ah(async (req, res) => {
    const data = z
      .object({
        status: z.enum(ORDER_STATUS).optional(),
        paymentStatus: z.enum(['UNPAID', 'PAID', 'FAILED', 'REFUNDED']).optional(),
        trackingUrl: z.string().trim().url().max(500).or(z.literal('')).optional(),
      })
      .parse(req.body);
    if (data.trackingUrl === '') data.trackingUrl = null;
    const order = await prisma.order.update({ where: { id: Number(req.params.id) }, data, include: { items: true } });
    res.json(order);
  }),
);

// ---- Products ----
const variantIn = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().trim().min(1).max(40),
  mrp: z.coerce.number().int().min(0),
  price: z.coerce.number().int().min(1),
  inStock: z.boolean(),
  isDefault: z.boolean().default(false),
  images: z.array(z.string().max(500)).max(20).default([]),
});

const productIn = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes'),
  name: z.string().trim().min(2).max(120),
  nameHi: z.string().trim().max(120).nullish(),
  tagline: z.string().trim().max(200).nullish(),
  bullets: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
  descriptionHtml: z.string().max(100_000).default(''),
  specs: z.array(z.object({ label: z.string().max(60), value: z.string().max(300) })).max(30).default([]),
  metaTitle: z.string().trim().max(70).nullish(),
  metaDescription: z.string().trim().max(170).nullish(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  variants: z.array(variantIn).min(1, 'Add at least one size'),
});

const adminProduct = (p) => ({
  ...p,
  categories: p.categories.map((c) => c.category.slug),
  variants: p.variants.map(variantOut),
});

const productInclude = {
  variants: { orderBy: { sortOrder: 'asc' } },
  categories: { include: { category: { select: { slug: true } } } },
};

admin.get(
  '/products',
  ah(async (req, res) => {
    const rows = await prisma.product.findMany({ include: productInclude, orderBy: { sortOrder: 'asc' } });
    res.json(rows.map(adminProduct));
  }),
);

admin.get(
  '/products/:id',
  ah(async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include: productInclude });
    if (!p) throw notFound('Product not found');
    res.json(adminProduct(p));
  }),
);

async function saveProduct(id, input) {
  const { categories, variants, ...fields } = input;
  if (!variants.some((v) => v.isDefault)) variants[0].isDefault = true;
  return prisma.$transaction(async (tx) => {
    const product = id
      ? await tx.product.update({ where: { id }, data: fields })
      : await tx.product.create({ data: fields });

    const cats = await tx.category.findMany({ where: { slug: { in: categories } } });
    await tx.productCategory.deleteMany({ where: { productId: product.id } });
    if (cats.length) {
      await tx.productCategory.createMany({ data: cats.map((c) => ({ productId: product.id, categoryId: c.id })) });
    }

    const keep = variants.filter((v) => v.id).map((v) => v.id);
    // Sizes removed in the editor: hide them by deleting (past orders keep their own copy of name/price).
    await tx.variant.deleteMany({ where: { productId: product.id, id: { notIn: keep } } });
    for (const [i, v] of variants.entries()) {
      const data = { label: v.label, mrp: v.mrp, price: v.price, inStock: v.inStock, isDefault: v.isDefault, images: v.images, sortOrder: i };
      if (v.id) {
        const updated = await tx.variant.updateMany({ where: { id: v.id, productId: product.id }, data });
        if (!updated.count) throw new HttpError(400, `Size ${v.label} does not belong to this product`);
      } else {
        const sku = `${product.slug}-${v.label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${crypto.randomInt(100, 999)}`;
        await tx.variant.create({ data: { ...data, productId: product.id, sku } });
      }
    }
    return tx.product.findUnique({ where: { id: product.id }, include: productInclude });
  });
}

admin.post(
  '/products',
  ah(async (req, res) => {
    const p = await saveProduct(null, productIn.parse(req.body));
    res.status(201).json(adminProduct(p));
  }),
);

admin.put(
  '/products/:id',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await prisma.product.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Product not found');
    res.json(adminProduct(await saveProduct(id, productIn.parse(req.body))));
  }),
);

admin.get(
  '/categories',
  ah(async (req, res) => res.json(await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }))),
);

// ---- Image uploads ----
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype];
      cb(null, `${Date.now()}${crypto.randomInt(1000, 9999)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) =>
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(400, 'Only JPG, PNG or WebP images are allowed.')),
});

admin.post('/uploads', upload.array('files', 10), (req, res) => {
  res.status(201).json({ urls: (req.files || []).map((f) => `/uploads/${f.filename}`) });
});

// ---- Reviews ----
admin.get(
  '/reviews',
  ah(async (req, res) => {
    const { status } = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING') }).parse(req.query);
    const rows = await prisma.review.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { product: { select: { name: true, slug: true } } },
    });
    res.json(rows);
  }),
);

admin.patch(
  '/reviews/:id',
  ah(async (req, res) => {
    const data = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']) }).parse(req.body);
    res.json(await prisma.review.update({ where: { id: Number(req.params.id) }, data }));
  }),
);

admin.delete(
  '/reviews/:id',
  ah(async (req, res) => {
    await prisma.review.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  }),
);

// ---- Blog & pages ----
const blogIn = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().max(300).default(''),
  coverUrl: z.string().max(500).nullish(),
  bodyHtml: z.string().min(1).max(200_000),
  isPublished: z.boolean().default(true),
});

admin.get('/blogs', ah(async (req, res) => res.json(await prisma.blogPost.findMany({ orderBy: { publishedAt: 'desc' } }))));
admin.post('/blogs', ah(async (req, res) => res.status(201).json(await prisma.blogPost.create({ data: blogIn.parse(req.body) }))));
admin.put(
  '/blogs/:id',
  ah(async (req, res) => res.json(await prisma.blogPost.update({ where: { id: Number(req.params.id) }, data: blogIn.parse(req.body) }))),
);
admin.delete(
  '/blogs/:id',
  ah(async (req, res) => {
    await prisma.blogPost.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  }),
);

admin.get('/pages', ah(async (req, res) => res.json(await prisma.page.findMany({ orderBy: { slug: 'asc' } }))));
admin.put(
  '/pages/:slug',
  ah(async (req, res) => {
    const data = z.object({ title: z.string().trim().min(2).max(120), bodyHtml: z.string().min(1).max(200_000) }).parse(req.body);
    res.json(await prisma.page.update({ where: { slug: req.params.slug }, data }));
  }),
);
