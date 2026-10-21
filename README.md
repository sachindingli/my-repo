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
  `web/public/uploads/`). Reviewer phone numbers were deliberately **not** copied.
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

## Deploying on Vercel

Everything runs on one Vercel account as **two projects** from this repository:

| Vercel project | Root directory | What it is |
| --- | --- | --- |
| `hitkram-api` | `api` | Node.js API (Express runs as a Vercel Function via `api/api/index.js`) |
| `hitkram-web` | `web` | The shop and admin (Next.js) |

Storage, added from the API project's **Storage** tab:

- **Neon Postgres**: sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.
- **Blob**: sets `BLOB_READ_WRITE_TOKEN` automatically, for photos uploaded in the admin.

The migrated catalogue photos are in `web/public/uploads` and are served from Vercel's CDN.

On every API deploy, `vercel-build` runs `prisma migrate deploy` and the seed, which only adds
missing rows (it never overwrites edits made in the admin).

### 1. API project

1. Vercel → **Add New → Project** → import this repository → **Root Directory: `api`**.
2. Environment variables: `JWT_SECRET` (random, 32+ characters), `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `SHIPPING_FEE`, `FREE_SHIPPING_MIN`, `COD_ENABLED=true`, and `WEB_ORIGIN` (the shop's URL).
3. Storage tab → connect **Neon** (Postgres) and **Blob**. Then **Redeploy**.
4. Check `https://<api-project>.vercel.app/api/health` shows `{"ok":true}`.

### 2. Shop project

1. **Add New → Project** → same repository → **Root Directory: `web`**.
2. Environment variables: `API_URL=https://<api-project>.vercel.app` and
   `NEXT_PUBLIC_SITE_URL=https://hitkram.com` (use the `.vercel.app` URL until the domain is moved).
3. Deploy. The API must be deployed first, because the shop pre-builds product pages from it.

### 3. Domain

Shop project → **Settings → Domains** → add `hitkram.com` and `www.hitkram.com`, then add the DNS
records Vercel shows at your domain registrar (Hostinger). Set `NEXT_PUBLIC_SITE_URL` and the
API's `WEB_ORIGIN` to `https://hitkram.com` and redeploy both. Submit
`https://hitkram.com/sitemap.xml` in Google Search Console.

### 4. Online payments (optional)

Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` to the API project.
In the Razorpay dashboard, create a webhook to `https://<api-project>.vercel.app/api/payments/razorpay/webhook`
for `payment.captured`, `order.paid` and `payment.failed`.

### Notes

- Vercel's Hobby plan is for non-commercial use; a shop needs the **Pro** plan.
- Admin photo uploads are resized in the browser (max 1600 px, WebP) to stay under Vercel's request size limit.
- Rate limits (orders, reviews, login) are per function instance on serverless; they slow down abuse but
  are not a hard guarantee.

## Before launch: owner checklist

- [ ] Confirm the shipping fee under ₹1000 (`SHIPPING_FEE`, currently a placeholder of ₹80).
- [ ] Review the homepage FAQ answers (`web/app/(store)/page.js`).
- [ ] Add the FSSAI licence number to the footer (`web/components/Footer.js`).
- [ ] Review health claims in product descriptions (editable in Admin → Products).
- [ ] Set a strong admin password and `JWT_SECRET`.
