'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ARCHETYPES } from '@/lib/archetypes';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

const HOURS_PER_PROJECT = 4.5;
const MONEY_PER_PROJECT = 5000;

interface BannerItem {
  key: string;
  imageUrl: string | null;
  error: string | null;
}

interface BannerGroup {
  hypothesisIndex: number;
  hypothesisTitle: string;
  banners: BannerItem[];
}

interface ProjectData {
  id: string;
  title: string | null;
  status: string | null;
  archetype: { id: string } | null;
  banners: BannerGroup[] | null;
  created_at: string;
  updated_at: string;
}

function countBanners(banners: BannerGroup[] | null): { total: number; feed: number; stories: number; banner: number; errors: number } {
  const result = { total: 0, feed: 0, stories: 0, banner: 0, errors: 0 };
  if (!Array.isArray(banners)) return result;
  for (const group of banners) {
    if (!Array.isArray(group?.banners)) continue;
    for (const b of group.banners) {
      if (b.imageUrl) {
        result.total++;
        if (b.key === 'feed') result.feed++;
        else if (b.key === 'stories') result.stories++;
        else if (b.key === 'banner') result.banner++;
      }
      if (b.error) result.errors++;
    }
  }
  return result;
}

function getWeekLabel(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
        else if (Array.isArray(data.projects)) setProjects(data.projects);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const credits = (session?.user as any)?.credits ?? 0;
  const completedProjects = projects.filter(p => p.status === 'completed');
  const totalProjects = projects.length;

  const allBannerCounts = projects.reduce(
    (acc, p) => {
      const c = countBanners(p.banners);
      acc.total += c.total;
      acc.feed += c.feed;
      acc.stories += c.stories;
      acc.banner += c.banner;
      acc.errors += c.errors;
      return acc;
    },
    { total: 0, feed: 0, stories: 0, banner: 0, errors: 0 },
  );

  const archetypeCount: Record<string, number> = {};
  for (const p of projects) {
    const id = p.archetype?.id;
    if (id) archetypeCount[id] = (archetypeCount[id] || 0) + 1;
  }
  const archetypeSorted = Object.entries(archetypeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxArchCount = archetypeSorted[0]?.[1] ?? 1;

  const weekMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weekMap[getWeekLabel(d)] = 0;
  }
  for (const p of projects) {
    const label = getWeekLabel(new Date(p.created_at));
    if (label in weekMap) weekMap[label]++;
  }
  const weekData = Object.entries(weekMap);
  const maxWeek = Math.max(...weekData.map(w => w[1]), 1);

  const savedHours = completedProjects.length * HOURS_PER_PROJECT;
  const savedMoney = completedProjects.length * MONEY_PER_PROJECT;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-12 text-center">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-4"
            style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
          />
          <p className="text-white/40 text-sm">Загружаем аналитику...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── МЕТРИКИ ── */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Обзор</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: String(totalProjects), label: 'Проектов', sub: `завершено: ${completedProjects.length}`, icon: '◈' },
            { value: String(allBannerCounts.total), label: 'Баннеров', sub: `ошибок: ${allBannerCounts.errors}`, icon: '▦' },
            { value: String(credits), label: 'Кредитов', sub: 'осталось', icon: '⚡' },
            { value: `${completedProjects.length * 3}`, label: 'Гипотез', sub: 'протестировано', icon: '✦' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl font-bold" style={{ color: ACCENT }}>
                  {s.value}
                </span>
                <span
                  className="text-xs w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ background: ACCENT_BG, color: ACCENT }}
                >
                  {s.icon}
                </span>
              </div>
              <p className="text-white text-sm font-medium">{s.label}</p>
              <p className="text-white/30 text-xs">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ЭКОНОМИЯ ── */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Вы сэкономили</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="rounded-xl p-5 border"
            style={{ background: 'rgba(200,255,0,0.04)', borderColor: ACCENT_BORDER }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: ACCENT_BG }}
              >
                ⏱
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: ACCENT }}>
                  {savedHours > 0 ? `${savedHours}ч` : '—'}
                </p>
                <p className="text-white/40 text-xs">рабочего времени</p>
              </div>
            </div>
            <p className="text-white/25 text-xs leading-relaxed">
              Дизайнер тратит ~{HOURS_PER_PROJECT}ч на пакет баннеров.
              {completedProjects.length > 0 && ` Вы создали ${completedProjects.length} ${completedProjects.length === 1 ? 'пакет' : 'пакетов'} за минуты.`}
            </p>
          </div>

          <div
            className="rounded-xl p-5 border"
            style={{ background: 'rgba(200,255,0,0.04)', borderColor: ACCENT_BORDER }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: ACCENT_BG }}
              >
                💰
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: ACCENT }}>
                  {savedMoney > 0 ? `${savedMoney.toLocaleString('ru-RU')} ₽` : '—'}
                </p>
                <p className="text-white/40 text-xs">на дизайнере</p>
              </div>
            </div>
            <p className="text-white/25 text-xs leading-relaxed">
              Средняя стоимость пакета баннеров у фрилансера — {MONEY_PER_PROJECT.toLocaleString('ru-RU')} ₽.
              {completedProjects.length > 0 && ` Вы сэкономили на ${completedProjects.length} ${completedProjects.length === 1 ? 'проекте' : 'проектах'}.`}
            </p>
          </div>
        </div>
      </section>

      {/* ── ПОПУЛЯРНЫЕ АРХЕТИПЫ ── */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Популярные архетипы</p>
        <div
          className="rounded-xl border border-white/10 p-5"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          {archetypeSorted.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-4">
              Пока нет данных — создайте первый проект
            </p>
          ) : (
            <div className="space-y-3">
              {archetypeSorted.map(([id, count]) => {
                const def = ARCHETYPES.find(a => a.id === id);
                const pct = Math.round((count / maxArchCount) * 100);
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center shrink-0">{def?.icon ?? '◈'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium truncate">
                          {def?.label ?? id}
                        </span>
                        <span className="text-white/40 text-xs shrink-0 ml-2">
                          {count} {count === 1 ? 'проект' : 'проектов'}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: ACCENT }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── АКТИВНОСТЬ ПО НЕДЕЛЯМ ── */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Активность по неделям</p>
        <div
          className="rounded-xl border border-white/10 p-5"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-end gap-2 h-32">
            {weekData.map(([label, count]) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-white/40 text-[10px]">{count || ''}</span>
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max((count / maxWeek) * 100, 4)}%`,
                    background: count > 0 ? ACCENT : 'rgba(255,255,255,0.06)',
                    minHeight: 4,
                  }}
                />
                <span className="text-white/20 text-[9px] mt-1">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ФОРМАТЫ БАННЕРОВ ── */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Форматы баннеров</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Feed', sublabel: '1:1', count: allBannerCounts.feed, icon: '⬜' },
            { label: 'Stories', sublabel: '9:16', count: allBannerCounts.stories, icon: '📱' },
            { label: 'Banner', sublabel: '16:9', count: allBannerCounts.banner, icon: '🖥' },
          ].map(f => {
            const pct = allBannerCounts.total > 0 ? Math.round((f.count / allBannerCounts.total) * 100) : 0;
            return (
              <div
                key={f.label}
                className="rounded-xl p-4 border border-white/10 text-center"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-white font-semibold text-lg">{f.count}</p>
                <p className="text-white/50 text-xs font-medium">{f.label}</p>
                <p className="text-white/20 text-[10px]">{f.sublabel}</p>
                {allBannerCounts.total > 0 && (
                  <p className="text-xs mt-1" style={{ color: ACCENT }}>{pct}%</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTR ПРОМО ── */}
      <section>
        <div
          className="rounded-xl border p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="text-3xl mb-3 opacity-40">📊</div>
          <h3 className="text-white font-semibold mb-2">Аналитика рекламных кампаний</h3>
          <p className="text-white/35 text-sm leading-relaxed max-w-md mx-auto mb-4">
            Скоро — интеграция с рекламными кабинетами. Отслеживайте CTR, конверсии
            и ROI ваших баннеров прямо в Архетип-Протокол.
          </p>
          <span
            className="inline-block text-xs font-medium px-4 py-2 rounded-full"
            style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
          >
            Скоро
          </span>
        </div>
      </section>
    </div>
  );
}
