# Hitkram Store

Headless online store for [Hitkram](https://hitkram.com): farm-made A2 desi cow ghee, buffalo ghee,
kachi ghani mustard oil, pickles and honey.

| Part | Folder | Tech |
| --- | --- | --- |
| API (products, cart pricing, orders, payments, admin) | `api/` | Node.js, Express, PostgreSQL, Prisma |
| Storefront + admin panel | `web/` | React 19, Next.js 15 (App Router) |

The storefront calls the API through its own domain (`/api/*` and `/uploads/*` are proxied by
Next.js), so shoppers only ever see one website.

## What's included

- **Catalogue migrated from the old site**: 9 products / 23 sizes with the live prices and MRPs,
  252 photos, 164 reviews, 9 blog posts and the policy pages (`api/data/catalog.json`,
  `api/uploads/`). Reviewer phone numbers were deliberately **not** copied.
- **Shop**: home, categories, search, product pages with a size picker, cart, checkout
  (Cash on Delivery and Razorpay), order confirmation, order tracking, blog, policies, contact.
- **SEO**: Product schema (rating, price, stock) for Google rich results, breadcrumbs, FAQ and
  organisation schema, sitemap, robots.txt, canonical URLs, real 404 pages, and 301 redirects from
  every old hitkram.com URL (e.g. `/products/a2-desi-cow-ghee-1-liter`, `/categorie/pickle`,
  `/our-blogs/blog-details/...`).
- **Admin** at `/admin`: orders (status, payment, courier link, WhatsApp update), products
  (prices, MRP, stock, sizes, photos, SEO text), review approval, pages and blog.

## Run locally

Requirements: Node.js 20+, PostgreSQL 14+.

```bash
# 1. API
cd api
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
npm install
npm run db:migrate            # create tables
npm run db:seed               # load the migrated catalogue + create the admin user
npm run dev                   # http://localhost:4000

# 2. Storefront (new terminal)
cd web
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000  (admin: /admin)
```

`npm run db:seed` only adds missing rows, so it never overwrites edits made in the admin.
`npm run db:seed -- --overwrite` resets products/blog/pages to the migrated content.

## Tests

```bash
cd api && npm test     # needs a separate test database: copy .env to .env.test with another DB name
cd web && npm run lint && npm run build
```

## Deploying

1. **Database**: any managed PostgreSQL (Neon, Supabase, Railway, Render).
2. **API**: a Node host with a persistent disk for `uploads/` (Railway, Render, a VPS).
   Set the variables from `api/.env.example`, run `npm run db:migrate && npm run db:seed`, start with
   `npm start`. Set `WEB_ORIGIN` to the shop's URL and a strong `JWT_SECRET`.
3. **Storefront**: Vercel (or any Node host). Set `API_URL` to the API's URL and
   `NEXT_PUBLIC_SITE_URL=https://hitkram.com`.
4. **Razorpay**: add the key id/secret to the API, and create a webhook in the Razorpay dashboard
   pointing to `https://<api-host>/api/payments/razorpay/webhook` for `payment.captured`,
   `order.paid` and `payment.failed`, using `RAZORPAY_WEBHOOK_SECRET`.
5. Point `hitkram.com` at the storefront and submit `https://hitkram.com/sitemap.xml` in Google
   Search Console.

## Before launch: owner checklist

- [ ] Confirm the shipping fee under ₹1000 (`SHIPPING_FEE`, currently a placeholder of ₹80).
- [ ] Review the homepage FAQ answers (`web/app/(store)/page.js`).
- [ ] Add the FSSAI licence number to the footer (`web/components/Footer.js`).
- [ ] Review health claims in product descriptions (editable in Admin → Products).
- [ ] Set a strong admin password and `JWT_SECRET`.
