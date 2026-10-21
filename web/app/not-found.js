import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StoreNotFound from './(store)/not-found';

export { metadata } from './(store)/not-found';

// Unmatched URLs (outside any route group) still get the full store layout and a real 404 status.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main"><StoreNotFound /></main>
      <Footer />
    </>
  );
}
