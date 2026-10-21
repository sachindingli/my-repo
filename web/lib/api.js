// Server-side data fetching from the Node.js API. Pages are cached and refreshed every 60 s,
// so price/stock edits in the admin show up within a minute without a redeploy.
import 'server-only';

const API_URL = process.env.API_URL || 'http://localhost:4000';

/** Where uploaded images live; next/image fetches them server-side, so this can be a private URL. */
export const API_BASE = API_URL;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function get(path, { revalidate = 60 } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, { next: { revalidate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, `API ${path} failed with ${res.status}`);
  return res.json();
}

export const getCategories = () => get('/categories');
export const getProducts = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return get(`/products${qs ? `?${qs}` : ''}`);
};
export const getProduct = (slug) => get(`/products/${encodeURIComponent(slug)}`);
export const getLegacyProduct = (slug) => get(`/legacy/${encodeURIComponent(slug)}`, { revalidate: 3600 });
export const getBlogs = () => get('/blogs', { revalidate: 300 });
export const getBlog = (slug) => get(`/blogs/${encodeURIComponent(slug)}`, { revalidate: 300 });
export const getPage = (slug) => get(`/pages/${encodeURIComponent(slug)}`, { revalidate: 300 });
export const getSitemapData = () => get('/sitemap', { revalidate: 3600 });

/** Absolute URL for an uploaded image, for next/image and JSON-LD. */
export const imageUrl = (path) => (!path ? null : path.startsWith('http') ? path : `${API_URL}${path}`);
