'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AnimatedLogo from '@/components/AnimatedLogo';
import ChangelogModal, { hasUnseenChangelog } from '@/components/ChangelogModal';

type Page =
  | 'dashboard'
  | 'new-project'
  | 'archetypes'
  | 'history'
  | 'analytics'
  | 'banner-library'
  | 'brands'
  | 'referrals'
  | 'pricing'
  | 'settings'
  | 'admin';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard',      label: 'Панель управления', icon: '▦' },
  { id: 'new-project',    label: 'Новый проект',       icon: '+' },
  { id: 'archetypes',     label: 'Архетипы',           icon: '◈' },
  { id: 'history',        label: 'История генераций',  icon: '◷' },
  { id: 'analytics',      label: 'Аналитика',          icon: '↗' },
  { id: 'banner-library', label: 'Все баннеры',        icon: '📚' },
  { id: 'brands',         label: 'Бренды',             icon: '◉' },
  { id: 'referrals',      label: 'Рефералы',           icon: '🎁' },
  { id: 'pricing',        label: 'Тарифы',             icon: '⚡' },
  { id: 'settings',       label: 'Настройки',          icon: '⚙' },
];

const ADMIN_EMAILS = ['kirian99939@gmail.com'];
const ACCENT = '#C8FF00';

interface DashboardShellProps {
  children: React.ReactNode;
  activePage?: string;
  title?: string;
}

export default function DashboardShell({ children, activePage, title }: DashboardShellProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasNewChangelog, setHasNewChangelog] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '');

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ id: 'admin' as Page, label: 'Админ', icon: '⚙️' }] : []),
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/landing');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && hasUnseenChangelog()) {
      setHasNewChangelog(true);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/referral/stats')
        .then(res => res.json())
        .then(data => { if (data.totalReferrals) setReferralCount(data.totalReferrals); })
        .catch(() => {});
    }
  }, [status]);

  const handleNavigate = (page: string) => {
    if (page === 'new-project') {
      router.push('/project/new');
      return;
    }
    router.push('/dashboard');
    // Для не-проектных страниц: используем dashboard SPA навигацию через query param
    if (page !== 'dashboard') {
      router.push(`/dashboard?page=${page}`);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--background)' }}>
        <AnimatedLogo size={64} inline />
        <p className="text-white/40 text-sm mt-4">Загрузка...</p>
      </div>
    );
  }

  const credits = (session?.user as any)?.credits ?? 0;
  const userName = session?.user?.name ?? 'Пользователь';
  const userImage = session?.user?.image;
  const headerTitle = title || navItems.find(i => i.id === activePage)?.label || 'Проект';

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col border-r border-white/10 shrink-0"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="px-4 py-5 border-b border-white/10">
          <Image src="/logo.svg" alt="Креатика" height={28} width={114} priority />
        </div>

        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-white/40 text-xs mb-1">🪙 Кредитов</p>
          <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
            {credits.toLocaleString('ru-RU')}
          </p>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: isActive ? 'rgba(200,255,0,0.1)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                <span className="w-4 text-center shrink-0">{item.icon}</span>
                <span className="leading-tight">{item.label}</span>
                {item.id === 'referrals' && referralCount > 0 && (
                  <span
                    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                    style={{ background: ACCENT, color: '#0A0A0A' }}
                  >
                    {referralCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Changelog button */}
        <div className="px-2 pb-3">
          <button
            onClick={() => { setChangelogOpen(true); setHasNewChangelog(false); }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <span className="w-4 text-center shrink-0">🚀</span>
            <span className="leading-tight">Что нового</span>
            {hasNewChangelog && (
              <span className="w-2 h-2 rounded-full ml-auto shrink-0" style={{ background: '#C8FF00' }} />
            )}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-white font-semibold text-base">{headerTitle}</h1>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--accent)' }}
            >
              <span>🪙</span>
              <span>{credits.toLocaleString('ru-RU')} кр.</span>
            </div>
            <div className="flex items-center gap-2">
              {userImage ? (
                <Image src={userImage} alt={userName} width={28} height={28} className="rounded-full" />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--accent)', color: '#0A0A0A' }}
                >
                  {userName[0]}
                </div>
              )}
              <span className="text-white/70 text-xs hidden sm:block">{userName}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/landing' })}
                className="text-white/30 hover:text-white/70 text-xs transition-colors ml-1"
                title="Выйти"
              >
                ✕
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Support button */}
      <div className="fixed z-50 flex items-center" style={{ bottom: 24, right: 24 }}>
        <div className="group relative flex items-center">
          <span
            className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            Поддержка
          </span>
          <button
            onClick={() => window.open('https://t.me/creatika_product_bot', '_blank')}
            className="flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{
              width: 56, height: 56,
              background: '#C8FF00', color: '#0A0A0A', fontSize: 24,
              boxShadow: '0 4px 20px rgba(200,255,0,0.3)',
              cursor: 'pointer', border: 'none',
            }}
            title="Поддержка"
          >
            💬
          </button>
        </div>
      </div>

      <ChangelogModal
        isOpen={changelogOpen}
        onClose={() => { setChangelogOpen(false); setHasNewChangelog(false); }}
      />
    </div>
  );
}
