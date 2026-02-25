'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ARCHETYPES } from '@/lib/archetypes';

const NAV_LINKS = ['Как работает', 'Архетипы', 'Кейсы', 'Цены'];

const STEPS = [
  {
    step: '01', title: 'Архетип', icon: '◈',
    desc: 'Опишите бренд или загрузите данные. AI определит архетип и психотип вашей аудитории из 26 профилей.',
  },
  {
    step: '02', title: 'Идея', icon: '⚡',
    desc: 'Система генерирует концепцию под выбранный архетип: тон, посыл и эмоциональный крючок для аудитории.',
  },
  {
    step: '03', title: 'Баннер', icon: '▦',
    desc: 'Готовый рекламный баннер с текстами, цветами и композицией, настроенной под психологию аудитории.',
  },
];

const STATS = [
  { value: '+37%', label: 'рост CTR',  sub: 'по сравнению с ручными креативами', icon: '↗' },
  { value: '4.2ч', label: 'экономии', sub: 'на каждый рекламный пакет',          icon: '◷' },
  { value: '−62%', label: 'правок',   sub: 'клиент одобряет с первого раза',     icon: '✓' },
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  const handleSignIn = () => signIn('google', { callbackUrl: '/dashboard' });

  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* ─────────────────────────── NAV ─────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ borderColor: 'var(--border)', background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center justify-between mx-auto px-6" style={{ maxWidth: 1160, height: 64 }}>
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>⚡</span>
            <span className="text-white font-bold text-sm leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              Архетип-<br />Протокол
            </span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <a key={link} href="#" className="nav-link text-sm no-underline">{link}</a>
            ))}
          </div>

          <button onClick={handleSignIn} className="btn-primary text-sm" style={{ fontFamily: 'var(--font-display)', border: 'none', cursor: 'pointer' }}>
            Войти
          </button>
        </div>
      </nav>

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="hero-grid relative overflow-hidden text-center" style={{ padding: '96px 24px 88px' }}>
        <div className="animate-orb pointer-events-none absolute" style={{
          top: '5%', left: '5%', width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(200,255,0,0.07) 0%, transparent 65%)',
        }} />
        <div className="animate-orb pointer-events-none absolute" style={{
          bottom: '5%', right: '5%', width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(200,255,0,0.05) 0%, transparent 65%)',
          animationDelay: '2.5s',
        }} />

        <div className="relative mx-auto" style={{ maxWidth: 880, zIndex: 1 }}>
          <div className="animate-fade-up inline-flex items-center gap-2 border rounded-full mb-9 text-xs" style={{
            borderColor: 'rgba(200,255,0,0.3)',
            color: 'var(--accent)', padding: '6px 18px',
          }}>
            <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: 'var(--accent)' }} />
            26 архетипов · AI-анализ · Instant генерация
          </div>

          <h1
            className="animate-fade-up-1 font-extrabold"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5.5vw, 4.2rem)',
              lineHeight: 1.08, letterSpacing: '-0.025em', marginBottom: 24,
            }}
          >
            Хватит гадать<br />
            <span style={{ color: 'var(--accent)' }}>с креативами</span>
          </h1>

          <p className="animate-fade-up-2 mx-auto" style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'var(--text-muted)', lineHeight: 1.75,
            maxWidth: 580, marginBottom: 48,
          }}>
            Архетип-Протокол анализирует бренд, подбирает психотип аудитории
            и генерирует рекламные баннеры, которые реально работают.
          </p>

          <div className="animate-fade-up-3 flex flex-wrap gap-3.5 justify-center">
            <button
              onClick={handleSignIn}
              className="btn-primary animate-glow text-base"
              style={{ fontFamily: 'var(--font-display)', padding: '16px 40px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              Запустить идею →
            </button>
            <a
              href="#how-it-works"
              className="btn-outline no-underline text-base"
              style={{ padding: '16px 40px', borderRadius: 12 }}
            >
              Как это работает
            </a>
          </div>

          <p className="mt-7 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Уже&nbsp;<span style={{ color: 'var(--accent)' }}>156+</span>&nbsp;команд
            &nbsp;·&nbsp;Без кредитной карты&nbsp;·&nbsp;Готово за 30 секунд
          </p>
        </div>
      </section>

      {/* ─────────────────── КАК РАБОТАЕТ ─────────────────── */}
      <section id="how-it-works" className="landing-section" style={{ padding: '88px 24px' }}>
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
              Как работает
            </p>
            <h2 className="font-extrabold" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.2 }}>
              Три шага до работающего креатива
            </h2>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {STEPS.map((item, i) => (
              <div key={i} className="step-card relative">
                <div className="flex items-start justify-between mb-5">
                  <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                    ШАГ {item.step}
                  </span>
                  <span style={{ fontSize: '1.4rem', color: 'rgba(255,255,255,0.2)' }}>{item.icon}</span>
                </div>
                <h3 className="font-extrabold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </p>
                {i < 2 && (
                  <span className="absolute hidden md:block" style={{
                    top: '50%', right: -13, transform: 'translateY(-50%)',
                    color: 'rgba(200,255,0,0.6)', fontSize: '1.3rem', fontWeight: 700, zIndex: 1,
                  }}>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── СТАТИСТИКА ─────────────────────────── */}
      <section className="landing-section" style={{ padding: '88px 24px', background: 'rgba(200,255,0,0.018)' }}>
        <div className="mx-auto" style={{ maxWidth: 960 }}>
          <div className="text-center mb-14">
            <h2 className="font-extrabold" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
              Результаты говорят сами за себя
            </h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Средние показатели по клиентам за последние 6 месяцев
            </p>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {STATS.map((stat, i) => (
              <div key={i} className="stat-card" style={{ padding: '40px 28px' }}>
                <div className="text-2xl mb-3" style={{ color: 'var(--accent-muted)' }}>{stat.icon}</div>
                <div className="font-extrabold mb-2" style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.4rem, 4vw, 3.2rem)',
                  color: 'var(--accent)', lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div className="font-bold text-white mb-1.5">{stat.label}</div>
                <div className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.38)' }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── 26 АРХЕТИПОВ ─────────────────────── */}
      <section className="landing-section overflow-hidden" style={{ padding: '88px 0' }}>
        <div className="mx-auto text-center px-6 mb-12" style={{ maxWidth: 1100 }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
            База архетипов
          </p>
          <h2 className="font-extrabold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
            26 архетипов в вашем распоряжении
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.65 }}>
            Каждый архетип — уникальная модель коммуникации с аудиторией,<br />
            основанная на психологических паттернах восприятия
          </p>
        </div>

        {/* Marquee */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
            style={{ background: 'linear-gradient(90deg, var(--background) 0%, transparent 100%)' }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
            style={{ background: 'linear-gradient(-90deg, var(--background) 0%, transparent 100%)' }} />
          <div className="overflow-hidden">
            <div className="animate-marquee flex gap-3" style={{ width: 'max-content', padding: '8px 0 8px 12px' }}>
              {[...ARCHETYPES, ...ARCHETYPES].map((arch, i) => (
                <div key={i} className="archetype-pill whitespace-nowrap text-sm" style={{ padding: '10px 22px' }}>
                  {arch.icon} {arch.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── CTA ─────────────────────────── */}
      <section className="landing-section text-center" style={{ padding: '100px 24px' }}>
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          <div className="border rounded-3xl" style={{
            borderColor: 'rgba(200,255,0,0.15)',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(200,255,0,0.1) 0%, transparent 65%)',
            padding: '68px 40px',
          }}>
            <div className="mx-auto mb-7 flex items-center justify-center border rounded-full" style={{
              width: 44, height: 44,
              background: 'var(--accent-muted)',
              borderColor: 'rgba(200,255,0,0.3)',
            }}>
              <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>⚡</span>
            </div>

            <h2 className="font-extrabold mb-5" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', lineHeight: 1.15,
            }}>
              Готовы перестать<br />
              <span style={{ color: 'var(--accent)' }}>гадать?</span>
            </h2>
            <p className="mx-auto mb-11 text-sm leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 460 }}>
              Запустите первый архетип-тест прямо сейчас. Бесплатно,
              без кредитной карты — просто опишите ваш бренд.
            </p>
            <button
              onClick={handleSignIn}
              className="btn-primary animate-glow text-base"
              style={{ fontFamily: 'var(--font-display)', padding: '18px 52px', borderRadius: 14, border: 'none', cursor: 'pointer' }}
            >
              Запустить идею →
            </button>
            <p className="mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Бесплатно · Без карты · Первый результат за 30 секунд
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── FOOTER ─────────────────────────── */}
      <footer className="border-t" style={{ borderColor: 'var(--border)', padding: '36px 24px' }}>
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4" style={{ maxWidth: 1100 }}>
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>⚡</span>
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              Архетип-Протокол
            </span>
          </div>

          <div className="flex gap-6">
            {['Конфиденциальность', 'Условия', 'Поддержка'].map((link) => (
              <a key={link} href="#" className="nav-link text-sm no-underline">{link}</a>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            © 2024 Архетип-Протокол
          </p>
        </div>
      </footer>
    </div>
  );
}
