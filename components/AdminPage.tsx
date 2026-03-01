'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AnimatedLogo from '@/components/AnimatedLogo';

// Lazy-load recharts (SSR-incompatible)
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

interface AdminStats {
  users: {
    total: number;
    active: number;
    list: {
      id: string;
      email: string;
      name: string;
      credits: number;
      createdAt: string;
      projectCount: number;
      completedCount: number;
    }[];
  };
  projects: { total: number; completed: number; byDay: Record<string, number> };
  banners: { total: number };
  credits: { initialTotal: number; spent: number; remaining: number };
  finance: { estimatedApiCost: number; registrationsByDay: Record<string, number> };
}

interface AnalyticsPeriod {
  banners: number;
  projects: number;
  newUsers: number;
  creditsSpent: number;
  estimatedCostRub: number;
}

interface DailyPoint extends AnalyticsPeriod {
  date: string;
}

interface AnalyticsData {
  today: AnalyticsPeriod;
  week: AnalyticsPeriod;
  month: AnalyticsPeriod;
  daily: DailyPoint[];
}

interface EnrichedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  credits: number;
  createdAt: string;
  totalProjects: number;
  completedProjects: number;
  totalBanners: number;
  lastActive: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold" style={{ color: ACCENT }}>{value}</p>
      {sub && <p className="text-white/25 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'users' | 'activity' | 'analytics'>('overview');
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'credits' | 'banners'>('date');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (r.status === 403) throw new Error('Нет доступа');
        return r.json();
      })
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Загружаем аналитику при переключении на таб
  useEffect(() => {
    if (tab !== 'analytics' || analytics) return;
    setAnalyticsLoading(true);
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => setAnalytics(d))
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [tab, analytics]);

  // Загружаем обогащённых пользователей при переключении на таб
  useEffect(() => {
    if (tab !== 'users' || enrichedUsers.length > 0) return;
    setUsersLoading(true);
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => setEnrichedUsers(d.users || []))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [tab, enrichedUsers.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <AnimatedLogo size={48} inline />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="text-3xl mb-3">🔒</div>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const conversionRate = stats.users.total > 0
    ? ((stats.users.active / stats.users.total) * 100).toFixed(1)
    : '0';

  // Последние 14 дней для графика
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  const maxReg = Math.max(...last14Days.map(d => stats.finance.registrationsByDay[d] || 0), 1);
  const maxProj = Math.max(...last14Days.map(d => stats.projects.byDay[d] || 0), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-white font-bold text-2xl">⚙️ Админ-панель</h1>
        <p className="text-white/40 text-sm mt-1">Только для владельца</p>
      </div>

      {/* Табы */}
      <div className="flex gap-2">
        {([
          { id: 'overview', label: '📊 Обзор' },
          { id: 'analytics', label: '📈 Аналитика' },
          { id: 'users', label: '👥 Пользователи' },
          { id: 'activity', label: '📉 Активность' },
        ] as { id: typeof tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? ACCENT_BG : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === t.id ? ACCENT : 'rgba(255,255,255,0.1)'}`,
              color: tab === t.id ? ACCENT : 'rgba(255,255,255,0.5)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ ОБЗОР ═══ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Метрики */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Пользователей" value={stats.users.total} />
            <StatCard label="Активных" value={stats.users.active} sub={`${conversionRate}% конверсия`} />
            <StatCard label="Проектов" value={stats.projects.total} sub={`${stats.projects.completed} завершённых`} />
            <StatCard label="Баннеров" value={stats.banners.total} />
          </div>

          {/* Кредиты */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">💰 Кредиты</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-white/40 text-xs">Выдано всего</p>
                <p className="text-xl font-bold text-white">{stats.credits.initialTotal}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Потрачено</p>
                <p className="text-xl font-bold" style={{ color: '#ff6b6b' }}>{stats.credits.spent}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Осталось у юзеров</p>
                <p className="text-xl font-bold" style={{ color: ACCENT }}>{stats.credits.remaining}</p>
              </div>
            </div>
            {/* Прогресс-бар */}
            <div className="mt-4 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{
                width: `${stats.credits.initialTotal > 0 ? (stats.credits.spent / stats.credits.initialTotal * 100) : 0}%`,
                background: `linear-gradient(90deg, ${ACCENT}, #ff6b6b)`,
              }} />
            </div>
          </div>

          {/* Финансы */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">📊 Расходы на API (оценка)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/40 text-xs">Расход на API</p>
                <p className="text-xl font-bold" style={{ color: '#ff6b6b' }}>
                  ~{stats.finance.estimatedApiCost.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-white/20 text-xs mt-0.5">~{stats.credits.spent} кредитов израсходовано</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Стоимость 1 баннера</p>
                <p className="text-xl font-bold text-white">
                  ~{stats.banners.total > 0 ? Math.round(stats.finance.estimatedApiCost / stats.banners.total) : 0} ₽
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ АНАЛИТИКА ═══ */}
      {tab === 'analytics' && (
        analyticsLoading ? (
          <div className="flex items-center justify-center py-20">
            <AnimatedLogo size={36} inline />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Переключатель периода */}
            <div className="flex gap-2">
              {([
                { key: 'today' as const, label: 'Сегодня' },
                { key: 'week' as const, label: 'Неделя' },
                { key: 'month' as const, label: 'Месяц' },
              ]).map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: period === p.key ? ACCENT_BG : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${period === p.key ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                    color: period === p.key ? ACCENT : 'rgba(255,255,255,0.5)',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Метрики за период */}
            {(() => {
              const d = analytics[period];
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard label="Баннеров" value={d.banners} />
                  <StatCard label="Проектов" value={d.projects} />
                  <StatCard label="Новых юзеров" value={d.newUsers} />
                  <div className="glass-card p-5">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Кредитов потрачено</p>
                    <p className="text-2xl font-extrabold" style={{ color: '#f59e0b' }}>{d.creditsSpent}</p>
                  </div>
                  <div className="glass-card p-5">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Себестоимость</p>
                    <p className="text-2xl font-extrabold" style={{ color: '#ef4444' }}>~{d.estimatedCostRub.toLocaleString('ru-RU')}₽</p>
                  </div>
                </div>
              );
            })()}

            {/* Графики */}
            {(() => {
              const chartData = analytics.daily.slice(
                period === 'today' ? -1 : period === 'week' ? -7 : -30
              );
              const tooltipStyle = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 };
              const fmtDate = (d: string) => {
                const dt = new Date(d + 'T00:00:00');
                return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
              };
              const axisStroke = 'rgba(255,255,255,0.3)';
              const gridStroke = 'rgba(255,255,255,0.05)';

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Баннеры */}
                  <div className="glass-card p-6">
                    <h3 className="text-white/60 text-sm font-semibold mb-4">Баннеры по дням</h3>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} stroke={axisStroke} fontSize={11} />
                          <YAxis stroke={axisStroke} fontSize={11} />
                          <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => fmtDate(String(d))} />
                          <Bar dataKey="banners" name="Баннеры" fill="#B5D334" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Себестоимость */}
                  <div className="glass-card p-6">
                    <h3 className="text-white/60 text-sm font-semibold mb-4">Расходы API (₽)</h3>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} stroke={axisStroke} fontSize={11} />
                          <YAxis stroke={axisStroke} fontSize={11} />
                          <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => [`${v}₽`, '']} />
                          <Line dataKey="estimatedCostRub" name="Себестоимость" stroke="#ef4444" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Новые пользователи */}
                  <div className="glass-card p-6">
                    <h3 className="text-white/60 text-sm font-semibold mb-4">Новые пользователи</h3>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} stroke={axisStroke} fontSize={11} />
                          <YAxis stroke={axisStroke} fontSize={11} />
                          <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => fmtDate(String(d))} />
                          <Bar dataKey="newUsers" name="Новые юзеры" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Кредиты */}
                  <div className="glass-card p-6">
                    <h3 className="text-white/60 text-sm font-semibold mb-4">Кредиты потрачено</h3>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} stroke={axisStroke} fontSize={11} />
                          <YAxis stroke={axisStroke} fontSize={11} />
                          <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => fmtDate(String(d))} />
                          <Bar dataKey="creditsSpent" name="Кредиты" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null
      )}

      {/* ═══ ПОЛЬЗОВАТЕЛИ ═══ */}
      {tab === 'users' && (
        <div className="space-y-6">
          {/* Сводка */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Пользователей" value={enrichedUsers.length || stats.users.total} />
            <StatCard label="Баннеров создано" value={enrichedUsers.reduce((s, u) => s + u.totalBanners, 0) || stats.banners.total} />
            <StatCard label="Проектов" value={enrichedUsers.reduce((s, u) => s + u.totalProjects, 0) || stats.projects.total} />
            <StatCard label="Без кредитов" value={enrichedUsers.filter(u => u.credits === 0).length} sub="потратили все" />
          </div>

          {/* Сортировка */}
          <div className="flex gap-2">
            {([
              { key: 'date' as const, label: 'По дате' },
              { key: 'credits' as const, label: 'По кредитам' },
              { key: 'banners' as const, label: 'По баннерам' },
            ]).map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: sortBy === s.key ? ACCENT : 'rgba(255,255,255,0.08)',
                  color: sortBy === s.key ? '#000' : 'rgba(255,255,255,0.5)',
                }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Таблица */}
          <div className="glass-card p-6 overflow-x-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center py-10">
                <AnimatedLogo size={36} inline />
              </div>
            ) : (
              <table className="w-full text-sm" style={{ minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th className="text-left py-3 px-3 text-white/50 text-xs font-semibold">Пользователь</th>
                    <th className="text-center py-3 px-3 text-white/50 text-xs font-semibold">Кредиты</th>
                    <th className="text-center py-3 px-3 text-white/50 text-xs font-semibold">Проекты</th>
                    <th className="text-center py-3 px-3 text-white/50 text-xs font-semibold">Баннеры</th>
                    <th className="text-center py-3 px-3 text-white/50 text-xs font-semibold">Регистрация</th>
                    <th className="text-center py-3 px-3 text-white/50 text-xs font-semibold">Активность</th>
                  </tr>
                </thead>
                <tbody>
                  {[...enrichedUsers]
                    .sort((a, b) => {
                      if (sortBy === 'credits') return a.credits - b.credits;
                      if (sortBy === 'banners') return b.totalBanners - a.totalBanners;
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })
                    .map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {u.avatarUrl && (
                            <img src={u.avatarUrl} alt="" className="rounded-full" style={{ width: 32, height: 32 }} />
                          )}
                          <div>
                            <div className="text-white font-medium text-sm">{u.name || 'Без имени'}</div>
                            <div className="text-white/40 text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{
                          background: u.credits === 0 ? 'rgba(239,68,68,0.1)' : u.credits < 30 ? 'rgba(245,158,11,0.1)' : ACCENT_BG,
                          color: u.credits === 0 ? '#ef4444' : u.credits < 30 ? '#f59e0b' : ACCENT,
                        }}>
                          {u.credits}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-white text-sm">
                        {u.completedProjects}/{u.totalProjects}
                      </td>
                      <td className="py-3 px-3 text-center text-white text-sm">{u.totalBanners}</td>
                      <td className="py-3 px-3 text-center text-white/50 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-3 px-3 text-center text-white/50 text-xs">
                        {new Date(u.lastActive).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ АКТИВНОСТЬ ═══ */}
      {tab === 'activity' && (
        <div className="space-y-6">
          {/* Регистрации за 14 дней */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">📈 Регистрации (14 дней)</h3>
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {last14Days.map(day => {
                const count = stats.finance.registrationsByDay[day] || 0;
                const h = Math.max((count / maxReg) * 100, 4);
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-white/40">{count || ''}</span>
                    <div className="w-full rounded-t" style={{ height: `${h}%`, background: ACCENT, minHeight: 4 }} />
                    <span className="text-[9px] text-white/20">{day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Проекты за 14 дней */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">📁 Проекты (14 дней)</h3>
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {last14Days.map(day => {
                const count = stats.projects.byDay[day] || 0;
                const h = Math.max((count / maxProj) * 100, 4);
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-white/40">{count || ''}</span>
                    <div className="w-full rounded-t" style={{ height: `${h}%`, background: '#6b9fff', minHeight: 4 }} />
                    <span className="text-[9px] text-white/20">{day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
