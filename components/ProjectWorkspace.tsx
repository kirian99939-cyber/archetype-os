'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ARCHETYPES } from '@/lib/archetypes';
import { BANNER_FORMATS } from '@/lib/project-types';
import type { ProjectData, BannerGroup } from '@/lib/project-types';
import { useBannerGeneration, MAX_REFRESHES_PER_BANNER } from '@/hooks/useBannerGeneration';
import type { NewHypothesis } from '@/app/api/analyze/route';
import AnimatedLogo from '@/components/AnimatedLogo';
import LoadingMessages from '@/components/LoadingMessages';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

type Tab = 'brief' | 'archetypes' | 'hypotheses' | 'banners';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'brief',       label: 'Бриф',      icon: '📋' },
  { id: 'archetypes',  label: 'Архетипы',   icon: '◈' },
  { id: 'hypotheses',  label: 'Гипотезы',   icon: '💡' },
  { id: 'banners',     label: 'Баннеры',    icon: '🖼' },
];

interface ProjectWorkspaceProps {
  project: ProjectData;
}

export default function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<Tab>('banners');
  const projectIdRef = useRef<string | null>(project.id);

  // Подготовка данных для хука
  const brief = project.brief ?? {
    product: '', price: '', audience: '', goal: '', utp: '', offer: '',
    toneOfVoice: 'friendly', platforms: [], context: '',
    visualMode: 'ai' as const, imageUrls: [], imageLink: '',
  };

  const hypotheses: NewHypothesis[] = (project.hypotheses ?? []) as NewHypothesis[];
  const allHypothesesSet = new Set(hypotheses.map((_, i) => i));
  const selectedFormats = new Set(BANNER_FORMATS.map(f => f.key));

  const selectedArchetypes = project.archetypes
    ? project.archetypes.map((a, i) => ({ id: a.id, rank: i + 1 }))
    : project.archetype?.id
    ? [{ id: project.archetype.id, rank: 1 }]
    : [];

  const {
    bannerGroups, setBannerGroups,
    activeBannerTab,
    isSwitchingTab,
    anyBannerLoading,
    showNoCreditsModal, setShowNoCreditsModal,
    activeBannerGroup,
    handleGenerateBanners,
    handleRefreshBanner,
    handleDownload,
    switchTab,
  } = useBannerGeneration({
    brief,
    hypotheses,
    selectedHypotheses: allHypothesesSet,
    selectedFormats,
    selectedArchetypes,
    analyzeResult: null,
    projectIdRef,
  });

  // Восстановить баннеры из проекта при первом рендере
  const initializedRef = useRef(false);
  if (!initializedRef.current && project.banners && project.banners.length > 0 && bannerGroups.length === 0) {
    initializedRef.current = true;
    const restored: BannerGroup[] = project.banners.map((g) => ({
      hypothesisIndex: g.hypothesisIndex,
      hypothesisTitle: g.hypothesisTitle,
      banners: g.banners.map(b => ({
        ...b,
        loading: false,
        taskId: b.taskId ?? null,
        error: b.error ?? null,
        width: b.width ?? BANNER_FORMATS.find(f => f.key === b.key)?.width ?? 1080,
        height: b.height ?? BANNER_FORMATS.find(f => f.key === b.key)?.height ?? 1080,
        refreshCount: b.refreshCount ?? 0,
        previousVersions: b.previousVersions ?? [],
      })),
    }));
    // Use setTimeout to avoid setting state during render
    setTimeout(() => setBannerGroups(restored), 0);
  }

  const archDefs = selectedArchetypes
    .map(a => ARCHETYPES.find(d => d.id === a.id))
    .filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Project title */}
      <div>
        <h2 className="text-white font-semibold text-xl">{project.title || 'Без названия'}</h2>
        <p className="text-white/35 text-sm mt-1">
          Создан {new Date(project.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all relative"
              style={{
                color: isActive ? ACCENT : 'rgba(255,255,255,0.45)',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: ACCENT }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════ TAB: BRIEF ═══════════ */}
      {activeTab === 'brief' && project.brief && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-white font-semibold text-lg mb-2">Бриф проекта</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Продукт', value: project.brief.product },
              { label: 'Цена', value: project.brief.price },
              { label: 'Аудитория', value: project.brief.audience },
              { label: 'Цель', value: project.brief.goal },
              { label: 'УТП', value: project.brief.utp },
              { label: 'Оффер', value: project.brief.offer },
              { label: 'Tone of Voice', value: project.brief.toneOfVoice },
              { label: 'Платформы', value: project.brief.platforms?.join(', ') },
            ].filter(f => f.value).map(field => (
              <div key={field.label} className="space-y-1">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{field.label}</p>
                <p className="text-white/80 text-sm">{field.value}</p>
              </div>
            ))}
          </div>
          {project.brief.context && (
            <div className="space-y-1">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Контекст</p>
              <p className="text-white/80 text-sm">{project.brief.context}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: ARCHETYPES ═══════════ */}
      {activeTab === 'archetypes' && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg">Выбранные архетипы</h3>
          {archDefs.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-white/35 text-sm">Архетипы не выбраны</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {archDefs.map((def, i) => (
                <div
                  key={def!.id}
                  className="glass-card p-5 space-y-3"
                  style={{ border: i === 0 ? `1px solid ${ACCENT_BORDER}` : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{def!.icon}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{def!.label}</p>
                      <p className="text-white/30 text-xs">{i === 0 ? 'Основной' : `#${i + 1}`}</p>
                    </div>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">{def!.audience}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {def!.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: HYPOTHESES ═══════════ */}
      {activeTab === 'hypotheses' && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg">Гипотезы</h3>
          {hypotheses.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-white/35 text-sm">Гипотезы не сгенерированы</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hypotheses.map((h, i) => (
                <div key={i} className="glass-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: ACCENT, color: '#0A0A0A' }}
                    >
                      {i + 1}
                    </div>
                    {(h as any).archetypeLabel && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                      >
                        {(h as any).archetypeLabel}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">Идея</p>
                    <p className="text-white text-sm font-medium">{h.idea}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">Визуал</p>
                    <p className="text-white/60 text-sm">{h.visual}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">Заголовок</p>
                    <p className="text-white text-sm font-semibold">{h.headline}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">CTA</p>
                      <p className="text-sm font-bold" style={{ color: ACCENT }}>{h.cta}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">Хук</p>
                      <p className="text-white/55 text-xs italic">{h.hook}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: BANNERS ═══════════ */}
      {activeTab === 'banners' && (
        <div className="space-y-5">
          {/* Tabs по гипотезам */}
          {bannerGroups.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {bannerGroups.map((group, gi) => {
                const isActive = activeBannerTab === gi;
                const groupLoading = group.banners.some(b => b.loading);
                return (
                  <button
                    key={gi}
                    onClick={() => switchTab(gi)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isActive ? ACCENT_BG : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                      color: isActive ? ACCENT : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {groupLoading && <AnimatedLogo size={16} inline />}
                    <span className="max-w-[140px] truncate">
                      Г{group.hypothesisIndex + 1}: {group.hypothesisTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Заголовок текущей гипотезы */}
          {activeBannerGroup && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
            >
              <span className="text-white/40 text-xs uppercase tracking-wide mr-2">
                Гипотеза {activeBannerGroup.hypothesisIndex + 1}
              </span>
              <span className="text-white/80">{activeBannerGroup.hypothesisTitle}</span>
            </div>
          )}

          {/* Банер карточки */}
          {isSwitchingTab ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {BANNER_FORMATS.map(fmt => (
                <div key={fmt.key} className="glass-card p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">{fmt.label}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT }}>
                      {fmt.sublabel}
                    </span>
                  </div>
                  <div className="skeleton-shimmer rounded-xl" style={{ aspectRatio: `${fmt.width} / ${fmt.height}`, minHeight: 100 }} />
                </div>
              ))}
            </div>
          ) : activeBannerGroup ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 banner-fade-in">
              {activeBannerGroup.banners.map(banner => (
                <div key={banner.key} className="glass-card p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">{banner.label}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT }}>
                      {banner.sublabel}
                    </span>
                  </div>

                  {/* Image area */}
                  <div
                    className="rounded-xl overflow-hidden relative flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      aspectRatio: `${banner.width} / ${banner.height}`,
                      minHeight: 100,
                    }}
                  >
                    {banner.imageUrl && (
                      <Image
                        src={banner.imageUrl}
                        alt={`${banner.label} banner`}
                        width={banner.width}
                        height={banner.height}
                        className="w-full h-auto object-contain transition-opacity duration-300"
                        style={{ opacity: banner.loading ? 0.3 : 1 }}
                        unoptimized
                      />
                    )}
                    {banner.loading && banner.imageUrl && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-10" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <AnimatedLogo size={48} inline />
                        <LoadingMessages intervalMs={3000} />
                      </div>
                    )}
                    {banner.loading && !banner.imageUrl && (
                      <div className="flex flex-col items-center justify-center gap-4 p-10">
                        <AnimatedLogo size={64} inline />
                        <LoadingMessages intervalMs={3000} />
                      </div>
                    )}
                    {!banner.loading && !banner.imageUrl && !banner.error && (
                      <div className="text-center p-4">
                        <div className="text-2xl mb-2 opacity-30">🖼</div>
                        <p className="text-white/20 text-xs">Ожидание...</p>
                      </div>
                    )}
                    {banner.error && !banner.imageUrl && (
                      <p className="text-red-400 text-xs text-center p-3">{banner.error}</p>
                    )}
                  </div>

                  {banner.error && banner.imageUrl && (
                    <p className="text-red-400 text-xs text-center">{banner.error}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(banner)}
                      disabled={!banner.imageUrl}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={
                        banner.imageUrl
                          ? { background: ACCENT, color: '#0A0A0A' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }
                      }
                    >
                      ↓ Скачать
                    </button>
                    <button
                      onClick={() => handleRefreshBanner(activeBannerTab, banner.key)}
                      disabled={banner.loading || banner.refreshCount >= MAX_REFRESHES_PER_BANNER}
                      title={
                        banner.refreshCount >= MAX_REFRESHES_PER_BANNER
                          ? `Лимит обновлений (${MAX_REFRESHES_PER_BANNER})`
                          : 'Сгенерировать заново'
                      }
                      className="py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1"
                      style={
                        banner.loading || banner.refreshCount >= MAX_REFRESHES_PER_BANNER
                          ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }
                          : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                      }
                    >
                      🔄{banner.refreshCount > 0 && <span className="text-[10px]">{banner.refreshCount}/{MAX_REFRESHES_PER_BANNER}</span>}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>10 кр</span>
                    </button>
                    {banner.imageUrl && (
                      <a
                        href={banner.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-10 text-center">
              <div className="text-3xl mb-3">🖼</div>
              <p className="text-white/40 text-sm">Баннеры не найдены</p>
            </div>
          )}

          {/* Кнопка генерации ещё */}
          {bannerGroups.length > 0 && !anyBannerLoading && (
            <div className="flex gap-3">
              <button
                onClick={handleGenerateBanners}
                className="btn-primary flex items-center gap-2"
              >
                ⚡ Сгенерировать ещё
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MODAL: NO CREDITS ═══════════ */}
      {showNoCreditsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowNoCreditsModal(false)}
        >
          <div
            className="glass-card p-8 max-w-sm w-full text-center"
            style={{ border: `1px solid ${ACCENT_BORDER}` }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
            >
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Недостаточно кредитов</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Купите больше кредитов чтобы продолжить.
            </p>
            <button
              onClick={() => setShowNoCreditsModal(false)}
              className="btn-secondary text-sm w-full"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
