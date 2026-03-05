'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { ARCHETYPES } from '@/lib/archetypes';
import { BANNER_FORMATS } from '@/lib/project-types';
import type { ProjectData, BannerGroup, Brief } from '@/lib/project-types';
import { useBannerGeneration, MAX_REFRESHES_PER_BANNER } from '@/hooks/useBannerGeneration';
import type { NewHypothesis } from '@/app/api/analyze/route';
import type { ArchetypeDefinition } from '@/lib/archetypes';
import AnimatedLogo from '@/components/AnimatedLogo';
import LoadingMessages from '@/components/LoadingMessages';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

const TONE_OF_VOICE = [
  { id: 'friendly', label: 'На «ты»', icon: '😊' },
  { id: 'formal', label: 'На «вы»', icon: '🤝' },
  { id: 'provocative', label: 'Провокационный', icon: '🔥' },
  { id: 'expert', label: 'Экспертный', icon: '🎯' },
];

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

export default function ProjectWorkspace({ project: initialProject }: ProjectWorkspaceProps) {
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState<Tab>('banners');
  const projectIdRef = useRef<string | null>(project.id);

  // ── Brief editing ──
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [editedBrief, setEditedBrief] = useState<Brief>(() => project.brief ?? {
    product: '', price: '', audience: '', goal: '', utp: '', offer: '',
    toneOfVoice: 'friendly', platforms: [], context: '',
    visualMode: 'ai' as const, imageUrls: [], imageLink: '',
  });
  const [savingBrief, setSavingBrief] = useState(false);

  const handleSaveBrief = async () => {
    setSavingBrief(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: editedBrief,
          title: editedBrief.product || project.title,
        }),
      });
      if (res.ok) {
        setProject(prev => ({ ...prev, brief: editedBrief, title: editedBrief.product || prev.title }));
        setIsEditingBrief(false);
      }
    } catch (err) {
      console.error('Failed to save brief:', err);
    } finally {
      setSavingBrief(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingBrief(false);
    setEditedBrief(project.brief ?? {
      product: '', price: '', audience: '', goal: '', utp: '', offer: '',
      toneOfVoice: 'friendly', platforms: [], context: '',
      visualMode: 'ai' as const, imageUrls: [], imageLink: '',
    });
  };

  // Подготовка данных для хука
  const brief = project.brief ?? {
    product: '', price: '', audience: '', goal: '', utp: '', offer: '',
    toneOfVoice: 'friendly', platforms: [], context: '',
    visualMode: 'ai' as const, imageUrls: [], imageLink: '',
  };

  // ── Мутабельное локальное состояние ──
  const [localArchetypes, setLocalArchetypes] = useState(() =>
    project.archetypes?.map((a, i) => ({ id: a.id as string, rank: i + 1 }))
    ?? (project.archetype?.id ? [{ id: project.archetype.id as string, rank: 1 }] : [])
  );
  const [localHypotheses, setLocalHypotheses] = useState<NewHypothesis[]>(
    (project.hypotheses ?? []) as NewHypothesis[]
  );

  const allHypothesesSet = new Set(localHypotheses.map((_, i) => i));
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(
    new Set(BANNER_FORMATS.map(f => f.key))
  );

  const toggleFormat = (key: string) => {
    setSelectedFormats(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const [pendingHypIndex, setPendingHypIndex] = useState<number | null>(null);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [showArchetypePicker, setShowArchetypePicker] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Восстановить баннеры из проекта при первом рендере
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialBannerGroups = useMemo<BannerGroup[]>(() => {
    if (!project.banners || project.banners.length === 0) return [];
    return project.banners.map((g) => ({
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
  }, []); // только при маунте

  const {
    bannerGroups,
    activeBannerTab, setActiveBannerTab,
    isSwitchingTab,
    anyBannerLoading,
    showNoCreditsModal, setShowNoCreditsModal,
    activeBannerGroup,
    handleGenerateBanners,
    generateForSingleHypothesis,
    handleRefreshBanner,
    handleDownload,
    switchTab,
  } = useBannerGeneration({
    brief,
    hypotheses: localHypotheses,
    selectedHypotheses: allHypothesesSet,
    selectedFormats,
    selectedArchetypes: localArchetypes,
    analyzeResult: null,
    projectIdRef,
    initialBannerGroups,
  });

  const archDefs = localArchetypes
    .map(a => ARCHETYPES.find(d => d.id === a.id))
    .filter(Boolean) as ArchetypeDefinition[];

  // ── Группировка гипотез по архетипам ──
  const hypothesesByArchetype = useMemo(() => {
    const groups: Record<string, { archDef: ArchetypeDefinition | undefined; items: { h: NewHypothesis; index: number }[] }> = {};
    localHypotheses.forEach((h, i) => {
      const key = h.archetypeId || '_none';
      if (!groups[key]) {
        groups[key] = { archDef: ARCHETYPES.find(a => a.id === h.archetypeId), items: [] };
      }
      groups[key].items.push({ h, index: i });
    });
    return groups;
  }, [localHypotheses]);

  // ── handleAddHypothesis — генерация одной гипотезы ──
  const handleAddHypothesis = useCallback(async (archetypeId: string) => {
    setGenerating(true);
    try {
      const archDef = ARCHETYPES.find(a => a.id === archetypeId);
      const rank = localArchetypes.findIndex(a => a.id === archetypeId) + 1;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-hypotheses',
          selectedArchetypes: [{ id: archetypeId, label: archDef?.label || archetypeId, rank }],
          product: brief.product,
          price: brief.price,
          audience: brief.audience,
          goal: brief.goal,
          utp: brief.utp,
          offer: brief.offer,
          toneOfVoice: brief.toneOfVoice,
          platforms: brief.platforms,
          context: brief.context,
        }),
      });

      const data = await res.json();
      if (data.newHypotheses?.length) {
        const newHyps = [...localHypotheses, ...data.newHypotheses];
        setLocalHypotheses(newHyps);

        // Сохранить в БД
        await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hypotheses: newHyps }),
        });

        setActiveTab('hypotheses');
      }
    } catch (err) {
      console.error('Failed to generate hypothesis:', err);
    } finally {
      setGenerating(false);
    }
  }, [localArchetypes, localHypotheses, brief, project.id]);

  // ── handlePickArchetype — выбрать новый архетип и сразу сгенерить гипотезу ──
  const handlePickArchetype = useCallback(async (archetypeId: string) => {
    setShowArchetypePicker(false);

    const newArchetypes = [...localArchetypes, { id: archetypeId, rank: localArchetypes.length + 1 }];
    setLocalArchetypes(newArchetypes);

    // Сохранить архетипы в БД
    const archPayload = newArchetypes.map(a => {
      const def = ARCHETYPES.find(d => d.id === a.id);
      return { id: a.id, label: def?.label || a.id };
    });
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archetypes: archPayload }),
    });

    // Сгенерировать гипотезу для нового архетипа
    handleAddHypothesis(archetypeId);
  }, [localArchetypes, project.id, handleAddHypothesis]);

  // ── handleGenerateBannersForHypothesis ──
  const handleGenerateBannersForHypothesis = useCallback((hypIndex: number) => {
    setPendingHypIndex(hypIndex);
    setShowFormatPicker(true);
  }, []);

  const handleConfirmGenerate = useCallback(async () => {
    if (pendingHypIndex === null) return;
    const hyp = localHypotheses[pendingHypIndex];
    if (!hyp) return;
    setShowFormatPicker(false);
    setActiveTab('banners');
    await generateForSingleHypothesis(pendingHypIndex, hyp);
    setPendingHypIndex(null);
  }, [pendingHypIndex, localHypotheses, generateForSingleHypothesis]);

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

      {/* Generating overlay */}
      {generating && (
        <div className="glass-card p-6 flex items-center gap-4">
          <AnimatedLogo size={32} inline />
          <div>
            <p className="text-white font-medium text-sm">Генерируем гипотезу...</p>
            <p className="text-white/40 text-xs">Это займёт несколько секунд</p>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: BRIEF ═══════════ */}
      {activeTab === 'brief' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-lg">Бриф проекта</h3>
            {!isEditingBrief ? (
              <button
                onClick={() => setIsEditingBrief(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all hover:border-white/20"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                ✏️ Редактировать
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveBrief}
                  disabled={savingBrief}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: ACCENT, color: '#0A0A0A', opacity: savingBrief ? 0.6 : 1 }}
                >
                  {savingBrief ? '...' : 'Сохранить'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Отмена
                </button>
              </div>
            )}
          </div>

          {isEditingBrief ? (
            /* ── Режим редактирования ── */
            <div className="space-y-4">
              {([
                { key: 'product' as const, label: 'Продукт', placeholder: 'Что продаёте?', multiline: false },
                { key: 'price' as const, label: 'Цена', placeholder: 'Цена или сегмент', multiline: false },
                { key: 'audience' as const, label: 'Аудитория', placeholder: 'Кому продаёте?', multiline: true },
                { key: 'goal' as const, label: 'Цель', placeholder: 'Цель рекламы', multiline: false },
                { key: 'utp' as const, label: 'УТП', placeholder: 'Уникальное торговое предложение', multiline: true },
                { key: 'offer' as const, label: 'Оффер', placeholder: 'Оффер для рекламы', multiline: true },
              ]).map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-white/40 text-xs font-medium uppercase tracking-wider">{field.label}</label>
                  {field.multiline ? (
                    <textarea
                      value={editedBrief[field.key] || ''}
                      onChange={e => setEditedBrief(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid rgba(200,255,0,0.2)`,
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14,
                        resize: 'vertical',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={editedBrief[field.key] || ''}
                      onChange={e => setEditedBrief(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid rgba(200,255,0,0.2)`,
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  )}
                </div>
              ))}

              {/* Tone of Voice — чипы */}
              <div className="space-y-1.5">
                <label className="text-white/40 text-xs font-medium uppercase tracking-wider">Tone of Voice</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OF_VOICE.map(t => {
                    const active = editedBrief.toneOfVoice === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditedBrief(prev => ({ ...prev, toneOfVoice: t.id }))}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 12,
                          fontSize: 14,
                          cursor: 'pointer',
                          border: `1.5px solid ${active ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                          background: active ? ACCENT_BG : 'rgba(255,255,255,0.04)',
                          color: active ? ACCENT : 'rgba(255,255,255,0.55)',
                          fontWeight: active ? 600 : 400,
                          transition: 'all .15s',
                        }}
                      >
                        {t.icon} {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Контекст */}
              <div className="space-y-1.5">
                <label className="text-white/40 text-xs font-medium uppercase tracking-wider">Контекст</label>
                <textarea
                  value={editedBrief.context || ''}
                  onChange={e => setEditedBrief(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="Дополнительный контекст"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(200,255,0,0.2)`,
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 14,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          ) : project.brief ? (
            /* ── Режим просмотра ── */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Продукт', value: project.brief.product },
                  { label: 'Цена', value: project.brief.price },
                  { label: 'Аудитория', value: project.brief.audience },
                  { label: 'Цель', value: project.brief.goal },
                  { label: 'УТП', value: project.brief.utp },
                  { label: 'Оффер', value: project.brief.offer },
                  { label: 'Tone of Voice', value: TONE_OF_VOICE.find(t => t.id === project.brief?.toneOfVoice)
                    ? `${TONE_OF_VOICE.find(t => t.id === project.brief?.toneOfVoice)!.icon} ${TONE_OF_VOICE.find(t => t.id === project.brief?.toneOfVoice)!.label}`
                    : project.brief.toneOfVoice },
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
            </>
          ) : (
            <p className="text-white/35 text-sm">Бриф не заполнен</p>
          )}
        </div>
      )}

      {/* ═══════════ TAB: ARCHETYPES ═══════════ */}
      {activeTab === 'archetypes' && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg">Выбранные архетипы</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archDefs.map((def, i) => (
              <div
                key={def.id}
                className="glass-card p-5 space-y-3"
                style={{ border: i === 0 ? `1px solid ${ACCENT_BORDER}` : undefined }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{def.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{def.label}</p>
                    <p className="text-white/30 text-xs">{i === 0 ? 'Основной' : `#${i + 1}`}</p>
                  </div>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{def.audience}</p>
                <div className="flex flex-wrap gap-1.5">
                  {def.tags.map(tag => (
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

            {/* Кнопка "+ Архетип" */}
            <div
              onClick={() => setShowArchetypePicker(true)}
              className="glass-card p-5 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-white/20"
              style={{ border: '2px dashed rgba(255,255,255,0.15)', minHeight: 160 }}
            >
              <span className="text-3xl mb-2" style={{ color: ACCENT }}>+</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Добавить архетип</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: HYPOTHESES ═══════════ */}
      {activeTab === 'hypotheses' && (
        <div className="space-y-6">
          <h3 className="text-white font-semibold text-lg">Гипотезы</h3>
          {localHypotheses.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-white/35 text-sm">Гипотезы не сгенерированы</p>
            </div>
          ) : (
            Object.entries(hypothesesByArchetype).map(([archetypeId, group]) => (
              <div key={archetypeId} className="space-y-3">
                {/* Заголовок группы */}
                <div className="flex items-center gap-2">
                  {group.archDef && (
                    <span className="text-lg">{group.archDef.icon}</span>
                  )}
                  <span className="text-white font-medium text-sm">
                    {group.archDef?.label || 'Без архетипа'}
                  </span>
                  <span className="text-white/25 text-xs">
                    ({group.items.length} {group.items.length === 1 ? 'гипотеза' : group.items.length < 5 ? 'гипотезы' : 'гипотез'})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map(({ h, index: i }) => {
                    const hasBanners = bannerGroups.some(g => g.hypothesisIndex === i);
                    return (
                      <div key={i} className="glass-card p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ background: ACCENT, color: '#0A0A0A' }}
                          >
                            {i + 1}
                          </div>
                          {h.archetypeLabel && (
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                            >
                              {h.archetypeLabel}
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
                        {!hasBanners && (
                          <button
                            onClick={() => handleGenerateBannersForHypothesis(i)}
                            disabled={anyBannerLoading}
                            className="w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                            style={{ background: ACCENT, color: '#0A0A0A' }}
                          >
                            🖼 Сгенерировать баннеры
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Кнопка "+ Гипотеза" внутри группы */}
                  {archetypeId !== '_none' && (
                    <button
                      onClick={() => handleAddHypothesis(archetypeId)}
                      disabled={generating}
                      className="glass-card p-4 flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-white/20"
                      style={{ border: '2px dashed rgba(255,255,255,0.15)', minHeight: 120 }}
                    >
                      {generating ? <AnimatedLogo size={20} inline /> : <span style={{ color: ACCENT }}>+</span>}
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Ещё гипотеза · 10 кр
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))
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

          {/* Выбор форматов */}
          <div className="glass-card p-4 space-y-3">
            <p className="text-white/40 text-xs uppercase tracking-widest">Форматы для генерации</p>
            <div className="flex flex-wrap gap-2">
              {BANNER_FORMATS.map(f => {
                const active = selectedFormats.has(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleFormat(f.key)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: active ? ACCENT_BG : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                      color: active ? ACCENT : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {f.label} <span className="opacity-50">{f.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

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

      {/* ═══════════ MODAL: ARCHETYPE PICKER ═══════════ */}
      {showArchetypePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowArchetypePicker(false)}
        >
          <div
            className="glass-card p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            style={{ border: `1px solid ${ACCENT_BORDER}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Выберите архетип</h3>
              <button
                onClick={() => setShowArchetypePicker(false)}
                className="text-white/40 hover:text-white/60 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ARCHETYPES.map(arch => {
                const alreadySelected = localArchetypes.some(a => a.id === arch.id);
                return (
                  <button
                    key={arch.id}
                    onClick={() => !alreadySelected && handlePickArchetype(arch.id)}
                    disabled={alreadySelected}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: alreadySelected ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${alreadySelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                      opacity: alreadySelected ? 0.4 : 1,
                      cursor: alreadySelected ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{arch.icon}</span>
                      <span className="text-white text-xs font-medium">{arch.label}</span>
                    </div>
                    <p className="text-white/35 text-[10px] leading-tight line-clamp-2">{arch.audience}</p>
                    {alreadySelected && (
                      <span className="text-[10px] mt-1 inline-block" style={{ color: ACCENT }}>✓ Выбран</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: FORMAT PICKER ═══════════ */}
      {showFormatPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowFormatPicker(false)}
        >
          <div
            className="glass-card p-6 max-w-lg w-full"
            style={{ border: `1px solid ${ACCENT_BORDER}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Выберите форматы</h3>
              <button onClick={() => setShowFormatPicker(false)} className="text-white/40 hover:text-white/60 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {BANNER_FORMATS.map(f => {
                const active = selectedFormats.has(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleFormat(f.key)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: active ? ACCENT_BG : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">{f.label}</span>
                      {active && <span style={{ color: ACCENT }}>✓</span>}
                    </div>
                    <span className="text-white/35 text-xs">{f.sublabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFormatPicker(false)}
                className="flex-1 btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={selectedFormats.size === 0}
                className="flex-1 btn-primary"
              >
                ⚡ Генерировать ({selectedFormats.size})
              </button>
            </div>
          </div>
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
