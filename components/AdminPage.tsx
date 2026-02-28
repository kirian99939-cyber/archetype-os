'use client';

import { useState, useEffect } from 'react';
import AnimatedLogo from '@/components/AnimatedLogo';

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
  const [tab, setTab] = useState<'overview' | 'users' | 'activity'>('overview');

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
          { id: 'users', label: '👥 Пользователи' },
          { id: 'activity', label: '📈 Активность' },
        ] as { id: 'overview' | 'users' | 'activity'; label: string }[]).map(t => (
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
                <p className="text-white/20 text-xs mt-0.5">~150 ₽ × {stats.credits.spent} кредитов</p>
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

      {/* ═══ ПОЛЬЗОВАТЕЛИ ═══ */}
      {tab === 'users' && (
        <div className="glass-card p-6 overflow-x-auto">
          <h3 className="text-white font-semibold mb-4">👥 Все пользователи ({stats.users.total})</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-3">Имя</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-center py-2 px-3">Кредиты</th>
                <th className="text-center py-2 px-3">Проекты</th>
                <th className="text-center py-2 px-3">Готовых</th>
                <th className="text-right py-2 px-3">Регистрация</th>
              </tr>
            </thead>
            <tbody>
              {stats.users.list.map(u => (
                <tr key={u.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="py-2.5 px-3 text-white font-medium">{u.name || '—'}</td>
                  <td className="py-2.5 px-3 text-white/50">{u.email}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: u.credits > 0 ? ACCENT_BG : 'rgba(255,60,60,0.1)',
                        color: u.credits > 0 ? ACCENT : '#ff6b6b',
                      }}>
                      {u.credits}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-white/60">{u.projectCount}</td>
                  <td className="py-2.5 px-3 text-center text-white/60">{u.completedCount}</td>
                  <td className="py-2.5 px-3 text-right text-white/30 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
