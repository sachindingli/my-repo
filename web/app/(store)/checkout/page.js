import CheckoutView from '@/components/CheckoutView';

export const metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container">
      <CheckoutView />
    </div>
  );
}
