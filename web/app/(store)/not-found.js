import Link from 'next/link';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container empty">
      <h1>Sorry, we couldn’t find that page</h1>
      <p className="muted">The link may be old or mistyped. Try one of these instead:</p>
      <p style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-primary">Home</Link>
        <Link href="/products" className="btn btn-outline">All products</Link>
        <Link href="/contact-us" className="btn btn-outline">Contact us</Link>
      </p>
    </div>
  );
}
