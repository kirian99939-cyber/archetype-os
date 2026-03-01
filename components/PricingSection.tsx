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
    description: 'Попробуйте бесплатно — хватит на 1 полный проект',
    credits: 100,
    price: 0,
    oldPrice: null,
    perCredit: null,
    badge: null,
    highlighted: false,
    features: [
      { text: '1 полный проект', included: true },
      { text: 'Анализ архетипов', included: true },
      { text: '28 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: 'Приоритетная генерация', included: false },
      { text: 'Поддержка в Telegram', included: false },
    ],
    cta: 'Начать бесплатно',
  },
  {
    id: 'start',
    name: 'Старт',
    description: 'Для малого бизнеса',
    credits: 400,
    price: 1990,
    oldPrice: 3990,
    perCredit: null,
    perBanner: '~50₽ за баннер',
    badge: null,
    highlighted: false,
    features: [
      { text: '~4 полных проекта', included: true },
      { text: '28 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: '6 форматов баннеров', included: true },
      { text: 'Скачивание в HD', included: true },
      { text: 'История проектов', included: true },
      { text: 'Поддержка в Telegram', included: false },
    ],
    cta: 'Начать за 1 990₽',
  },
  {
    id: 'pro',
    name: 'Про',
    description: 'Для агентств и маркетологов',
    credits: 1500,
    price: 6990,
    oldPrice: 13990,
    perCredit: null,
    perBanner: '~47₽ за баннер',
    badge: 'ЛУЧШИЙ ВЫБОР',
    highlighted: true,
    features: [
      { text: '~16 проектов', included: true },
      { text: '28 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: '6 форматов баннеров', included: true },
      { text: 'Скачивание в HD', included: true },
      { text: 'История проектов', included: true },
      { text: 'Приоритетная генерация', included: true },
      { text: 'Поддержка в Telegram', included: true },
    ],
    cta: 'Выбрать Про за 6 990₽',
  },
  {
    id: 'business',
    name: 'Бизнес',
    description: 'Максимум возможностей',
    credits: 3000,
    price: 12990,
    oldPrice: 25990,
    perCredit: null,
    perBanner: '~43₽ за баннер',
    badge: 'ДЛЯ КОМАНД',
    highlighted: false,
    features: [
      { text: '~33 проекта', included: true },
      { text: '28 архетипов', included: true },
      { text: 'AI-анализ бренда', included: true },
      { text: '6 форматов баннеров', included: true },
      { text: 'Скачивание в HD', included: true },
      { text: 'История проектов', included: true },
      { text: 'Приоритетная генерация', included: true },
      { text: 'Поддержка в Telegram', included: true },
      { text: 'Ранний доступ к фичам', included: true },
      { text: 'Персональная поддержка', included: true },
    ],
    cta: 'Выбрать Бизнес за 12 990₽',
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
      {/* Discount banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 12,
        padding: '12px 24px',
        textAlign: 'center',
        marginBottom: 32,
      }}>
        <span style={{ fontSize: 15, color: '#fff' }}>
          🔥 <strong>Спецусловия запуска:</strong> скидка 50% на все тарифы до 31 марта
        </span>
      </div>

      <div className="text-center mb-10">
        <h2
          className="font-extrabold mb-3"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.2 }}
        >
          Тарифы
        </h2>
        <p className="text-sm mx-auto" style={{ color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.65 }}>
          10 кредитов = 1 гипотеза или 1 баннер.<br />
          Анализ архетипов — бесплатно.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto" style={{ alignItems: 'start' }}>
        {PLANS.map(plan => {
          const isPro = plan.id === 'pro';
          const isBusiness = plan.id === 'business';

          // Card styles per plan
          const cardStyle: React.CSSProperties = {
            position: 'relative',
            overflow: 'visible',
            background: isPro
              ? 'rgba(181,211,52,0.05)'
              : isBusiness
              ? 'rgba(255,215,0,0.03)'
              : 'rgba(255,255,255,0.03)',
            border: isPro
              ? '2px solid #B5D334'
              : isBusiness
              ? '1px solid rgba(255,215,0,0.3)'
              : '1px solid rgba(255,255,255,0.1)',
            transform: isPro ? 'scale(1.03)' : undefined,
          };

          // Button styles per plan
          const btnStyle: React.CSSProperties = isPro
            ? { background: '#B5D334', color: '#000' }
            : isBusiness
            ? { background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }
            : plan.price === 0 && isLoggedIn
            ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', cursor: 'default' }
            : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' };

          return (
            <div
              key={plan.id}
              className="relative flex flex-col rounded-2xl"
              style={cardStyle}
            >
              {/* Floating badge — Pro */}
              {isPro && (
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#B5D334',
                  color: '#000',
                  padding: '4px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                }}>
                  ⭐ Лучший выбор
                </div>
              )}

              {/* Floating badge — Business */}
              {isBusiness && (
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#000',
                  padding: '4px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                }}>
                  💰 Супер выгодно
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                {/* Name + description */}
                <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                <p className="text-white/40 text-xs mt-0.5 mb-4">{plan.description}</p>

                {/* Price */}
                <div style={{ marginBottom: 16 }}>
                  {plan.oldPrice ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through' }}>
                          {formatPrice(plan.oldPrice)}₽
                        </span>
                        <span style={{
                          background: 'rgba(239,68,68,0.15)',
                          color: '#ef4444',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>-50%</span>
                      </div>
                      <span style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>
                        {formatPrice(plan.price)}₽
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>
                      {plan.price === 0 ? '0 ₽' : `${formatPrice(plan.price)}₽`}
                    </span>
                  )}
                </div>

                {/* Per banner */}
                {(plan as any).perBanner && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                    {(plan as any).perBanner}
                  </p>
                )}

                {/* Highlight subtitle */}
                {isPro && (
                  <p style={{ fontSize: 12, color: '#B5D334', marginTop: 4 }}>
                    Самый популярный
                  </p>
                )}
                {isBusiness && (
                  <p style={{ fontSize: 12, color: '#FFD700', marginTop: 4 }}>
                    Экономия 30% за кредит
                  </p>
                )}

                {/* Per credit */}
                <p className="text-white/30 text-xs mb-4">
                  {plan.price === 0
                    ? `${plan.credits} кредитов при регистрации`
                    : `${plan.credits} кредитов`}
                </p>

                {/* CTA */}
                <button
                  onClick={() => handleClick(plan)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-5"
                  style={btnStyle}
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
          );
        })}
      </div>

      {/* Bottom note */}
      <p className="text-center text-white/20 text-xs mt-6">
        Все тарифы — разовая оплата, кредиты не сгорают
      </p>
    </div>
  );
}
