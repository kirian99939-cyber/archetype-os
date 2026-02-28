'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ARCHETYPES } from '@/lib/archetypes';
import AnimatedLogo from '@/components/AnimatedLogo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BannerItem {
  key:      string;
  label:    string;
  sublabel: string;
  imageUrl: string | null;
  error:    string | null;
}

interface BannerGroup {
  hypothesisIndex: number;
  hypothesisTitle: string;
  banners:         BannerItem[];
}

interface Project {
  id:         string;
  title:      string | null;
  status:     string | null;
  created_at: string;
  updated_at: string;
  archetype:  { id: string } | null;
  banners:    BannerGroup[] | null;
}

export interface HistoryPageProps {
  onNavigate: (page: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT        = '#C8FF00';
const ACCENT_BG     = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

type StatusKey = 'draft' | 'brief' | 'archetype' | 'hypotheses' | 'completed';

const STATUS_MAP: Record<StatusKey, { label: string; color: string; bg: string }> = {
  draft:      { label: 'Черновик',   color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.07)' },
  brief:      { label: 'Черновик',   color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.07)' },
  archetype:  { label: 'В процессе', color: ACCENT,                   bg: ACCENT_BG },
  hypotheses: { label: 'В процессе', color: ACCENT,                   bg: ACCENT_BG },
  completed:  { label: 'Готов',      color: '#4ade80',                bg: 'rgba(74,222,128,0.1)' },
};

function statusInfo(s: string | null) {
  return STATUS_MAP[(s ?? 'draft') as StatusKey] ?? STATUS_MAP.draft;
}

function formatDate(iso: string) {
  const d     = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate()     === today.getDate()    &&
    d.getMonth()    === today.getMonth()   &&
    d.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Сегодня, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Первый найденный imageUrl среди всех групп и форматов */
function firstBannerUrl(banners: BannerGroup[] | null): string | null {
  if (!banners?.length) return null;
  for (const group of banners) {
    for (const b of group.banners) {
      if (b.imageUrl) return b.imageUrl;
    }
  }
  return null;
}

function totalReadyBanners(banners: BannerGroup[] | null): number {
  if (!banners?.length) return 0;
  return banners.reduce(
    (sum, g) => sum + g.banners.filter(b => b.imageUrl).length,
    0,
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryPage({ onNavigate }: HistoryPageProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setProjects(prev => prev.filter(p => p.id !== deleteId));
      // Очищаем localStorage если удалённый проект был черновиком
      try {
        const raw = localStorage.getItem('archetype_draft_project');
        if (raw) {
          const meta = JSON.parse(raw);
          if (meta.id === deleteId) localStorage.removeItem('archetype_draft_project');
        }
      } catch {}
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setProjects(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleContinue = (project: Project) => {
    router.push(`/project/${project.id}`);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-12 flex flex-col items-center">
          <AnimatedLogo size={48} inline />
          <p className="text-white/40 text-sm mt-4">Загружаем историю...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-10 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button onClick={fetchProjects} className="btn-primary text-sm px-6">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (projects.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-14 text-center">
          <div className="text-4xl mb-4 opacity-30">📂</div>
          <h3 className="text-white font-semibold text-lg mb-2">Проектов пока нет</h3>
          <p className="text-white/35 text-sm mb-6">
            Создайте первый проект — он появится здесь
          </p>
          <button
            onClick={() => router.push('/project/new')}
            className="btn-primary text-sm px-8"
          >
            + Новый проект
          </button>
        </div>
      </div>
    );
  }

  // ── Projects grid ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-xl">История проектов</h2>
          <p className="text-white/35 text-sm mt-0.5">{projects.length} {projects.length === 1 ? 'проект' : 'проектов'}</p>
        </div>
        <button onClick={() => router.push('/project/new')} className="btn-primary text-sm px-5">
          + Новый
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => {
          const title        = project.title || 'Без названия';
          const st           = statusInfo(project.status);
          const isCompleted  = project.status === 'completed';
          const thumbUrl     = firstBannerUrl(project.banners);
          const readyCount   = totalReadyBanners(project.banners);
          const groupCount   = project.banners?.length ?? 0;
          const archetypeDef = project.archetype?.id
            ? ARCHETYPES.find(a => a.id === project.archetype!.id)
            : null;

          return (
            <div key={project.id} className="glass-card flex flex-col overflow-hidden">

              {/* Thumbnail */}
              <div
                className="w-full relative overflow-hidden"
                style={{
                  aspectRatio: '16 / 9',
                  background:  'rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-25">
                    <span className="text-3xl">🖼</span>
                    <span className="text-white/60 text-xs">Нет баннеров</span>
                  </div>
                )}

                {/* Status badge */}
                <span
                  className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: st.bg, color: st.color }}
                >
                  {st.label}
                </span>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col gap-3 flex-1">

                <div>
                  <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                    {title}
                  </h3>
                  <p className="text-white/30 text-xs mt-1">{formatDate(project.updated_at)}</p>
                </div>

                {/* Archetype chip */}
                {archetypeDef && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{archetypeDef.icon}</span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                    >
                      {archetypeDef.label}
                    </span>
                  </div>
                )}

                {/* Banners summary */}
                {groupCount > 0 && (
                  <p className="text-white/25 text-xs">
                    {groupCount} {groupCount === 1 ? 'гипотеза' : 'гипотезы'} · {readyCount} баннеров готово
                  </p>
                )}

                {/* Actions */}
                <div className="mt-auto pt-1 flex gap-2">
                  {isCompleted ? (
                    <button
                      onClick={() => handleContinue(project)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Открыть
                    </button>
                  ) : (
                    <button
                      onClick={() => handleContinue(project)}
                      className="btn-primary flex-1 text-sm"
                    >
                      Продолжить →
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                    className="py-2 px-3 rounded-xl text-sm transition-all"
                    style={{
                      background: 'rgba(255,80,80,0.08)',
                      border: '1px solid rgba(255,80,80,0.15)',
                      color: 'rgba(255,100,100,0.6)',
                    }}
                    title="Удалить проект"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════ MODAL: DELETE CONFIRM ══════════ */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => !deleting && setDeleteId(null)}
        >
          <div
            className="glass-card p-8 max-w-sm w-full text-center"
            style={{ border: '1px solid rgba(255,80,80,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)' }}
            >
              <span style={{ fontSize: '1.5rem' }}>🗑</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Удалить проект?</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Проект и все баннеры будут удалены безвозвратно.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255,80,80,0.15)',
                  border: '1px solid rgba(255,80,80,0.3)',
                  color: 'rgba(255,100,100,0.9)',
                }}
              >
                {deleting ? 'Удаляем...' : 'Да, удалить'}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="btn-secondary text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
