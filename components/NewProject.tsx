'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import type { AnalyzeResponse, NewHypothesis } from '@/app/api/analyze/route';
import { ARCHETYPES } from '@/lib/archetypes';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['Instagram', 'TikTok', 'VK', 'Telegram', 'YouTube'];


const BANNER_FORMATS = [
  { key: 'feed',    label: 'Feed',    sublabel: '1:1',  width: 1080, height: 1080 },
  { key: 'stories', label: 'Stories', sublabel: '9:16', width: 1080, height: 1920 },
  { key: 'banner',  label: 'Banner',  sublabel: '16:9', width: 1280, height: 720  },
];

const STEP_LABELS = ['Бриф', 'Архетип', 'Гипотезы', 'Баннеры'];

const LOADING_PHRASES = [
  'Анализируем психотип аудитории...',
  'Подбираем визуальную стратегию...',
  'Настраиваем композицию и цвет...',
  'Генерируем уникальный креатив...',
  'Прокачиваем CTR на +37%...',
  'Добавляем щепотку нейромагии...',
  'Уговариваем нейросеть постараться...',
  'Дизайнер бы делал это 4 часа...',
  'Проверяем, чтобы было огненно...',
  'Настраиваем эмоциональные крючки...',
  'Подключаем архетип к визуалу...',
  'Ещё чуть-чуть, почти шедевр...',
  'Полируем пиксели до блеска...',
  'Заряжаем баннер на конверсию...',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type VisualMode = 'ai' | 'upload' | 'link';

interface Brief {
  product:    string;
  price:      string;
  audience:   string;
  goal:       string;
  utp:        string;
  offer:      string;
  platforms:  string[];
  context:    string;
  visualMode: VisualMode;
  imageUrls:  string[];   // uploaded photo public URLs
  imageLink:  string;     // manual link URL
}

interface BannerItem {
  key:      string;
  label:    string;
  sublabel: string;
  width:    number;
  height:   number;
  taskId:   string | null;
  imageUrl: string | null;
  loading:  boolean;
  error:    string | null;
}

interface BannerGroup {
  hypothesisIndex: number;
  hypothesisTitle: string;
  banners: BannerItem[];
}

// ─── Small helpers ────────────────────────────────────────────────────────────

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
      {children}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewProject() {
  const { data: session } = useSession();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [brief, setBrief] = useState<Brief>({
    product: '', price: '', audience: '', goal: '', utp: '', offer: '', platforms: [], context: '',
    visualMode: 'ai', imageUrls: [], imageLink: '',
  });

  const [offerLoading, setOfferLoading]         = useState(false);
  const [offerSuggestions, setOfferSuggestions] = useState<string[]>([]);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDragOver,  setPhotoDragOver]  = useState(false);
  const [photoError,     setPhotoError]     = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  // analyzeResult используется только для отображения AI-рекомендации архетипа на шаге 2
  const [analyzeResult, setAnalyzeResult]         = useState<AnalyzeResponse | null>(null);
  const [analyzeLoading, setAnalyzeLoading]       = useState(false);
  const [analyzeError, setAnalyzeError]           = useState<string | null>(null);

  // Гипотезы генерируются отдельно на шаге 3
  const [hypotheses, setHypotheses]               = useState<NewHypothesis[]>([]);
  const [hypothesesLoading, setHypothesesLoading] = useState(false);
  const [hypothesesError, setHypothesesError]     = useState<string | null>(null);
  // Отслеживаем для какого архетипа уже сгенерированы гипотезы
  const lastHypothesesArchetype                   = useRef<string | null>(null);

  const [selectedHypotheses, setSelectedHypotheses] = useState<Set<number>>(new Set());
  const [bannerGroups, setBannerGroups]             = useState<BannerGroup[]>([]);
  const [activeBannerTab, setActiveBannerTab]       = useState(0);
  const [isSwitchingTab, setIsSwitchingTab]         = useState(false);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(0);

  // ── Project persistence ──
  const [projectId, setProjectIdState]             = useState<string | null>(null);
  const [resumeMeta, setResumeMeta]                = useState<{ id: string; title: string } | null>(null);
  const [resumeLoading, setResumeLoading]          = useState(false);
  const projectIdRef                               = useRef<string | null>(null);

  // ── Helpers ──

  const togglePlatform = (p: string) =>
    setBrief(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));

  const toggleHypothesis = (idx: number) =>
    setSelectedHypotheses(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const goTo = (n: 1 | 2 | 3 | 4) => setStep(n);

  // ── Photo upload ──

  const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const uploadPhotos = async (files: File[]) => {
    setPhotoError(null);
    const remaining = 3 - brief.imageUrls.length;
    if (remaining <= 0) return;

    const valid = files.filter(f => ALLOWED_PHOTO_TYPES.includes(f.type)).slice(0, remaining);
    if (valid.length === 0) {
      setPhotoError('Допустимые форматы: JPG, PNG, WEBP');
      return;
    }

    setPhotoUploading(true);
    try {
      const urls = await Promise.all(
        valid.map(async (file) => {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/upload-photo', { method: 'POST', body: fd });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Ошибка загрузки' }));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
          const data = await res.json();
          return data.url as string;
        }),
      );
      setBrief(p => ({ ...p, imageUrls: [...p.imageUrls, ...urls].slice(0, 3) }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = (idx: number) =>
    setBrief(p => ({ ...p, imageUrls: p.imageUrls.filter((_, i) => i !== idx) }));

  const switchTab = (gi: number) => {
    if (gi === activeBannerTab) return;
    setIsSwitchingTab(true);
    setTimeout(() => {
      setActiveBannerTab(gi);
      setIsSwitchingTab(false);
    }, 200);
  };

  // ── Project persistence helpers ──

  const LS_KEY = 'archetype_draft_project';

  const setProject = (id: string | null) => {
    projectIdRef.current = id;
    setProjectIdState(id);
  };

  /** Fire-and-forget PATCH for an existing project */
  const patchProject = (data: Record<string, unknown>) => {
    const pid = projectIdRef.current;
    if (!pid) return;
    fetch(`/api/projects/${pid}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    }).catch(() => {});
  };

  /** Resume: fetch project and restore component state */
  const handleResume = async () => {
    if (!resumeMeta) return;
    setResumeLoading(true);
    try {
      const res = await fetch(`/api/projects/${resumeMeta.id}`);
      if (!res.ok) {
        localStorage.removeItem(LS_KEY);
        setResumeMeta(null);
        return;
      }
      const project = await res.json();

      if (project.brief)      setBrief(prev => ({ ...prev, ...project.brief }));
      if (project.archetype?.id) setSelectedArchetype(project.archetype.id);

      if (Array.isArray(project.hypotheses) && project.hypotheses.length > 0) {
        setHypotheses(project.hypotheses);
        setSelectedHypotheses(
          new Set(Array.from({ length: Math.min(project.hypotheses.length, 5) }, (_, i) => i)),
        );
        lastHypothesesArchetype.current = project.archetype?.id ?? null;
      }

      if (Array.isArray(project.banners) && project.banners.length > 0) {
        const restored: BannerGroup[] = project.banners.map((g: {
          hypothesisIndex: number; hypothesisTitle: string;
          banners: (Omit<BannerItem, 'loading'> & { loading?: boolean })[];
        }) => ({
          hypothesisIndex: g.hypothesisIndex,
          hypothesisTitle: g.hypothesisTitle,
          banners: g.banners.map(b => ({ ...b, loading: false, error: b.error ?? null })),
        }));
        setBannerGroups(restored);
      }

      setProject(resumeMeta.id);

      // Navigate to the most advanced saved step
      if (project.banners?.length || project.status === 'completed') goTo(4);
      else if (project.hypotheses?.length || project.status === 'hypotheses')  goTo(4);
      else if (project.archetype?.id || project.status === 'archetype')        goTo(3);
      else                                                                       goTo(2);
    } catch {
      localStorage.removeItem(LS_KEY);
    } finally {
      setResumeLoading(false);
      setResumeMeta(null);
    }
  };

  const handleStartFresh = () => {
    localStorage.removeItem(LS_KEY);
    setResumeMeta(null);
    setProject(null);
  };

  // ── Step 1: offer generation ──

  const handleGenerateOffer = async () => {
    setOfferLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-offer',
          product: brief.product,
          audience: brief.audience,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setOfferSuggestions(data.offers ?? []);
    } catch {
      // silently fail — field stays editable
    } finally {
      setOfferLoading(false);
    }
  };

  // ── Step 2: только рекомендация архетипа, без гипотез ──

  const handleSuggestArchetype = async () => {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:    'suggest-archetype',
          product:   brief.product,
          price:     brief.price,
          audience:  brief.audience,
          goal:      brief.goal,
          utp:       brief.utp,
          platforms: brief.platforms,
          context:   brief.context,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: AnalyzeResponse = await res.json();
      setAnalyzeResult(data);
      // Автовыбираем рекомендованный архетип если ещё не выбран
      if (data.primaryArchetype && !selectedArchetype) {
        setSelectedArchetype(data.primaryArchetype);
      }
      // Гипотезы НЕ генерируются здесь
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Ошибка анализа');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  // ── Step 3: генерация гипотез строго под выбранный архетип ──

  const handleGenerateHypotheses = async (archetypeId: string) => {
    const archetypeDef = ARCHETYPES.find(a => a.id === archetypeId);
    setHypothesesLoading(true);
    setHypothesesError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-hypotheses',
          selectedArchetype: {
            id:    archetypeId,
            label: archetypeDef?.label ?? archetypeId,
          },
          product:   brief.product,
          price:     brief.price,
          audience:  brief.audience,
          goal:      brief.goal,
          utp:       brief.utp,
          offer:     brief.offer,
          platforms: brief.platforms,
          context:   brief.context,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка генерации' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const generated: NewHypothesis[] = data.newHypotheses ?? [];
      setHypotheses(generated);
      lastHypothesesArchetype.current = archetypeId;
      // Автовыбираем все сгенерированные гипотезы
      setSelectedHypotheses(new Set(Array.from({ length: Math.min(generated.length, 5) }, (_, i) => i)));
    } catch (err) {
      setHypothesesError(err instanceof Error ? err.message : 'Ошибка генерации гипотез');
    } finally {
      setHypothesesLoading(false);
    }
  };

  // Сбрасываем гипотезы когда меняется архетип
  useEffect(() => {
    if (lastHypothesesArchetype.current !== null && lastHypothesesArchetype.current !== selectedArchetype) {
      setHypotheses([]);
      setSelectedHypotheses(new Set());
      setHypothesesError(null);
      lastHypothesesArchetype.current = null;
    }
  }, [selectedArchetype]);

  // При входе на шаг 3 — генерируем гипотезы если ещё нет
  useEffect(() => {
    if (step === 3 && selectedArchetype && hypotheses.length === 0 && !hypothesesLoading) {
      handleGenerateHypotheses(selectedArchetype);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // На маунте — проверяем localStorage на незавершённый проект
  useEffect(() => {
    try {
      const raw = localStorage.getItem('archetype_draft_project');
      if (!raw) return;
      const meta = JSON.parse(raw) as { id: string; title: string };
      if (meta?.id) setResumeMeta(meta);
    } catch {}
  }, []);

  // После завершения генерации всех баннеров — сохраняем в БД
  useEffect(() => {
    const pid = projectIdRef.current;
    if (!pid || bannerGroups.length === 0) return;
    const allDone = bannerGroups.every(g => g.banners.every(b => !b.loading));
    if (!allDone) return;

    fetch(`/api/projects/${pid}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status:  'completed',
        banners: bannerGroups.map(g => ({
          hypothesisIndex: g.hypothesisIndex,
          hypothesisTitle: g.hypothesisTitle,
          banners: g.banners.map(b => ({
            key: b.key, label: b.label, sublabel: b.sublabel,
            imageUrl: b.imageUrl, error: b.error,
          })),
        })),
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerGroups]);

  // ── Step 4: banners ──

  const pollBanner = (groupIndex: number, fmtKey: string, taskId: string, attempt = 1) => {
    const MAX_POLL = 90;
    const INTERVAL = 5000;

    setTimeout(async () => {
      try {
        console.log(`[Banner polling] group=${groupIndex} key=${fmtKey} taskId=${taskId} attempt=${attempt}`);
        const res = await fetch(`/api/banner-status?taskId=${taskId}`);
        const data = await res.json();
        console.log(`[Banner polling] group=${groupIndex} key=${fmtKey} attempt=${attempt} response:`, data);

        if (!res.ok) {
          setBannerGroups(prev => prev.map((g, gi) =>
            gi !== groupIndex ? g : {
              ...g,
              banners: g.banners.map(b =>
                b.key === fmtKey ? { ...b, loading: false, error: data.error || `HTTP ${res.status}` } : b
              ),
            }
          ));
          return;
        }

        if (data.ready && data.imageUrl) {
          setBannerGroups(prev => prev.map((g, gi) =>
            gi !== groupIndex ? g : {
              ...g,
              banners: g.banners.map(b =>
                b.key === fmtKey ? { ...b, loading: false, imageUrl: data.imageUrl } : b
              ),
            }
          ));
          return;
        }

        if (attempt >= MAX_POLL) {
          setBannerGroups(prev => prev.map((g, gi) =>
            gi !== groupIndex ? g : {
              ...g,
              banners: g.banners.map(b =>
                b.key === fmtKey ? { ...b, loading: false, error: 'Timeout: изображение не готово' } : b
              ),
            }
          ));
          return;
        }

        pollBanner(groupIndex, fmtKey, taskId, attempt + 1);
      } catch (err) {
        setBannerGroups(prev => prev.map((g, gi) =>
          gi !== groupIndex ? g : {
            ...g,
            banners: g.banners.map(b =>
              b.key === fmtKey
                ? { ...b, loading: false, error: err instanceof Error ? err.message : 'Ошибка опроса' }
                : b
            ),
          }
        ));
      }
    }, INTERVAL);
  };

  const handleGenerateBanners = async () => {
    // Предварительная проверка кредитов до запуска генерации
    try {
      const creditsRes = await fetch('/api/check-credits');
      if (creditsRes.ok) {
        const { credits } = await creditsRes.json();
        if (credits <= 0) {
          setShowNoCreditsModal(true);
          return;
        }
      } else if (creditsRes.status === 401) {
        return; // не авторизован — ничего не делаем
      }
    } catch {
      // сетевая ошибка — продолжаем, сервер сам проверит
    }

    const archetype = (selectedArchetype || analyzeResult?.primaryArchetype || '').toLowerCase();
    const selectedList = Array.from(selectedHypotheses).sort((a, b) => a - b);

    const initialGroups: BannerGroup[] = selectedList.map(idx => ({
      hypothesisIndex: idx,
      hypothesisTitle: hypotheses[idx]?.idea || `Гипотеза ${idx + 1}`,
      banners: BANNER_FORMATS.map(f => ({ ...f, taskId: null, imageUrl: null, loading: true, error: null })),
    }));
    setBannerGroups(initialGroups);
    setActiveBannerTab(0);
    setIsSwitchingTab(false);

    const basePrompt = [
      brief.product,
      brief.utp      && `УТП: ${brief.utp}`,
      brief.audience && `Аудитория: ${brief.audience}`,
      brief.goal     && `Цель: ${brief.goal}`,
    ].filter(Boolean).join('. ');

    await Promise.allSettled(
      selectedList.map(async (hypothesisIdx, groupIndex) => {
        const hypothesis = hypotheses[hypothesisIdx];
        const prompt = hypothesis
          ? `${basePrompt}. Гипотеза: ${hypothesis.idea}. Визуал: ${hypothesis.visual}.`
          : basePrompt;

        await Promise.allSettled(
          BANNER_FORMATS.map(async (fmt, fmtIndex) => {
            // Первый баннер пакета: первый формат первой гипотезы
            const isFirstBanner = groupIndex === 0 && fmtIndex === 0;
            // Resolve product image URLs from the brief visual selection
            const briefImageUrls: string[] =
              brief.visualMode === 'upload' && brief.imageUrls.length > 0
                ? brief.imageUrls
                : brief.visualMode === 'link' && brief.imageLink.trim()
                ? [brief.imageLink.trim()]
                : [];
            try {
              const res = await fetch('/api/generate-banner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, width: fmt.width, height: fmt.height, style: 'bold', archetype, offer: brief.offer || undefined, isFirstBanner, imageUrls: briefImageUrls.length > 0 ? briefImageUrls : undefined }),
              });

              // Кредиты закончились
              if (res.status === 403) {
                setShowNoCreditsModal(true);
                setBannerGroups(prev => prev.map((g, gi) =>
                  gi !== groupIndex ? g : {
                    ...g,
                    banners: g.banners.map(b =>
                      b.key === fmt.key ? { ...b, loading: false, error: 'Недостаточно кредитов' } : b
                    ),
                  }
                ));
                return;
              }

              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Ошибка' }));
                throw new Error(err.error || `HTTP ${res.status}`);
              }

              const data = await res.json();
              const taskId = data.taskId;
              if (!taskId) throw new Error('No taskId returned');

              setBannerGroups(prev => prev.map((g, gi) =>
                gi !== groupIndex ? g : {
                  ...g,
                  banners: g.banners.map(b => b.key === fmt.key ? { ...b, taskId } : b),
                }
              ));
              pollBanner(groupIndex, fmt.key, taskId);
            } catch (err) {
              setBannerGroups(prev => prev.map((g, gi) =>
                gi !== groupIndex ? g : {
                  ...g,
                  banners: g.banners.map(b =>
                    b.key === fmt.key
                      ? { ...b, loading: false, error: err instanceof Error ? err.message : 'Ошибка запуска' }
                      : b
                  ),
                }
              ));
            }
          })
        );
      })
    );
  };

  const handleDownload = (banner: BannerItem) => {
    if (!banner.imageUrl) return;
    const a = document.createElement('a');
    a.href = banner.imageUrl;
    a.download = `banner-${banner.key}-${Date.now()}.png`;
    a.click();
  };

  const activeArchetype = selectedArchetype || analyzeResult?.primaryArchetype || null;
  const anyBannerLoading = bannerGroups.some(g => g.banners.some(b => b.loading));
  const activeBannerGroup = bannerGroups[activeBannerTab] ?? null;

  useEffect(() => {
    if (!anyBannerLoading) return;
    const interval = setInterval(() => {
      setLoadingPhrase(prev => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [anyBannerLoading]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Step progress ── */}
      <div className="flex items-center">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const isActive = step === n;
          const isDone   = step > n;
          return (
            <div key={n} className="flex items-center" style={{ flex: i < STEP_LABELS.length - 1 ? '1' : undefined }}>
              <button
                onClick={() => isDone && goTo(n)}
                className="flex items-center gap-2 shrink-0"
                style={{ cursor: isDone ? 'pointer' : 'default' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: isActive || isDone ? ACCENT : 'rgba(255,255,255,0.08)',
                    color:      isActive || isDone ? '#0A0A0A' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {isDone ? '✓' : n}
                </div>
                <span
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: isActive ? ACCENT : isDone ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                  }}
                >
                  {label}
                </span>
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="flex-1 h-px mx-3 transition-colors"
                  style={{ background: isDone ? ACCENT_BORDER : 'rgba(255,255,255,0.08)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ══════════════════ STEP 1: BRIEF ══════════════════ */}
      {step === 1 && (
        <div className="glass-card p-8">
          <h2 className="text-white font-semibold text-xl mb-7">Бриф проекта</h2>

          <div className="space-y-5">
            {/* Row: product + price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5">Продукт / бренд *</label>
                <input
                  type="text"
                  value={brief.product}
                  onChange={e => setBrief(p => ({ ...p, product: e.target.value }))}
                  placeholder="Что продаёте?"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5">Цена / ценовой сегмент</label>
                <input
                  type="text"
                  value={brief.price}
                  onChange={e => setBrief(p => ({ ...p, price: e.target.value }))}
                  placeholder="990 ₽ / от 5 000 ₽ / премиум"
                  className="input-field"
                />
              </div>
            </div>

            {/* Audience */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5">Аудитория *</label>
              <textarea
                rows={2}
                value={brief.audience}
                onChange={e => setBrief(p => ({ ...p, audience: e.target.value }))}
                placeholder="Кто ваш клиент? Возраст, интересы, боли, запросы..."
                className="input-field resize-none"
              />
            </div>

            {/* Row: goal + utp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5">Цель рекламы</label>
                <input
                  type="text"
                  value={brief.goal}
                  onChange={e => setBrief(p => ({ ...p, goal: e.target.value }))}
                  placeholder="Продажи, лиды, узнаваемость..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5">УТП</label>
                <input
                  type="text"
                  value={brief.utp}
                  onChange={e => setBrief(p => ({ ...p, utp: e.target.value }))}
                  placeholder="В чём уникальность предложения?"
                  className="input-field"
                />
              </div>
            </div>

            {/* Offer field */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5">Оффер / УТП</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={brief.offer}
                  onChange={e => setBrief(p => ({ ...p, offer: e.target.value }))}
                  placeholder="Например: доставка и установка бесплатно"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={handleGenerateOffer}
                  disabled={offerLoading || !brief.product.trim()}
                  className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
                  style={{
                    background: offerLoading || !brief.product.trim() ? 'rgba(255,255,255,0.05)' : ACCENT_BG,
                    border:     `1px solid ${offerLoading || !brief.product.trim() ? 'rgba(255,255,255,0.08)' : ACCENT_BORDER}`,
                    color:      offerLoading || !brief.product.trim() ? 'rgba(255,255,255,0.2)' : ACCENT,
                    cursor:     offerLoading || !brief.product.trim() ? 'not-allowed' : 'pointer',
                  }}
                  title={!brief.product.trim() ? 'Сначала заполните поле «Продукт»' : offerSuggestions.length > 0 ? 'Сгенерировать ещё' : 'Сгенерировать оффер'}
                >
                  {offerLoading
                    ? <Spinner />
                    : offerSuggestions.length > 0
                      ? '🔄'
                      : '✨'}
                  <span className="hidden sm:inline">
                    {offerLoading ? 'Генерируем...' : offerSuggestions.length > 0 ? 'Ещё' : 'Генерировать'}
                  </span>
                </button>
              </div>
              {offerSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {offerSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBrief(p => ({ ...p, offer: s }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                      style={{
                        background: brief.offer === s ? ACCENT_BG : 'rgba(255,255,255,0.05)',
                        border:     `1px solid ${brief.offer === s ? ACCENT_BORDER : 'rgba(255,255,255,0.1)'}`,
                        color:      brief.offer === s ? ACCENT : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Platforms chips */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2">Платформы</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const active = brief.platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        background: active ? ACCENT : 'rgba(255,255,255,0.06)',
                        color:      active ? '#0A0A0A' : 'rgba(255,255,255,0.55)',
                        border:     `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Context */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5">Контекст / дополнительно</label>
              <textarea
                rows={3}
                value={brief.context}
                onChange={e => setBrief(p => ({ ...p, context: e.target.value }))}
                placeholder="Сезонность, конкуренты, тон голоса, особые пожелания..."
                className="input-field resize-none"
              />
            </div>

            {/* Product visual */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-0.5">Главный визуал</label>
              <p className="text-white/30 text-xs mb-2">Фото товара, объекта, спикера или бренда — модель встроит его в баннер</p>

              {/* Mode selector */}
              <div className="flex flex-wrap gap-2 mb-3">
                {([
                  { id: 'ai',     icon: '🤖', label: 'Сгенерировать AI' },
                  { id: 'upload', icon: '📸', label: 'Загрузить фото' },
                  { id: 'link',   icon: '🔗', label: 'Вставить ссылку' },
                ] as { id: VisualMode; icon: string; label: string }[]).map(mode => {
                  const active = brief.visualMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setBrief(p => ({ ...p, visualMode: mode.id }))}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background:  active ? ACCENT_BG : 'rgba(255,255,255,0.05)',
                        border:      `1px solid ${active ? ACCENT : 'rgba(255,255,255,0.09)'}`,
                        color:       active ? ACCENT : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <span>{mode.icon}</span>
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Upload zone */}
              {brief.visualMode === 'upload' && (
                <div className="space-y-3">
                  {/* Hidden file input */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files) uploadPhotos(Array.from(e.target.files));
                      e.target.value = '';
                    }}
                  />

                  {/* Drag & drop zone (only when under limit) */}
                  {brief.imageUrls.length < 3 && (
                    <div
                      className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 px-4 transition-all cursor-pointer"
                      style={{
                        borderColor: photoDragOver ? ACCENT : 'rgba(255,255,255,0.12)',
                        background:  photoDragOver ? ACCENT_BG : 'rgba(255,255,255,0.02)',
                      }}
                      onDragOver={e => { e.preventDefault(); setPhotoDragOver(true); }}
                      onDragLeave={() => setPhotoDragOver(false)}
                      onDrop={e => {
                        e.preventDefault();
                        setPhotoDragOver(false);
                        uploadPhotos(Array.from(e.dataTransfer.files));
                      }}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      {photoUploading ? (
                        <div className="flex items-center gap-2" style={{ color: ACCENT }}>
                          <Spinner />
                          <span className="text-sm">Загружаем...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl opacity-50">📁</div>
                          <p className="text-white/50 text-sm text-center">
                            Перетащите фото сюда или{' '}
                            <span style={{ color: ACCENT }}>выберите файл</span>
                          </p>
                          <p className="text-white/25 text-xs">
                            JPG, PNG, WEBP · до 10 МБ · максимум {3 - brief.imageUrls.length} фото
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {photoError && (
                    <p className="text-red-400 text-xs">{photoError}</p>
                  )}

                  {/* Photo previews */}
                  {brief.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {brief.imageUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Фото ${i + 1}`}
                            className="w-24 h-24 object-cover rounded-xl"
                            style={{ border: `1px solid rgba(255,255,255,0.1)` }}
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-opacity"
                            style={{ background: '#ff4444', color: '#fff' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Link input */}
              {brief.visualMode === 'link' && (
                <input
                  type="url"
                  value={brief.imageLink}
                  onChange={e => setBrief(p => ({ ...p, imageLink: e.target.value }))}
                  placeholder="https://... (фото товара, спикера или объекта)"
                  className="input-field"
                />
              )}
            </div>

            <div className="flex justify-end items-center gap-3 pt-1">
              {/* DEBUG: временная кнопка — удалить после отладки */}
              <button
                disabled={!brief.product.trim() || !brief.audience.trim()}
                onClick={async () => {
                  goTo(2);
                  const title = brief.product.trim() || 'Без названия';
                  if (projectIdRef.current) {
                    patchProject({ brief: brief as unknown as Record<string, unknown>, title, status: 'brief' });
                  } else {
                    try {
                      const res = await fetch('/api/projects', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, brief: brief as unknown as Record<string, unknown>, status: 'brief' }),
                      });
                      const json = await res.json();
                      if (res.ok) {
                        setProject(json.id);
                        localStorage.setItem(LS_KEY, JSON.stringify({ id: json.id, title }));
                      }
                    } catch {
                      // silent
                    }
                  }
                }}
                className="btn-primary px-8"
              >
                Далее →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 2: ARCHETYPE ══════════════════ */}
      {step === 2 && (
        <div className="space-y-5">

          {/* AI analyze panel */}
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg">Подбор архетипа</h2>
                <p className="text-white/35 text-sm mt-0.5">AI проанализирует бриф и порекомендует подходящий архетип</p>
              </div>
              <button
                onClick={handleSuggestArchetype}
                disabled={analyzeLoading}
                className="btn-primary flex items-center gap-2 shrink-0"
              >
                {analyzeLoading ? <><Spinner />Анализируем...</> : '✦ Получить рекомендацию'}
              </button>
            </div>

            {analyzeError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {analyzeError}
              </div>
            )}

            {analyzeResult && (
              <div
                className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4"
                style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ color: ACCENT }}>✦</span>
                    <span className="text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>AI рекомендует</span>
                    <span className="font-bold text-sm" style={{ color: ACCENT }}>{analyzeResult.primaryArchetype}</span>
                  </div>
                  <p className="text-white/55 text-sm leading-relaxed">{analyzeResult.positioning}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {analyzeResult.archetypes.slice(0, 3).map(a => (
                    <div key={a.name} className="text-center">
                      <div className="text-xs font-semibold" style={{ color: ACCENT }}>{a.matchScore}%</div>
                      <div className="text-[10px] text-white/40">{a.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 26 archetypes grid */}
          <div className="glass-card p-6">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Выберите архетип вручную</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {ARCHETYPES.map(a => {
                const isSelected = selectedArchetype === a.id;
                const isAiPick   = analyzeResult?.primaryArchetype === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedArchetype(a.id)}
                    className="relative p-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? ACCENT_BG : 'rgba(255,255,255,0.04)',
                      border:     `1px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    {isAiPick && (
                      <span
                        className="absolute -top-1.5 -right-1.5 text-[8px] font-bold px-1 py-0.5 rounded-full leading-none"
                        style={{ background: ACCENT, color: '#0A0A0A' }}
                      >
                        AI
                      </span>
                    )}
                    <div className="text-base mb-1">{a.icon}</div>
                    <div
                      className="text-[11px] font-semibold leading-tight"
                      style={{ color: isSelected ? ACCENT : 'rgba(255,255,255,0.8)' }}
                    >
                      {a.label}
                    </div>
                    <div className="text-[9px] mt-0.5 leading-tight" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      {a.categories}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => goTo(1)} className="btn-secondary">← Назад</button>
            <button
              onClick={() => {
                patchProject({ archetype: { id: selectedArchetype }, status: 'archetype' });
                goTo(3);
              }}
              disabled={!selectedArchetype}
              className="btn-primary"
            >
              Далее →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 3: HYPOTHESES ══════════════════ */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-white font-semibold text-xl">Маркетинговые гипотезы</h2>
              {activeArchetype && (
                <p className="text-white/35 text-sm mt-1">
                  Архетип:&nbsp;
                  <span className="font-semibold" style={{ color: ACCENT }}>{activeArchetype}</span>
                </p>
              )}
            </div>
            {hypotheses.length > 0 && !hypothesesLoading && (
              <p className="text-white/30 text-xs shrink-0">
                Выбрано: {selectedHypotheses.size} из {Math.min(hypotheses.length, 5)}
              </p>
            )}
          </div>

          {hypothesesLoading ? (
            <div className="glass-card p-12 text-center">
              <div
                className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-4"
                style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
              />
              <p className="text-white/60 text-sm mb-1">
                Генерируем гипотезы под архетип&nbsp;
                <span style={{ color: ACCENT }}>
                  {ARCHETYPES.find(a => a.id === activeArchetype)?.label ?? activeArchetype}
                </span>
              </p>
              <p className="text-white/25 text-xs">Обычно занимает 10–20 секунд</p>
            </div>
          ) : hypothesesError ? (
            <div className="glass-card p-10 text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <p className="text-red-400 text-sm mb-4">{hypothesesError}</p>
              <button
                onClick={() => selectedArchetype && handleGenerateHypotheses(selectedArchetype)}
                className="btn-primary text-sm px-6"
              >
                Попробовать снова
              </button>
            </div>
          ) : hypotheses.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <div className="text-3xl mb-3">🔮</div>
              <p className="text-white/40 text-sm">Загружаем гипотезы...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {hypotheses.slice(0, 5).map((h, i) => {
                const isSelected = selectedHypotheses.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleHypothesis(i)}
                    className="glass-card p-5 flex flex-col gap-4 text-left transition-all"
                    style={{
                      border: `1px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.08)'}`,
                      background: isSelected ? ACCENT_BG : undefined,
                    }}
                  >
                    {/* Header row: number badge + checkbox */}
                    <div className="flex items-center justify-between">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: isSelected ? ACCENT : 'rgba(255,255,255,0.12)', color: isSelected ? '#0A0A0A' : 'rgba(255,255,255,0.5)' }}
                      >
                        {i + 1}
                      </div>
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all shrink-0"
                        style={
                          isSelected
                            ? { background: ACCENT, borderColor: ACCENT }
                            : { background: 'transparent', borderColor: 'rgba(255,255,255,0.25)' }
                        }
                      >
                        {isSelected && (
                          <span style={{ color: '#0A0A0A', fontSize: 10, fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <SectionLabel>Идея</SectionLabel>
                      <p className="text-white text-sm font-medium leading-snug">{h.idea}</p>
                    </div>

                    <div>
                      <SectionLabel>Визуал</SectionLabel>
                      <p className="text-white/60 text-sm leading-snug">{h.visual}</p>
                    </div>

                    <div>
                      <SectionLabel>Заголовок</SectionLabel>
                      <p className="text-white text-sm font-semibold leading-snug">{h.headline}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <div>
                        <SectionLabel>CTA</SectionLabel>
                        <p className="text-sm font-bold" style={{ color: ACCENT }}>{h.cta}</p>
                      </div>
                      <div>
                        <SectionLabel>Хук</SectionLabel>
                        <p className="text-white/55 text-[12px] italic leading-snug">{h.hook}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => goTo(2)} className="btn-secondary">← Назад</button>
            <button
              onClick={() => {
                patchProject({
                  hypotheses: hypotheses,
                  archetype:  { id: selectedArchetype },
                  status:     'hypotheses',
                });
                goTo(4);
              }}
              disabled={selectedHypotheses.size === 0 || hypothesesLoading}
              className="btn-primary"
            >
              Далее →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 4: BANNERS ══════════════════ */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold text-xl">Баннеры</h2>
              <p className="text-white/35 text-sm mt-1">
                {selectedHypotheses.size} {selectedHypotheses.size === 1 ? 'гипотеза' : 'гипотезы'} · Feed · Stories · Banner
              </p>
            </div>
            <button
              onClick={handleGenerateBanners}
              disabled={anyBannerLoading}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              {anyBannerLoading
                ? <><Spinner />Генерируем...</>
                : '⚡ Сгенерировать баннеры'}
            </button>
          </div>

          {/* Tabs */}
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
                      border:     `1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                      color:      isActive ? ACCENT : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {groupLoading && <Spinner />}
                    <span className="max-w-[140px] truncate">
                      Г{group.hypothesisIndex + 1}: {group.hypothesisTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active group hypothesis title */}
          {activeBannerGroup && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
            >
              <span className="text-white/40 text-xs uppercase tracking-wide mr-2">Гипотеза {activeBannerGroup.hypothesisIndex + 1}</span>
              <span className="text-white/80">{activeBannerGroup.hypothesisTitle}</span>
            </div>
          )}

          {/* Banner cards */}
          {isSwitchingTab ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {BANNER_FORMATS.map(fmt => (
                <div key={fmt.key} className="glass-card p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">{fmt.label}</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: ACCENT_BG, color: ACCENT }}
                    >
                      {fmt.sublabel}
                    </span>
                  </div>
                  <div
                    className="skeleton-shimmer rounded-xl"
                    style={{ aspectRatio: `${fmt.width} / ${fmt.height}`, minHeight: 100 }}
                  />
                  <div className="h-9 skeleton-shimmer rounded-xl" />
                </div>
              ))}
            </div>
          ) : activeBannerGroup ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 banner-fade-in">
              {activeBannerGroup.banners.map(banner => (
                <div key={banner.key} className="glass-card p-4 flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">{banner.label}</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: ACCENT_BG, color: ACCENT }}
                    >
                      {banner.sublabel}
                    </span>
                  </div>

                  {/* Image area */}
                  <div
                    className="rounded-xl overflow-hidden flex items-center justify-center"
                    style={{
                      background:  'rgba(255,255,255,0.03)',
                      border:      '1px solid rgba(255,255,255,0.07)',
                      aspectRatio: `${banner.width} / ${banner.height}`,
                      minHeight:   100,
                    }}
                  >
                    {banner.loading && (
                      <div className="flex flex-col items-center gap-2 p-4">
                        <div
                          className="w-8 h-8 rounded-full border-2 animate-spin"
                          style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
                        />
                        <span
                          className="text-white/40 text-xs text-center transition-opacity duration-500"
                          key={loadingPhrase}
                        >
                          {LOADING_PHRASES[loadingPhrase]}
                        </span>
                      </div>
                    )}
                    {!banner.loading && !banner.imageUrl && !banner.error && (
                      <div className="text-center p-4">
                        <div className="text-2xl mb-2 opacity-30">🖼</div>
                        <p className="text-white/20 text-xs">Ожидание...</p>
                      </div>
                    )}
                    {banner.error && (
                      <p className="text-red-400 text-xs text-center p-3 leading-relaxed">{banner.error}</p>
                    )}
                    {banner.imageUrl && (
                      <Image
                        src={banner.imageUrl}
                        alt={`${banner.label} banner`}
                        width={banner.width}
                        height={banner.height}
                        className="w-full h-auto object-contain"
                        unoptimized
                      />
                    )}
                  </div>

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
              <div className="text-3xl mb-3">⚡</div>
              <p className="text-white/40 text-sm">Нажмите «Сгенерировать баннеры» чтобы начать</p>
            </div>
          )}

          <div className="flex justify-start">
            <button onClick={() => goTo(3)} className="btn-secondary">← Назад</button>
          </div>
        </div>
      )}
      {/* ══════════════════ MODAL: RESUME PROJECT ══════════════════ */}
      {resumeMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="glass-card p-8 max-w-sm w-full text-center"
            style={{ border: `1px solid ${ACCENT_BORDER}` }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(200,255,0,0.08)', border: `1px solid ${ACCENT_BORDER}` }}
            >
              <span style={{ fontSize: '1.5rem' }}>📂</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Незавершённый проект</h3>
            <p className="text-sm font-medium mb-1" style={{ color: ACCENT }}>
              {resumeMeta.title}
            </p>
            <p className="text-white/35 text-xs mb-6">Продолжить с места, где остановились?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResume}
                disabled={resumeLoading}
                className="btn-primary text-sm flex items-center justify-center gap-2"
              >
                {resumeLoading ? <><Spinner />Загружаем...</> : 'Продолжить'}
              </button>
              <button
                onClick={handleStartFresh}
                disabled={resumeLoading}
                className="btn-secondary text-sm"
              >
                Начать заново
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL: NO CREDITS ══════════════════ */}
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
              style={{ background: 'rgba(200,255,0,0.1)', border: `1px solid ${ACCENT_BORDER}` }}
            >
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Кредиты закончились</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              У вас не осталось кредитов для генерации баннеров.<br />
              Напишите нам — мы пополним баланс.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="https://t.me/archetype_protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm text-center no-underline"
                style={{ display: 'block' }}
              >
                Написать в Telegram
              </a>
              <button
                onClick={() => setShowNoCreditsModal(false)}
                className="btn-secondary text-sm"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
