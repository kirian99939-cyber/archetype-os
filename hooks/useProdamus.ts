'use client';

declare global {
  interface Window {
    prodamusPay?: (amount: number, currency?: string) => void;
    payformInit?: (domain: string, params: ProdamusParams) => void;
  }
}

interface ProdamusParams {
  order_sum: number;
  currency?: string;
  customer_email?: string;
  customer_phone?: string;
  order_id?: string;
  products?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  urlSuccess?: string;
  urlReturn?: string;
  // Произвольные параметры для передачи в webhook
  [key: string]: unknown;
}

const PAYFORM_DOMAIN = 'pikaevdmitriy.payform.ru';

export function useProdamus() {
  /**
   * Простой вызов — открывает виджет с указанной суммой
   */
  const pay = (amount: number, currency?: string) => {
    if (window.prodamusPay) {
      window.prodamusPay(amount, currency);
    } else {
      console.error('Prodamus widget not loaded');
    }
  };

  /**
   * Расширенный вызов — с параметрами заказа
   */
  const payWithDetails = (params: ProdamusParams) => {
    if (window.payformInit) {
      window.payformInit(PAYFORM_DOMAIN, params);
    } else {
      console.error('Prodamus widget not loaded');
    }
  };

  return { pay, payWithDetails };
}
