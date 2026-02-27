'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCENT = '#B5D334';

export default function PaymentSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [show, setShow] = useState(false);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      router.push('/dashboard');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

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
        {/* Animated checkmark */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: `rgba(181,211,52,0.12)`,
            border: `2px solid rgba(181,211,52,0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            transform: show ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <span style={{ fontSize: 44 }}>✅</span>
        </div>

        {/* Pulse ring */}
        <style>{`
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(181,211,52,0.35); }
            70% { box-shadow: 0 0 0 20px rgba(181,211,52,0); }
            100% { box-shadow: 0 0 0 0 rgba(181,211,52,0); }
          }
        `}</style>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, calc(-50% - 60px))',
            width: 96,
            height: 96,
            borderRadius: '50%',
            animation: show ? 'pulse-ring 2s ease-out infinite' : 'none',
            pointerEvents: 'none',
          }}
        />

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
          Оплата прошла успешно!
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 32,
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.5s ease 0.35s',
          }}
        >
          Кредиты уже начислены на ваш аккаунт
        </p>

        <div
          style={{
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
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(181,211,52,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Перейти в дашборд
          </a>

          <p
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12,
              marginTop: 16,
            }}
          >
            Автоматический переход через {countdown} сек...
          </p>
        </div>
      </div>
    </div>
  );
}
