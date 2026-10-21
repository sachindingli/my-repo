const API_URL = process.env.API_URL || 'http://localhost:4000';
const api = new URL(API_URL);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Photos uploaded in the admin (Vercel Blob).
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Local development: admin uploads saved on the API's disk.
      { protocol: api.protocol.replace(':', ''), hostname: api.hostname, port: api.port, pathname: '/uploads/**' },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // The browser talks to the API through the storefront's own domain (no CORS, one origin).
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      // Only reached for files not in web/public/uploads (local admin uploads in development).
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
  // Old hitkram.com URLs → new pages, so Google rankings and shared links keep working.
  async redirects() {
    return [
      { source: '/our-products', destination: '/products', permanent: true },
      { source: '/categorie/:slug', destination: '/category/:slug', permanent: true },
      { source: '/product-detail/:slug', destination: '/products/:slug', permanent: true },
      { source: '/our-blogs', destination: '/blog', permanent: true },
      { source: '/our-blogs/blog-details/:slug', destination: '/blog/:slug', permanent: true },
      { source: '/shopping-cart', destination: '/cart', permanent: true },
      { source: '/review-us', destination: '/products', permanent: true },
      { source: '/login', destination: '/track-order', permanent: false },
      { source: '/register', destination: '/track-order', permanent: false },
      { source: '/my-profile', destination: '/track-order', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/uploads/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }],
      },
      {
        source: '/brand/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
