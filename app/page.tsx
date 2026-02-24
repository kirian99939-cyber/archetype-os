'use client';

import { useState } from 'react';
import NewProject from '@/components/NewProject';
import ArchetypeAnalyzer from '@/components/ArchetypeAnalyzer';
import ArchetypesPage from '@/components/ArchetypesPage';
import SettingsPage from '@/components/SettingsPage';
import AnalyticsPage from '@/components/AnalyticsPage';
import DashboardPage from '@/components/DashboardPage';
import HistoryPage from '@/components/HistoryPage';

type Page =
  | 'dashboard'
  | 'new-project'
  | 'archetypes'
  | 'history'
  | 'analytics'
  | 'settings';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard',   label: 'Панель управления', icon: '▦' },
  { id: 'new-project', label: 'Новый проект',       icon: '+' },
  { id: 'archetypes',  label: 'Архетипы',           icon: '◈' },
  { id: 'history',     label: 'История генераций',  icon: '◷' },
  { id: 'analytics',   label: 'Аналитика',          icon: '↗' },
  { id: 'settings',    label: 'Настройки',          icon: '⚙' },
];

const TEST_COUNT = 156;

export default function HomePage() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>

      {/* Sidebar */}
      <aside
        className="flex flex-col border-r border-white/10 shrink-0"
        style={{ width: 'var(--sidebar-width)' }}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>⚡</span>
            <span className="text-white font-semibold text-sm leading-tight">
              Архетип-<br />Протокол
            </span>
          </div>
        </div>

        {/* Test counter */}
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-white/40 text-xs mb-1">Тестов запущено</p>
          <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
            {TEST_COUNT}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
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
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-white font-semibold text-base">
            {NAV_ITEMS.find((i) => i.id === activePage)?.label}
          </h1>
          <div
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--accent)' }}
          >
            <span>⚡</span>
            <span>{TEST_COUNT} тестов</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {activePage === 'dashboard'  && <DashboardPage onNavigate={(p) => setActivePage(p as Page)} />}
          {activePage === 'archetypes' && <ArchetypesPage />}
          {activePage === 'new-project' && <NewProject />}
          {activePage === 'analytics' && <AnalyticsPage />}
          {activePage === 'settings' && <SettingsPage />}
          {activePage === 'history' && <HistoryPage />}
        </main>
      </div>
    </div>
  );
}
