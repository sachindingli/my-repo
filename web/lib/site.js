export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Public absolute URL (uploads are served on the storefront domain via a rewrite). */
export const absoluteUrl = (path) => (!path ? null : path.startsWith('http') ? path : `${SITE_URL}${path}`);

export const site = {
  name: 'Hitkram',
  tagline: 'Farm-made A2 ghee, cold pressed oil, pickles and honey',
  phone: '+91 99200 93004',
  phoneHref: 'tel:+919920093004',
  whatsapp: '919920093004',
  email: 'info@hitkram.com',
  address: {
    line1: 'Hitkram Farm, Village Deengli',
    line2: 'Rajgarh, Dist. Churu',
    city: 'Rajgarh',
    region: 'Rajasthan',
    postalCode: '331305',
    country: 'IN',
  },
  mapUrl: 'https://maps.app.goo.gl/Tf34XZabu7LbMUuc7',
  social: {
    facebook: 'https://www.facebook.com/hitkram',
    instagram: 'https://www.instagram.com/hitkram_official/',
    youtube: 'https://www.youtube.com/@hitkram',
  },
  freeShippingMin: 1000,
};

export const whatsappLink = (text = 'Hi Hitkram, I would like to order') =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
