'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import DashboardPage from '@/components/DashboardPage';
import PricingSection from '@/components/PricingSection';
import AdminPage from '@/components/AdminPage';
import ReferralDashboard from '@/components/ReferralDashboard';
import GoldenPage from '@/components/GoldenPage';
import BrandsPage from '@/components/BrandsPage';
import ToolsPage from '@/components/ToolsPage';
import SettingsPage from '@/components/SettingsPage';
import AnimatedLogo from '@/components/AnimatedLogo';
import ChangelogModal, { hasUnseenChangelog } from '@/components/ChangelogModal';

type Page =
  | 'dashboard'
  | 'new-project'
  | 'brands'
  | 'tools'
  | 'referrals'
  | 'pricing'
  | 'settings'
  | 'admin';

interface NavItem {
  id: Page;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: '🏠' },
  { id: 'brands', label: 'Бренды', icon: '📁' },
  { id: 'tools', label: 'Инструменты', icon: '🔧' },
];

const NAV_BOTTOM: NavItem[] = [
  { id: 'referrals', label: 'Рефералы', icon: '🎁' },
  { id: 'pricing', label: 'Тарифы', icon: '⚡' },
  { id: 'settings', label: 'Настройки', icon: '⚙️' },
  { id: 'admin', label: 'Админ', icon: '🛡️', adminOnly: true },
];

const ADMIN_EMAILS = ['kirian99939@gmail.com'];

const ACCENT = '#C8FF00';

export default function DashboardWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-white/40 text-sm">Загрузка...</p>
      </div>
    }>
      <DashboardRoute />
    </Suspense>
  );
}

function DashboardRoute() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasNewChangelog, setHasNewChangelog] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [isGolden, setIsGolden] = useState(false);
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '');

  const navTop = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);
  const navBottom = NAV_BOTTOM.filter(item => !item.adminOnly || isAdmin);
  const allNavItems = [...navTop, ...navBottom];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/landing');
    }
  }, [status, router]);

  // Auto-show changelog on first visit after update
  useEffect(() => {
    if (status === 'authenticated' && hasUnseenChangelog()) {
      setHasNewChangelog(true);
      setChangelogOpen(true);
    }
  }, [status]);

  // Fetch referral count for badge
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/referral/stats')
        .then(res => res.json())
        .then(data => { if (data.totalReferrals) setReferralCount(data.totalReferrals); })
        .catch(() => {});

      fetch('/api/referral/golden')
        .then(res => res.json())
        .then(data => { if (data.isGolden) setIsGolden(true); })
        .catch(() => {});
    }
  }, [status]);

  // Read URL params on load (e.g. ?page=new-project&brand_id=...)
  useEffect(() => {
    const page = searchParams.get('page');
    const brandId = searchParams.get('brand_id');
    if (page === 'new-project') {
      const url = brandId ? `/project/new?brand_id=${brandId}` : '/project/new';
      router.push(url);
    } else if (page === 'brands') {
      setActivePage('brands');
    }
  }, [searchParams, router]);

  const handleNavigate = useCallback((page: Page | string) => {
    const target = page as Page;
    if (target === 'new-project') {
      router.push('/project/new');
      return;
    }
    setActivePage(target);
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--background)' }}>
        <AnimatedLogo size={64} inline />
        <p className="text-white/40 text-sm mt-4">Загрузка...</p>
      </div>
    );
  }

  const credits = session?.user?.credits ?? 0;
  const userName = session?.user?.name ?? 'Пользователь';
  const userImage = session?.user?.image;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>

      {/* Sidebar */}
      <aside
        className="flex flex-col border-r border-white/10 shrink-0"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="h-14 flex items-center px-4 border-b border-white/10">
          <Image src="/logo.svg" alt="Креатика" height={28} width={114} priority />
        </div>

        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-white/40 text-xs mb-1">🪙 Кредитов</p>
          <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
            {credits.toLocaleString('ru-RU')}
          </p>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col justify-between">
          {/* Top nav */}
          <div className="flex flex-col gap-0.5">
            {navTop.map((item) => {
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
                </button>
              );
            })}
          </div>

          {/* Bottom nav */}
          <div className="flex flex-col gap-0.5">
            {navBottom.map((item) => {
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
          </div>
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
              <span
                className="w-2 h-2 rounded-full ml-auto shrink-0"
                style={{ background: '#C8FF00' }}
              />
            )}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-white font-semibold text-base">
            {allNavItems.find((i) => i.id === activePage)?.label}
          </h1>

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
                <Image
                  src={userImage}
                  alt={userName}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
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
          {activePage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {activePage === 'brands' && <BrandsPage />}
          {activePage === 'tools' && <ToolsPage onNavigate={handleNavigate} />}
          {activePage === 'referrals' && (
            <>
              {isGolden && <GoldenPage />}
              <div className={isGolden ? 'mt-8' : ''}>
                <ReferralDashboard />
              </div>
            </>
          )}
          {activePage === 'pricing' && (
            <div className="max-w-5xl mx-auto">
              <PricingSection isLoggedIn={true} />
            </div>
          )}
          {activePage === 'settings' && <SettingsPage />}
          {activePage === 'admin' && isAdmin && <AdminPage />}
        </main>
      </div>

      {/* ══════════ SUPPORT BUTTON ══════════ */}
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
              width: 56,
              height: 56,
              background: '#C8FF00',
              color: '#0A0A0A',
              fontSize: 24,
              boxShadow: '0 4px 20px rgba(200,255,0,0.3)',
              cursor: 'pointer',
              border: 'none',
            }}
            title="Поддержка"
          >
            💬
          </button>
        </div>
      </div>

      {/* ══════════ CHANGELOG MODAL ══════════ */}
      <ChangelogModal
        isOpen={changelogOpen}
        onClose={() => { setChangelogOpen(false); setHasNewChangelog(false); }}
      />
    </div>
  );
}
