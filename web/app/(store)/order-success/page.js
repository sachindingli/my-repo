import { OrderSuccess } from '@/components/OrderStatus';

export const metadata = { title: 'Order placed', robots: { index: false } };

export default async function OrderSuccessPage({ searchParams }) {
  const { number = '' } = await searchParams;
  return (
    <div className="container">
      <OrderSuccess number={String(number).slice(0, 20)} />
    </div>
  );
}
