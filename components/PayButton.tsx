'use client';

import { useProdamus } from '@/hooks/useProdamus';

interface PayButtonProps {
  amount: number;
  productName: string;
  userEmail?: string;
  orderId?: string;
}

export default function PayButton({ amount, productName, userEmail, orderId }: PayButtonProps) {
  const { payWithDetails } = useProdamus();

  const handlePay = () => {
    payWithDetails({
      order_sum: amount,
      currency: 'rub',
      customer_email: userEmail,
      order_id: orderId,
      products: [
        {
          name: productName,
          price: amount,
          quantity: 1,
        },
      ],
      urlSuccess: `${window.location.origin}/payment/success`,
      urlReturn: `${window.location.origin}/payment/cancel`,
    });
  };

  return (
    <button
      onClick={handlePay}
      className="px-6 py-3 rounded-xl font-medium transition-all"
      style={{
        background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
        color: '#fff',
      }}
    >
      Оплатить {amount} ₽
    </button>
  );
}
