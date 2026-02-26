'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ARCHETYPES } from '@/lib/archetypes';
import PricingSection from '@/components/PricingSection';

const NAV_LINKS = [
  { label: 'Как работает', href: '#how-it-works' },
  { label: 'Архетипы', href: '#archetypes' },
  { label: 'Цены', href: '#pricing' },
];

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

const FAQ_ITEMS = [
  {
    q: 'Что такое Архетип-Протокол?',
    a: 'Это AI-сервис, который генерирует рекламные баннеры на основе психологических архетипов. Вы описываете продукт и аудиторию — система подбирает архетип, формулирует гипотезы и создаёт готовые креативы в нескольких форматах за 2 минуты.',
  },
  {
    q: 'Что такое архетипы и зачем они в рекламе?',
    a: 'Архетипы — это универсальные психологические образы (Герой, Бунтарь, Мудрец и др.), которые вызывают эмоциональный отклик у аудитории. Реклама, построенная на архетипах, работает эффективнее, потому что обращается к глубинным мотивам людей, а не просто перечисляет характеристики продукта.',
  },
  {
    q: 'Для каких рекламных площадок подходят баннеры?',
    a: 'Мы генерируем баннеры в форматах для VK Рекламы, Яндекс Директа (включая РСЯ), Telegram Ads, MyTarget (Одноклассники), Google Ads, а также для Instagram и YouTube. Вы сами выбираете нужные площадки — система подберёт правильные размеры.',
  },
  {
    q: 'Какие форматы баннеров поддерживаются?',
    a: 'Лента квадрат (1080×1080), лента вертикальный (1080×1350), Stories/Клипы (1080×1920), горизонтальный (1920×1080), пост широкий (1080×607) и РСЯ баннер (240×400). Этого набора достаточно для покрытия всех основных рекламных сетей рунета.',
  },
  {
    q: 'Нужны ли навыки дизайна?',
    a: 'Нет. Вы заполняете бриф текстом — описываете продукт, аудиторию и цель рекламы. Всё остальное делает AI: подбирает архетип, пишет тексты, генерирует визуал. Результат — готовые баннеры, которые можно сразу загружать в рекламный кабинет.',
  },
  {
    q: 'Сколько времени занимает генерация?',
    a: 'Полный цикл от заполнения брифа до готовых баннеров — около 2–3 минут. Заполнение брифа занимает 30 секунд, анализ архетипа и гипотезы — 20 секунд, генерация изображений — 1–2 минуты.',
  },
  {
    q: 'Есть ли бесплатная версия?',
    a: 'Да. При регистрации вы получаете 3 бесплатные генерации — этого достаточно, чтобы пройти полный цикл и оценить качество результата. Кредиты не сгорают.',
  },
  {
    q: 'Как работают кредиты?',
    a: 'Один кредит = одна генерация пакета баннеров (все выбранные форматы сразу). Кредиты не сгорают и не имеют срока действия. Вы покупаете пакет и используете когда удобно.',
  },
  {
    q: 'Подойдут ли баннеры для реальной рекламы?',
    a: 'Да. Баннеры генерируются в нужных размерах и разрешениях для каждой площадки. Они проходят модерацию VK, Яндекс Директа и других платформ. Наши пользователи уже запускают с ними реальные рекламные кампании.',
  },
  {
    q: 'Уникальны ли сгенерированные изображения?',
    a: 'Да. Каждое изображение генерируется с нуля под ваш конкретный бриф. Это не шаблоны и не стоковые фото — AI создаёт уникальный визуал, который больше нигде не повторится.',
  },
  {
    q: 'Можно ли загрузить свой логотип?',
    a: 'Пока нет, но эта функция в разработке. Сейчас вы можете добавить логотип вручную в любом графическом редакторе после скачивания баннера.',
  },
  {
    q: 'Какие способы оплаты доступны?',
    a: 'Банковские карты (Visa, Mastercard, МИР), SberPay, ЮMoney и другие популярные способы через ЮKassa. Оплата безопасна и проходит через сертифицированный платёжный шлюз.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left"
    >
      <div
        className="flex items-center justify-between px-6 py-5 rounded-2xl transition-all"
        style={{
          background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <span className="text-white font-semibold text-sm sm:text-base pr-4">{q}</span>
        <span
          className="text-white/40 text-xl shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          +
        </span>
      </div>
      {open && (
        <div className="px-6 py-4 text-white/60 text-sm leading-relaxed">
          {a}
        </div>
      )}
    </button>
  );
}

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
              <a key={link.label} href={link.href} className="nav-link text-sm no-underline">{link.label}</a>
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

      {/* ─────────────────────────────── СРАВНЕНИЕ ─────────────────────────────── */}
      <section className="landing-section" style={{ padding: '88px 24px' }}>
        <div className="text-center mb-12">
          <h2
            className="font-extrabold mb-3"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', lineHeight: 1.2 }}
          >
            Почему это выгодно
          </h2>
          <p className="text-sm mx-auto" style={{ color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.65 }}>
            Сравните: классический подход vs Архетип-Протокол
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Заголовки колонок */}
          <div className="grid grid-cols-3 gap-4 mb-3 px-4">
            <div />
            <div className="text-center">
              <span
                className="inline-block text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,60,60,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.2)' }}
              >
                Без нас
              </span>
            </div>
            <div className="text-center">
              <span
                className="inline-block text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(200,255,0,0.1)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.25)' }}
              >
                С нами
              </span>
            </div>
          </div>

          {/* Строки сравнения */}
          {[
            {
              label: '⏱ Время на пакет баннеров',
              without: '4–8 часов',
              withUs: '~2 минуты',
            },
            {
              label: '💰 Стоимость',
              without: 'от 5 000 ₽',
              withUs: 'от 250 ₽',
            },
            {
              label: '🎯 Стратегия и архетипы',
              without: 'Ручной подбор, интуиция',
              withUs: 'AI на базе 26 архетипов',
            },
            {
              label: '📐 Форматы',
              without: '1 формат за раз',
              withUs: '3 формата сразу (Feed, Stories, Banner)',
            },
            {
              label: '🔄 Гипотезы',
              without: '1–2 варианта от дизайнера',
              withUs: 'До 10 гипотез с разными архетипами',
            },
            {
              label: '📊 Итерации',
              without: 'Каждая правка — новый день',
              withUs: 'Новая итерация за 2 минуты',
            },
          ].map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-3 gap-4 px-4 py-4 rounded-xl transition-all"
              style={{
                background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="text-sm text-white/70 font-medium flex items-center">
                {row.label}
              </div>
              <div className="text-center flex items-center justify-center">
                <span
                  className="text-sm px-3 py-1.5 rounded-lg inline-block"
                  style={{ background: 'rgba(255,60,60,0.06)', color: '#ff6b6b' }}
                >
                  {row.without}
                </span>
              </div>
              <div className="text-center flex items-center justify-center">
                <span
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg inline-block"
                  style={{ background: 'rgba(200,255,0,0.08)', color: '#C8FF00' }}
                >
                  {row.withUs}
                </span>
              </div>
            </div>
          ))}

          {/* Итоговая строка */}
          <div
            className="mt-6 rounded-2xl p-5 text-center"
            style={{ background: 'rgba(200,255,0,0.05)', border: '1px solid rgba(200,255,0,0.15)' }}
          >
            <p className="text-white/60 text-sm mb-2">Средняя экономия на 10 проектов</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div>
                <span className="text-2xl font-extrabold" style={{ color: '#C8FF00' }}>~45 часов</span>
                <p className="text-white/30 text-xs mt-0.5">времени</p>
              </div>
              <div>
                <span className="text-2xl font-extrabold" style={{ color: '#C8FF00' }}>~47 500 ₽</span>
                <p className="text-white/30 text-xs mt-0.5">бюджета</p>
              </div>
            </div>
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

      {/* ─────────────────────────── ТАРИФЫ ─────────────────────────── */}
      <section id="pricing" className="landing-section" style={{ padding: '88px 24px' }}>
        <PricingSection />
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

      {/* ─────────────────────────── FAQ ─────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <p className="text-white/40 text-xs uppercase tracking-widest text-center mb-2">FAQ</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3">
          Частые вопросы
        </h2>
        <p className="text-white/50 text-center mb-10">
          Если не нашли ответ — напишите нам, и мы поможем.
        </p>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
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
            © {new Date().getFullYear()} Архетип-Протокол
          </p>
        </div>
      </footer>
    </div>
  );
}
