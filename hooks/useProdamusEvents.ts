'use client';

import { useEffect } from 'react';

export function useProdamusEvents(callbacks: {
  onSuccess?: () => void;
  onClose?: () => void;
  onWaiting?: () => void;
}) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.status === 'success') {
        callbacks.onSuccess?.();
      }
      if (event.data?.status === 'close') {
        callbacks.onClose?.();
      }
      if (event.data?.status === 'waiting') {
        callbacks.onWaiting?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [callbacks]);
}
