import { TrackOrder } from '@/components/OrderStatus';

export const metadata = {
  title: 'Track Your Order',
  description: 'Check the status of your Hitkram order with your order number and mobile number.',
  alternates: { canonical: '/track-order' },
};

export default function TrackOrderPage() {
  return (
    <div className="container">
      <TrackOrder />
    </div>
  );
}
