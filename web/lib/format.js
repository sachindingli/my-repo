const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const rupees = (n) => inr.format(n || 0);

export const discountPct = (mrp, price) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Rich text from the old site: make images lazy so long descriptions don't slow the page. */
export const lazyHtml = (html = '') => html.replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');

export const ORDER_STATUS_LABEL = {
  PENDING_PAYMENT: 'Awaiting payment',
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};
