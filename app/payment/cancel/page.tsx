'use client';

import { useEffect, useState } from 'react';

const ACCENT = '#B5D334';

export default function PaymentCancel() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#0A0A0A' }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          padding: 40,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'rgba(255,80,80,0.1)',
            border: '2px solid rgba(255,80,80,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            transform: show ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <span style={{ fontSize: 44 }}>😔</span>
        </div>

        <h1
          style={{
            color: '#fff',
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 10,
            fontFamily: 'var(--font-unbounded)',
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.5s ease 0.2s',
          }}
        >
          Оплата не завершена
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 36,
            maxWidth: 360,
            margin: '0 auto 36px',
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.5s ease 0.35s',
          }}
        >
          Что-то пошло не так, или вы отменили оплату. Деньги не списаны.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.5s ease 0.5s',
          }}
        >
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              background: ACCENT,
              color: '#0A0A0A',
              fontWeight: 600,
              fontSize: 15,
              padding: '14px 28px',
              borderRadius: 12,
              textDecoration: 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = `0 4px 24px rgba(181,211,52,0.35)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Попробовать снова
          </a>

          <button
            onClick={() => window.open('https://t.me/creatika_product_bot', '_blank')}
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 600,
              fontSize: 14,
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            Написать в поддержку
          </button>
        </div>
      </div>
    </div>
  );
}
