import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ah, notFound } from '../lib/errors.js';
import { productCard, ratingsFor, variantOut } from '../lib/serialize.js';

export const catalog = Router();

const listInclude = {
  variants: { orderBy: { sortOrder: 'asc' } },
  categories: { include: { category: { select: { slug: true } } } },
};

catalog.get(
  '/categories',
  ah(async (req, res) => {
    const cats = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: { where: { product: { isActive: true } } } } } },
    });
    res.json(cats.map((c) => ({ slug: c.slug, name: c.name, nameHi: c.nameHi, productCount: c._count.products })));
  }),
);

catalog.get(
  '/products',
  ah(async (req, res) => {
    const q = z
      .object({
        category: z.string().max(60).optional(),
        q: z.string().trim().max(60).optional(),
        featured: z.enum(['true', 'false']).optional(),
      })
      .parse(req.query);
    const where = {
      isActive: true,
      ...(q.category && { categories: { some: { category: { slug: q.category } } } }),
      ...(q.featured === 'true' && { isFeatured: true }),
      ...(q.q && {
        OR: [
          { name: { contains: q.q, mode: 'insensitive' } },
          { nameHi: { contains: q.q } },
          { tagline: { contains: q.q, mode: 'insensitive' } },
        ],
      }),
    };
    const products = await prisma.product.findMany({ where, include: listInclude, orderBy: { sortOrder: 'asc' } });
    const ratings = await ratingsFor(products.map((p) => p.id));
    res.json(products.map((p) => productCard(p, ratings.get(p.id))));
  }),
);

catalog.get(
  '/products/:slug',
  ah(async (req, res) => {
    const p = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: { ...listInclude, categories: { include: { category: true } } },
    });
    if (!p) throw notFound('Product not found');

    const [reviews, ratings, breakdown] = await Promise.all([
      prisma.review.findMany({
        where: { productId: p.id, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, name: true, rating: true, body: true, verified: true, images: true, createdAt: true },
      }),
      ratingsFor([p.id]),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId: p.id, status: 'APPROVED' },
        _count: { _all: true },
      }),
    ]);

    const categoryIds = p.categories.map((c) => c.categoryId);
    const relatedRows = await prisma.product.findMany({
      where: { isActive: true, id: { not: p.id }, categories: { some: { categoryId: { in: categoryIds } } } },
      include: listInclude,
      orderBy: { sortOrder: 'asc' },
      take: 4,
    });
    const fill =
      relatedRows.length < 4
        ? await prisma.product.findMany({
            where: { isActive: true, isFeatured: true, id: { notIn: [p.id, ...relatedRows.map((r) => r.id)] } },
            include: listInclude,
            orderBy: { sortOrder: 'asc' },
            take: 4 - relatedRows.length,
          })
        : [];
    const related = [...relatedRows, ...fill];
    const relatedRatings = await ratingsFor(related.map((r) => r.id));

    res.json({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameHi: p.nameHi,
      tagline: p.tagline,
      bullets: p.bullets,
      descriptionHtml: p.descriptionHtml,
      specs: p.specs,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      categories: p.categories.map((c) => ({ slug: c.category.slug, name: c.category.name })),
      variants: p.variants.map(variantOut),
      rating: ratings.get(p.id) || { average: 0, count: 0 },
      ratingBreakdown: Object.fromEntries([5, 4, 3, 2, 1].map((n) => [n, breakdown.find((b) => b.rating === n)?._count._all || 0])),
      reviews,
      related: related.map((r) => productCard(r, relatedRatings.get(r.id))),
      updatedAt: p.updatedAt,
    });
  }),
);

/** Map an old hitkram.com product URL slug to its new product + size, for 301 redirects. */
catalog.get(
  '/legacy/:slug',
  ah(async (req, res) => {
    const v = await prisma.variant.findUnique({
      where: { legacySlug: req.params.slug },
      include: { product: { select: { slug: true } } },
    });
    if (!v) throw notFound();
    res.json({ productSlug: v.product.slug, variantSku: v.sku });
  }),
);

catalog.get(
  '/blogs',
  ah(async (req, res) => {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true, excerpt: true, coverUrl: true, publishedAt: true },
    });
    res.json(posts);
  }),
);

catalog.get(
  '/blogs/:slug',
  ah(async (req, res) => {
    const post = await prisma.blogPost.findFirst({ where: { slug: req.params.slug, isPublished: true } });
    if (!post) throw notFound('Post not found');
    res.json(post);
  }),
);

catalog.get(
  '/pages/:slug',
  ah(async (req, res) => {
    const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
    if (!page) throw notFound('Page not found');
    res.json(page);
  }),
);

/** Everything the sitemap needs in one call. */
catalog.get(
  '/sitemap',
  ah(async (req, res) => {
    const [products, posts, categories, pages] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.blogPost.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ select: { slug: true } }),
      prisma.page.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    res.json({ products, posts, categories, pages });
  }),
);

const reviewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });

catalog.post(
  '/products/:slug/reviews',
  reviewLimiter,
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2, 'Please enter your name').max(60),
        rating: z.coerce.number().int().min(1).max(5),
        body: z.string().trim().min(5, 'Please write a few words').max(1000),
      })
      .parse(req.body);
    const p = await prisma.product.findFirst({ where: { slug: req.params.slug, isActive: true }, select: { id: true } });
    if (!p) throw notFound('Product not found');
    await prisma.review.create({ data: { ...body, productId: p.id, status: 'PENDING' } });
    res.status(201).json({ ok: true, message: 'Thank you! Your review will appear after a quick check.' });
  }),
);
