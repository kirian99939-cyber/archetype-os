'use client';

import { signIn, useSession } from 'next-auth/react';
import { useProdamus } from '@/hooks/useProdamus';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

interface PricingSectionProps {
  isLoggedIn?: boolean;
  onSelectPlan?: (planId: string) => void;
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Попробовать сервис',
    credits: 3,
    price: 0,
    oldPrice: null,
    perCredit: null,
    badge: null,
    highlighted: false,
    features: [
      { text: '26 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: '3 формата баннеров', included: true },
      { text: 'История проектов', included: true },
      { text: 'Приоритетная генерация', included: false },
      { text: 'До 5 архетипов на проект', included: false },
      { text: 'Поддержка в Telegram', included: false },
      { text: 'Ранний доступ к фичам', included: false },
    ],
    cta: 'Начать бесплатно',
  },
  {
    id: 'start',
    name: 'Старт',
    description: 'Для фрилансеров и SMM',
    credits: 5,
    price: 1490,
    oldPrice: 2990,
    perCredit: 298,
    badge: null,
    highlighted: false,
    features: [
      { text: '26 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: '3 формата баннеров', included: true },
      { text: 'История проектов', included: true },
      { text: 'Скачивание в HD', included: true },
      { text: 'До 3 архетипов на проект', included: true },
      { text: 'Поддержка в Telegram', included: false },
      { text: 'Ранний доступ к фичам', included: false },
    ],
    cta: 'Выбрать Старт',
  },
  {
    id: 'pro',
    name: 'Про',
    description: 'Для маркетологов и агентств',
    credits: 20,
    price: 4990,
    oldPrice: 9990,
    perCredit: 250,
    badge: 'ЛУЧШИЙ ВЫБОР',
    highlighted: true,
    features: [
      { text: '26 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: '3 формата баннеров', included: true },
      { text: 'История проектов', included: true },
      { text: 'Скачивание в HD', included: true },
      { text: 'До 5 архетипов на проект', included: true },
      { text: 'Приоритетная генерация', included: true },
      { text: 'Поддержка в Telegram', included: true },
    ],
    cta: 'Выбрать Про',
  },
  {
    id: 'business',
    name: 'Бизнес',
    description: 'Для команд и продакшн',
    credits: 50,
    price: 9990,
    oldPrice: 24990,
    perCredit: 200,
    badge: 'ДЛЯ КОМАНД',
    highlighted: false,
    features: [
      { text: '26 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: '3 формата баннеров', included: true },
      { text: 'История проектов', included: true },
      { text: 'Скачивание в HD', included: true },
      { text: 'До 5 архетипов на проект', included: true },
      { text: 'Приоритетная генерация', included: true },
      { text: 'Поддержка в Telegram', included: true },
      { text: 'Ранний доступ к фичам', included: true },
      { text: 'Персональная поддержка', included: true },
    ],
    cta: 'Выбрать Бизнес',
  },
];

function formatPrice(n: number): string {
  return n.toLocaleString('ru-RU');
}

export default function PricingSection({ isLoggedIn, onSelectPlan }: PricingSectionProps) {
  const { data: session } = useSession();
  const { payWithDetails } = useProdamus();

  const handleClick = (plan: typeof PLANS[number]) => {
    // Free план — просто логин
    if (plan.price === 0) {
      if (isLoggedIn) {
        // Уже залогинен с бесплатным планом — ничего не делаем
        return;
      }
      signIn('google', { callbackUrl: '/dashboard' });
      return;
    }

    // Платные планы — нужна авторизация
    if (!isLoggedIn && !session) {
      signIn('google', { callbackUrl: '/dashboard' });
      return;
    }

    // Если есть внешний обработчик — делегируем
    if (onSelectPlan) {
      onSelectPlan(plan.id);
      return;
    }

    // Открываем оплату через Prodamus
    payWithDetails({
      order_sum: plan.price,
      currency: 'rub',
      customer_email: session?.user?.email || '',
      order_id: `creatika_${plan.id}_${Date.now()}`,
      products: [
        {
          name: `Creatika — тариф ${plan.name} (${plan.credits} кредитов)`,
          price: plan.price,
          quantity: 1,
        },
      ],
      urlSuccess: `${window.location.origin}/payment/success`,
      urlReturn: `${window.location.origin}/payment/cancel`,
    });
  };

  return (
    <div>
      {/* Beta badge */}
      <div className="text-center mb-10">
        <span
          className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-5"
          style={{ background: 'rgba(255,180,0,0.12)', color: '#FFB400', border: '1px solid rgba(255,180,0,0.25)' }}
        >
          🔥 Цена раннего доступа — скоро повысим
        </span>
        <h2
          className="font-extrabold mb-3"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.2 }}
        >
          Тарифы
        </h2>
        <p className="text-sm mx-auto" style={{ color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.65 }}>
          1 кредит = 1 проект с полным пакетом баннеров.<br />
          Дизайнер берёт от 5 000 ₽ за то же самое.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className="relative flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: plan.highlighted
                ? 'linear-gradient(180deg, rgba(200,255,0,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                : 'rgba(255,255,255,0.03)',
              border: plan.highlighted
                ? `2px solid ${ACCENT}`
                : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Badge */}
            {plan.badge && (
              <div
                className="text-center py-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: plan.highlighted ? ACCENT : 'rgba(255,255,255,0.08)',
                  color: plan.highlighted ? '#0A0A0A' : 'rgba(255,255,255,0.6)',
                }}
              >
                {plan.badge}
              </div>
            )}

            <div className="p-5 flex flex-col flex-1">
              {/* Name + description */}
              <h3 className="text-white font-bold text-lg">{plan.name}</h3>
              <p className="text-white/40 text-xs mt-0.5 mb-4">{plan.description}</p>

              {/* Price */}
              <div className="mb-1">
                {plan.oldPrice && (
                  <span className="text-white/25 text-sm line-through mr-2">
                    {formatPrice(plan.oldPrice)} ₽
                  </span>
                )}
                <span className="text-white font-extrabold text-2xl">
                  {plan.price === 0 ? '0 ₽' : `${formatPrice(plan.price)} ₽`}
                </span>
              </div>

              {/* Per credit */}
              {plan.perCredit ? (
                <p className="text-white/30 text-xs mb-4">
                  {formatPrice(plan.perCredit)} ₽ за кредит
                </p>
              ) : (
                <p className="text-white/30 text-xs mb-4">
                  {plan.credits} кредита при регистрации
                </p>
              )}

              {/* CTA */}
              <button
                onClick={() => handleClick(plan)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-5"
                style={
                  plan.highlighted
                    ? { background: ACCENT, color: '#0A0A0A' }
                    : plan.price === 0 && isLoggedIn
                    ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', cursor: 'default' }
                    : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }
                }
              >
                {plan.price === 0 && isLoggedIn ? 'Текущий план' : plan.cta}
              </button>

              {/* Credits badge */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
              >
                <span style={{ color: ACCENT }}>⚡</span>
                <span className="text-sm font-semibold" style={{ color: ACCENT }}>
                  {plan.credits} кредитов
                </span>
              </div>

              {/* Features */}
              <div className="space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="text-xs mt-0.5 shrink-0"
                      style={{ color: f.included ? ACCENT : 'rgba(255,255,255,0.15)' }}
                    >
                      {f.included ? '✓' : '✕'}
                    </span>
                    <span
                      className="text-xs leading-snug"
                      style={{ color: f.included ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}
                    >
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom note */}
      <p className="text-center text-white/20 text-xs mt-6">
        Все тарифы — разовая оплата, кредиты не сгорают
      </p>
    </div>
  );
}
