import CartView from '@/components/CartView';

export const metadata = { title: 'Your Cart', robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container">
      <CartView />
    </div>
  );
}
