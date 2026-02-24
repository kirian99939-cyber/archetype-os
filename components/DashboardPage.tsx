'use client';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.2)';

interface Props {
  onNavigate: (page: string) => void;
}

const STATS = [
  { value: '+37%', label: 'Средний прирост CTR', sub: 'vs. без архетипа', icon: '↗' },
  { value: '4.2ч', label: 'Экономия на гипотезу', sub: 'от брифа до баннера', icon: '⏱' },
  { value: '156',  label: 'Креативов создано',   sub: 'за всё время', icon: '◈' },
];

const QUICK_ACTIONS = [
  { label: 'Создать проект',       icon: '+', page: 'new-project' },
  { label: 'Библиотека архетипов', icon: '◈', page: 'archetypes'  },
  { label: 'История генераций',    icon: '◷', page: 'history'     },
];

type ProjectStatus = 'active' | 'done' | 'draft';

interface Project {
  name: string;
  archetype: string;
  emoji: string;
  date: string;
  status: ProjectStatus;
}

const RECENT_PROJECTS: Project[] = [
  {
    name: 'Запуск приложения FitFlow',
    archetype: 'Герой',
    emoji: '⚔️',
    date: '21 фев 2026',
    status: 'active',
  },
  {
    name: 'Кампания «Осень с нами»',
    archetype: 'Хранитель',
    emoji: '🌿',
    date: '14 фев 2026',
    status: 'done',
  },
  {
    name: 'Ребрендинг BrandLab Pro',
    archetype: 'Инноватор',
    emoji: '💡',
    date: '9 фев 2026',
    status: 'draft',
  },
];

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Активен',  color: ACCENT,                    bg: ACCENT_BG },
  done:   { label: 'Готов',    color: 'rgba(100,220,150,0.9)',    bg: 'rgba(100,220,150,0.1)' },
  draft:  { label: 'Черновик', color: 'rgba(255,255,255,0.35)',   bg: 'rgba(255,255,255,0.06)' },
};

export default function DashboardPage({ onNavigate }: Props) {
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
                  {s.value}
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-colors"
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
          {RECENT_PROJECTS.map((p, i) => {
            const meta = STATUS_META[p.status];
            return (
              <div
                key={p.name}
                className="flex items-center gap-4 px-5 py-4 transition-colors cursor-default"
                style={{
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
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
                  {p.emoji}
                </div>

                {/* Name + archetype */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <p className="text-white/35 text-xs mt-0.5">{p.archetype}</p>
                </div>

                {/* Date */}
                <p className="text-white/25 text-xs shrink-0 hidden sm:block">{p.date}</p>

                {/* Status */}
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
