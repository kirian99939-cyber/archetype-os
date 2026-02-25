'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ARCHETYPES } from '@/lib/archetypes';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.2)';

interface Props {
  onNavigate: (page: string) => void;
}

interface ProjectData {
  id: string;
  title: string;
  status: string;
  archetype: { id: string } | null;
  banners: any[] | null;
  brief: any | null;
  created_at: string;
  updated_at: string;
}

type DisplayStatus = 'active' | 'done' | 'draft';

const STATUS_META: Record<DisplayStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'В работе', color: ACCENT, bg: ACCENT_BG },
  done: { label: 'Готов', color: 'rgba(100,220,150,0.9)', bg: 'rgba(100,220,150,0.1)' },
  draft: { label: 'Черновик', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.06)' },
};

const QUICK_ACTIONS = [
  { label: 'Создать проект', icon: '+', page: 'new-project' },
  { label: 'Библиотека архетипов', icon: '◈', page: 'archetypes' },
  { label: 'История генераций', icon: '◷', page: 'history' },
];

function mapStatus(status: string): DisplayStatus {
  if (status === 'completed') return 'done';
  if (status === 'draft') return 'draft';
  return 'active'; // brief, archetype, hypotheses — всё "в работе"
}

function getArchetypeMeta(archetypeId: string | undefined) {
  if (!archetypeId) return { icon: '◈', label: 'Не выбран' };
  const found = ARCHETYPES.find((a) => a.id === archetypeId);
  return found ? { icon: found.icon, label: found.label } : { icon: '◈', label: archetypeId };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function countBanners(banners: any[] | null): number {
  if (!Array.isArray(banners)) return 0;
  return banners.reduce((sum: number, group: any) => {
    if (Array.isArray(group?.banners)) return sum + group.banners.filter((b: any) => b?.imageUrl).length;
    return sum;
  }, 0);
}

export default function DashboardPage({ onNavigate }: Props) {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
        else if (Array.isArray(data.projects)) setProjects(data.projects);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const credits = (session?.user as any)?.credits ?? 0;
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const totalBanners = projects.reduce((sum, p) => sum + countBanners(p.banners), 0);
  const recentProjects = projects.slice(0, 5);

  const STATS = [
    { value: String(totalProjects), label: 'Всего проектов', sub: `из них завершено: ${completedProjects}`, icon: '◈' },
    { value: String(totalBanners), label: 'Баннеров создано', sub: 'за всё время', icon: '▦' },
    { value: String(credits), label: 'Кредитов осталось', sub: '1 кредит = 1 пакет баннеров', icon: '⚡' },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* Stat cards */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Метрики</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-5 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl font-bold" style={{ color: ACCENT }}>
                  {loading ? '—' : s.value}
                </span>
                <span
                  className="text-sm w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: ACCENT_BG, color: ACCENT }}
                >
                  {s.icon}
                </span>
              </div>
              <p className="text-white text-sm font-medium leading-tight">{s.label}</p>
              <p className="text-white/30 text-xs mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick start */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">Быстрый старт</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.page}
              onClick={() => onNavigate(a.page)}
              className="rounded-xl px-4 py-4 border flex items-center gap-3 text-left transition-all group"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = ACCENT_BORDER;
                (e.currentTarget as HTMLButtonElement).style.background = ACCENT_BG;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                {a.icon}
              </span>
              <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest">Последние проекты</p>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ACCENT; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; }}
          >
            Все проекты →
          </button>
        </div>

        <div
          className="rounded-xl border border-white/10 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          {loading ? (
            <div className="px-5 py-8 text-center text-white/20 text-sm">Загрузка...</div>
          ) : recentProjects.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-white/25 text-sm mb-3">Проектов пока нет</p>
              <button
                onClick={() => onNavigate('new-project')}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ color: ACCENT, background: ACCENT_BG }}
              >
                Создать первый проект →
              </button>
            </div>
          ) : (
            recentProjects.map((p, i) => {
              const displayStatus = mapStatus(p.status);
              const meta = STATUS_META[displayStatus];
              const archMeta = getArchetypeMeta(p.archetype?.id);
              const bannerCount = countBanners(p.banners);

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer"
                  style={{
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                  onClick={() => {
                    localStorage.setItem('archetype_draft_project', JSON.stringify({ id: p.id, title: p.title }));
                    onNavigate('new-project');
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {/* Archetype icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ background: ACCENT_BG }}
                  >
                    {archMeta.icon}
                  </div>

                  {/* Name + archetype */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {p.title || 'Без названия'}
                    </p>
                    <p className="text-white/35 text-xs mt-0.5">
                      {archMeta.label}
                      {bannerCount > 0 && ` · ${bannerCount} баннер${bannerCount === 1 ? '' : bannerCount < 5 ? 'а' : 'ов'}`}
                    </p>
                  </div>

                  {/* Date */}
                  <p className="text-white/25 text-xs shrink-0 hidden sm:block">
                    {formatDate(p.updated_at || p.created_at)}
                  </p>

                  {/* Status */}
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
