// Seeds the database from data/catalog.json (scraped from the live hitkram.com).
// Safe to re-run: it upserts by slug / sku / legacy id.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// By default only missing rows are added, so admin edits survive a re-run. Pass --overwrite to reset content.
const overwrite = process.argv.includes('--overwrite');
const upd = (data) => (overwrite ? data : {});
const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(path.join(here, '../data/catalog.json'), 'utf8'));
const legacy = Object.fromEntries(catalog.products.map((p) => [p.slug, p]));

const CATEGORY_HI = {
  'a2-desi-cow-ghee': 'ए2 देसी गाय घी',
  'buffalo-bilona-ghee': 'भैंस बिलोना घी',
  'cold-pressed-oil': 'कच्ची घानी तेल',
  pickle: 'अचार',
  honey: 'शहद',
  'combo-pack': 'कॉम्बो पैक',
};

// The old site listed every size as a separate product. Here each product has sizes (variants).
const PRODUCTS = [
  {
    slug: 'a2-desi-cow-bilona-ghee',
    name: 'A2 Desi Cow Bilona Ghee',
    nameHi: 'ए2 देसी गाय बिलोना घी',
    tagline: 'Hand-churned from curd using the traditional bilona method',
    categories: ['a2-desi-cow-ghee'],
    featured: true,
    metaDescription:
      'Hitkram A2 Desi Cow Bilona Ghee, hand-churned from curd on our farm in Rajasthan. Lab tested, in glass jars. 200 ml to 5 litre. Free shipping above ₹1000.',
    variants: [
      ['a2-desi-cow-ghee-200-ml', '200 ml'],
      ['a2-desi-cow-ghee-500-ml', '500 ml'],
      ['a2-desi-cow-ghee-1-liter', '1 Litre'],
      ['a2-cow-desi-ghee-2-liter-combo', '2 Litre'],
      ['hitkram-a2-cow-desi-bilona-ghee-100-organic-and-natural-cultured-cow-desi-ghee-5-liter', '5 Litre'],
    ],
    defaultVariant: '1 Litre',
  },
  {
    slug: 'desi-buffalo-bilona-ghee',
    name: 'Desi Buffalo Bilona Ghee',
    nameHi: 'देसी भैंस बिलोना घी',
    tagline: 'Rich, grainy bilona ghee from farm buffalo milk',
    categories: ['buffalo-bilona-ghee'],
    featured: true,
    metaDescription:
      'Hitkram Desi Buffalo Bilona Ghee made the traditional way from curd. Rich aroma, grainy texture, lab tested. 200 ml to 2 litre. Free shipping above ₹1000.',
    variants: [
      ['pure-desi-buffalo-ghee-200-ml', '200 ml'],
      ['pure-desi-buffalo-ghee-500-ml', '500 ml'],
      ['pure-desi-buffalo-ghee-1-liter', '1 Litre'],
      ['pure-desi-buffalo-ghee-2-liter', '2 Litre'],
    ],
    defaultVariant: '1 Litre',
  },
  {
    slug: 'kachi-ghani-black-mustard-oil',
    name: 'Kachi Ghani Cold Pressed Black Mustard Oil',
    nameHi: 'कच्ची घानी काली सरसों का तेल',
    tagline: 'Unrefined, cold pressed from black mustard seeds',
    categories: ['cold-pressed-oil'],
    featured: true,
    metaDescription:
      'Hitkram Kachi Ghani cold pressed black mustard oil. Unrefined, no additives, lab tested. 1, 2 and 5 litre packs. Free shipping above ₹1000.',
    variants: [
      ['cold-pressed-kachi-ghani-mustard-oil-1-liter', '1 Litre'],
      ['cold-pressed-kachi-ghani-mustard-oil-2-liter', '2 Litre'],
      ['cold-pressed-kachi-ghani-mustard-oil-5-liter', '5 Litre'],
    ],
    defaultVariant: '1 Litre',
  },
  {
    slug: 'raw-mango-pickle-aam-ka-achar',
    name: 'Homemade Raw Mango Pickle (Aam ka Achar)',
    nameHi: 'घर का बना आम का अचार',
    tagline: 'Small-batch, made with mustard oil and homemade spices',
    categories: ['pickle'],
    featured: true,
    metaDescription:
      'Hitkram homemade raw mango pickle (aam ka achar) made in small batches with mustard oil and homemade spices. No artificial colours. 200 g, 500 g, 1 kg.',
    variants: [
      ['homemade-mango-pickle-aam-ka-achar-200-gm', '200 g'],
      ['homemade-mango-pickle-aam-ka-achar-500-gm', '500 g'],
      ['homemade-mango-pickle-aam-ka-achar-1-kg', '1 kg'],
    ],
    defaultVariant: '500 g',
  },
  {
    slug: 'rajasthani-kair-pickle',
    name: 'Rajasthani Kair Pickle (Teet ka Achar)',
    nameHi: 'राजस्थानी केर का अचार',
    tagline: 'A Rajasthani classic, made with fresh handmade spices',
    categories: ['pickle'],
    metaDescription:
      'Hitkram Rajasthani kair pickle (teet ka achar), homemade with fresh handmade spices. Authentic desert recipe. 200 g, 500 g, 1 kg.',
    variants: [
      ['kair-pickle-teet-ka-achar-200-gm', '200 g'],
      ['kair-pickle-teet-ka-achar-500-gm', '500 g'],
      ['kair-pickle-teet-ka-achar-1-kg', '1 kg'],
    ],
    defaultVariant: '500 g',
  },
  {
    slug: 'green-chilli-pickle-hari-mirch-ka-achar',
    name: 'Green Chilli Pickle (Hari Mirch ka Achar)',
    nameHi: 'हरी मिर्च का अचार',
    tagline: 'Homemade, tangy and spicy',
    categories: ['pickle'],
    metaDescription:
      'Hitkram homemade green chilli pickle (hari mirch ka achar) with fresh handmade spices and no artificial flavour. 200 g jar.',
    variants: [['green-chilli-pickle-hari-mirch-ka-achar-200-gm', '200 g']],
  },
  {
    slug: 'raw-forest-honey',
    name: 'Raw Forest Honey',
    nameHi: 'कच्चा जंगली शहद',
    tagline: 'Unheated, unprocessed, with no added sugar',
    categories: ['honey'],
    metaDescription:
      'Hitkram raw forest honey: unheated, unprocessed and non-pasteurised, with no added sugar or preservatives. 200 g and 500 g jars.',
    variants: [
      ['raw-pure-organic-natural-honey-200-gm', '200 g'],
      ['raw-pure-organic-natural-honey-500-gm', '500 g'],
    ],
    defaultVariant: '500 g',
  },
  {
    slug: 'a2-cow-ghee-mustard-oil-combo',
    name: 'A2 Cow Ghee + Mustard Oil Combo',
    nameHi: 'ए2 गाय घी + सरसों तेल कॉम्बो',
    tagline: 'Our two kitchen staples together, at a combo price',
    categories: ['combo-pack'],
    metaDescription:
      'Hitkram combo of A2 Desi Cow Bilona Ghee and Kachi Ghani black mustard oil at a special price. Free shipping above ₹1000.',
    variants: [['a2-desi-cow-ghee-with-mustard-oil-combo', 'Combo']],
  },
  {
    slug: 'buffalo-ghee-mustard-oil-combo',
    name: 'Buffalo Ghee + Mustard Oil Combo',
    nameHi: 'भैंस घी + सरसों तेल कॉम्बो',
    tagline: 'Buffalo bilona ghee with cold pressed mustard oil',
    categories: ['combo-pack', 'buffalo-bilona-ghee'],
    metaDescription:
      'Hitkram combo of Desi Buffalo Bilona Ghee and Kachi Ghani black mustard oil at a special price. Free shipping above ₹1000.',
    variants: [['buffalo-desi-ghee-with-mustard-oil-combo', 'Combo']],
  },
];

const PAGE_TITLES = {
  'our-story': 'Our Story',
  'terms-and-conditions': 'Terms & Conditions',
  'privacy-and-policy': 'Privacy Policy',
  'refund-and-cancellation': 'Refund & Cancellation Policy',
  'shipping-and-delivery': 'Shipping & Delivery Policy',
};

/** Point old hitkram.com image URLs at our own /uploads folder. */
function localImage(url) {
  if (!url) return url;
  const m = url.match(/^https?:\/\/(?:www\.)?hitkram\.com\/.*\/([^/?#]+\.(?:png|jpe?g|webp|gif|svg))$/i);
  return m ? `/uploads/${m[1]}` : url;
}

function localiseHtml(html) {
  return html
    .replace(/https?:\/\/(?:www\.)?hitkram\.com\/[^"'\s]*?\/([^/"'\s]+\.(?:png|jpe?g|webp|gif))/gi, '/uploads/$1')
    .replace(/https?:\/\/(?:www\.)?hitkram\.com\/product-detail\//gi, '/products/')
    .replace(/Hitkarm|Hikram/g, 'Hitkram');
}

function plain(html, max = 180) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, '')}…` : t;
}

async function main() {
  for (const [i, c] of catalog.categories.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, nameHi: CATEGORY_HI[c.slug], sortOrder: i },
      create: { slug: c.slug, name: c.name, nameHi: CATEGORY_HI[c.slug], sortOrder: i },
    });
  }
  const categories = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  let reviewCount = 0;
  for (const [i, def] of PRODUCTS.entries()) {
    const sources = def.variants.map(([slug]) => {
      if (!legacy[slug]) throw new Error(`Missing scraped product ${slug}`);
      return legacy[slug];
    });
    // Richest description/specs among the sizes becomes the product copy.
    const main = [...sources].sort((a, b) => b.descriptionHtml.length - a.descriptionHtml.length)[0];
    const data = {
      name: def.name,
      nameHi: def.nameHi,
      tagline: def.tagline,
      bullets: main.bullets,
      descriptionHtml: localiseHtml(main.descriptionHtml),
      specs: (sources.find((s) => s.specs.length) || main).specs,
      metaTitle: `${def.name} | Hitkram`,
      metaDescription: def.metaDescription,
      isFeatured: Boolean(def.featured),
      sortOrder: i,
    };
    const product = await prisma.product.upsert({
      where: { slug: def.slug },
      update: upd(data),
      create: { slug: def.slug, ...data },
    });

    await prisma.productCategory.createMany({
      data: def.categories.map((c) => ({ productId: product.id, categoryId: categories[c] })),
      skipDuplicates: true,
    });

    for (const [j, [legacySlug, label]] of def.variants.entries()) {
      const src = legacy[legacySlug];
      const sku = `${def.slug}-${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const v = {
        productId: product.id,
        label,
        legacySlug,
        mrp: src.mrp ?? src.price,
        price: src.price,
        inStock: src.inStock,
        isDefault: label === (def.defaultVariant ?? def.variants[0][1]),
        images: src.gallery.map(localImage),
        sortOrder: j,
      };
      await prisma.variant.upsert({ where: { sku }, update: upd(v), create: { sku, ...v } });

      for (const r of src.reviews) {
        await prisma.review.upsert({
          where: { legacyId: r.legacyId },
          update: {},
          create: {
            productId: product.id,
            legacyId: r.legacyId,
            name: r.name.slice(0, 60),
            rating: Math.min(5, Math.max(1, r.rating)),
            body: r.body,
            verified: r.verified,
            images: r.images.map(localImage),
            status: 'APPROVED',
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          },
        });
        reviewCount += 1;
      }
    }
  }

  for (const b of catalog.blogs) {
    const cover = localImage(b.cover);
    const coverUrl = cover?.startsWith('/uploads/') ? cover : null;
    let bodyHtml = localiseHtml(b.bodyHtml)
      // Images hosted on Google Drive "view" pages never rendered on the old site either.
      .replace(/<img[^>]*src="https?:\/\/drive\.google\.com[^"]*"[^>]*\/?>/gi, '');
    // The cover is usually the post's first image; don't show it twice.
    if (coverUrl) bodyHtml = bodyHtml.replace(new RegExp(`<img[^>]*src="${coverUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*\/?>`), '');
    const data = {
      title: b.title,
      excerpt: plain(b.bodyHtml),
      coverUrl,
      bodyHtml,
      publishedAt: b.date ? new Date(b.date.replace(' ', 'T') + '+05:30') : new Date(),
    };
    await prisma.blogPost.upsert({ where: { slug: b.slug }, update: upd(data), create: { slug: b.slug, ...data } });
  }

  for (const p of catalog.pages) {
    const data = { title: PAGE_TITLES[p.slug] || p.title, bodyHtml: localiseHtml(p.bodyHtml) };
    await prisma.page.upsert({ where: { slug: p.slug }, update: upd(data), create: { slug: p.slug, ...data } });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const exists = await prisma.adminUser.findUnique({ where: { email } });
    if (!exists) {
      await prisma.adminUser.create({ data: { email, passwordHash: await bcrypt.hash(password, 12) } });
      console.log(`Created admin ${email}`);
    }
  }

  console.log(
    `Seeded ${PRODUCTS.length} products, ${await prisma.variant.count()} sizes, ` +
      `${await prisma.review.count()} reviews (${reviewCount} rows read), ` +
      `${catalog.blogs.length} blog posts, ${catalog.pages.length} pages.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
