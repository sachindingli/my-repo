import { Breadcrumbs } from '@/components/ui';
import { PhoneIcon, WhatsAppIcon } from '@/components/Icons';
import { site, whatsappLink } from '@/lib/site';

export const metadata = {
  title: 'Contact Us',
  description: 'Call, WhatsApp or email Hitkram Farm in Deengli, Rajgarh (Churu), Rajasthan for orders, bulk enquiries and help with your order.',
  alternates: { canonical: '/contact-us' },
};

export default function ContactPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact us' }]} />
      <section className="section-tight prose">
        <h1>Contact us</h1>
        <p className="muted">The fastest way to reach us is WhatsApp. We usually reply within a few hours, Monday to Saturday.</p>
        <div className="form-grid two" style={{ marginTop: 16 }}>
          <a className="radio-card" href={whatsappLink('Hi Hitkram, I need help')} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            <WhatsAppIcon style={{ color: '#25d366' }} />
            <span><strong>WhatsApp</strong><br />{site.phone}</span>
          </a>
          <a className="radio-card" href={site.phoneHref} style={{ textDecoration: 'none', color: 'inherit' }}>
            <PhoneIcon />
            <span><strong>Call us</strong><br />{site.phone}</span>
          </a>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: '1.15rem' }}>Hitkram Farm</h2>
          <address style={{ fontStyle: 'normal' }}>
            {site.address.line1}<br />
            {site.address.line2}, {site.address.region} {site.address.postalCode}
          </address>
          <p style={{ marginTop: 10 }}>
            Email: <a href={`mailto:${site.email}`}>{site.email}</a><br />
            <a href={site.mapUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps →</a>
          </p>
        </div>
      </section>
    </div>
  );
}
