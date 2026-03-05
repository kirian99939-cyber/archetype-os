'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BANNER_FORMATS } from '@/lib/project-types';
import type { BannerItem, BannerGroup, Brief } from '@/lib/project-types';
import type { NewHypothesis } from '@/app/api/analyze/route';
import { ARCHETYPES } from '@/lib/archetypes';

export const MAX_REFRESHES_PER_BANNER = 3;

interface UseBannerGenerationParams {
  brief: Brief;
  hypotheses: NewHypothesis[];
  selectedHypotheses: Set<number>;
  selectedFormats: Set<string>;
  selectedArchetypes: { id: string; rank: number }[];
  analyzeResult: { primaryArchetype?: string } | null;
  projectIdRef: React.MutableRefObject<string | null>;
  onBusyChange?: (busy: boolean) => void;
  initialBannerGroups?: BannerGroup[];
}

export interface UseBannerGenerationReturn {
  bannerGroups: BannerGroup[];
  setBannerGroups: React.Dispatch<React.SetStateAction<BannerGroup[]>>;
  activeBannerTab: number;
  setActiveBannerTab: React.Dispatch<React.SetStateAction<number>>;
  isSwitchingTab: boolean;
  anyBannerLoading: boolean;
  showNoCreditsModal: boolean;
  setShowNoCreditsModal: React.Dispatch<React.SetStateAction<boolean>>;
  bannerHistory: any[];
  setBannerHistory: React.Dispatch<React.SetStateAction<any[]>>;
  showingHistory: boolean;
  setShowingHistory: React.Dispatch<React.SetStateAction<boolean>>;
  historyTab: number;
  setHistoryTab: React.Dispatch<React.SetStateAction<number>>;
  activeBannerGroup: BannerGroup | null;
  bannersSavedRef: React.MutableRefObject<boolean>;
  handleGenerateBanners: () => Promise<void>;
  generateForSingleHypothesis: (hypothesisIdx: number, hypothesis: NewHypothesis) => Promise<void>;
  handleRefreshBanner: (groupIndex: number, fmtKey: string) => Promise<void>;
  handleDownload: (banner: BannerItem) => void;
  switchTab: (gi: number) => void;
  waitForBanner: (groupIndex: number, fmtKey: string, taskId: string) => Promise<void>;
}

export function useBannerGeneration({
  brief,
  hypotheses,
  selectedHypotheses,
  selectedFormats,
  selectedArchetypes,
  analyzeResult,
  projectIdRef,
  onBusyChange,
  initialBannerGroups,
}: UseBannerGenerationParams): UseBannerGenerationReturn {
  const [bannerGroups, setBannerGroups]       = useState<BannerGroup[]>(initialBannerGroups ?? []);
  const [activeBannerTab, setActiveBannerTab] = useState(0);
  const [isSwitchingTab, setIsSwitchingTab]   = useState(false);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [bannerHistory, setBannerHistory]     = useState<any[]>([]);
  const [showingHistory, setShowingHistory]   = useState(false);
  const [historyTab, setHistoryTab]           = useState(0);

  const pollTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const bannersSavedRef = useRef(false);

  const anyBannerLoading = bannerGroups.some(g => g.banners.some(b => b.loading));
  const activeBannerGroup = bannerGroups[activeBannerTab] ?? null;

  // ── После завершения генерации всех баннеров — сохраняем в БД (один раз) ──
  useEffect(() => {
    const pid = projectIdRef.current;
    if (!pid || bannerGroups.length === 0) return;
    const allDone = bannerGroups.every(g => g.banners.every(b => !b.loading));
    if (!allDone) return;
    if (bannersSavedRef.current) return;
    bannersSavedRef.current = true;

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
            imageUrl: b.imageUrl ?? null,
            taskId: b.taskId ?? null,
            error: b.loading ? null : (b.error ?? null),
            loading: b.loading,
          })),
        })),
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerGroups]);

  // ── onBusyChange + beforeunload ──
  useEffect(() => {
    onBusyChange?.(anyBannerLoading);
  }, [anyBannerLoading, onBusyChange]);

  useEffect(() => {
    if (!anyBannerLoading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyBannerLoading]);

  // ── Tab switching ──
  const switchTab = useCallback((gi: number) => {
    if (gi === activeBannerTab) return;
    setIsSwitchingTab(true);
    setTimeout(() => {
      setActiveBannerTab(gi);
      setIsSwitchingTab(false);
    }, 200);
  }, [activeBannerTab]);

  // ── Polling ──
  const waitForBanner = useCallback((groupIndex: number, fmtKey: string, taskId: string): Promise<void> => {
    return new Promise((resolve) => {
      const MAX_POLL = 40;
      const INTERVAL = 5000;
      let attempt = 0;

      const poll = async () => {
        attempt++;
        try {
          const res = await fetch(`/api/banner-status?taskId=${taskId}`);
          const data = await res.json();

          if (!res.ok) {
            setBannerGroups(prev =>
              prev.map((g, gi) =>
                gi !== groupIndex ? g : {
                  ...g,
                  banners: g.banners.map(b =>
                    b.key === fmtKey ? { ...b, loading: false, error: data.error || `HTTP ${res.status}` } : b
                  ),
                }
              )
            );
            resolve();
            return;
          }

          if (data.ready && data.imageUrl) {
            setBannerGroups(prev =>
              prev.map((g, gi) =>
                gi !== groupIndex ? g : {
                  ...g,
                  banners: g.banners.map(b =>
                    b.key === fmtKey ? { ...b, loading: false, imageUrl: data.imageUrl } : b
                  ),
                }
              )
            );
            resolve();
            return;
          }

          if (attempt >= MAX_POLL) {
            setBannerGroups(prev =>
              prev.map((g, gi) =>
                gi !== groupIndex ? g : {
                  ...g,
                  banners: g.banners.map(b =>
                    b.key === fmtKey ? { ...b, loading: false, error: 'Timeout: изображение не готово' } : b
                  ),
                }
              )
            );
            resolve();
            return;
          }

          const timeoutId = setTimeout(poll, INTERVAL);
          pollTimeoutsRef.current.add(timeoutId);
        } catch {
          setBannerGroups(prev =>
            prev.map((g, gi) =>
              gi !== groupIndex ? g : {
                ...g,
                banners: g.banners.map(b =>
                  b.key === fmtKey ? { ...b, loading: false, error: 'Ошибка сети. Кредиты списаны — баннер может появиться позже.' } : b
                ),
              }
            )
          );
          resolve();
        }
      };

      const timeoutId = setTimeout(poll, INTERVAL);
      pollTimeoutsRef.current.add(timeoutId);
    });
  }, []);

  // ── Generate banners ──
  const handleGenerateBanners = useCallback(async () => {
    const selectedList = Array.from(selectedHypotheses).sort((a, b) => a - b);
    const activeFormatsCount = BANNER_FORMATS.filter(f => selectedFormats.has(f.key)).length;
    const totalBanners = selectedList.length * activeFormatsCount;
    const requiredCredits = totalBanners * 10;

    try {
      const creditsRes = await fetch('/api/check-credits');
      if (creditsRes.ok) {
        const { credits } = await creditsRes.json();
        if (credits < requiredCredits) {
          setShowNoCreditsModal(true);
          return;
        }
      } else if (creditsRes.status === 401) {
        return;
      }
    } catch {}

    const initialGroups: BannerGroup[] = selectedList.map(idx => ({
      hypothesisIndex: idx,
      hypothesisTitle: hypotheses[idx]?.idea || `Гипотеза ${idx + 1}`,
      banners: BANNER_FORMATS.filter(f => selectedFormats.has(f.key)).map(f => ({
        ...f, taskId: null, imageUrl: null, loading: true, error: null, refreshCount: 0, previousVersions: [],
      })),
    }));
    // Сохраняем текущие баннеры в историю перед перезаписью
    setBannerHistory(prev => {
      if (bannerGroups.length === 0) return prev;
      const archId = selectedArchetypes[0]?.id ?? '';
      const archDef = ARCHETYPES?.find((a: any) => a.id === archId);
      const iteration = {
        iterationId: Date.now().toString(),
        createdAt: new Date().toISOString(),
        archetypeId: archId,
        archetypeLabel: archDef?.label ?? archId,
        bannerGroups: bannerGroups.map(g => ({
          hypothesisIndex: g.hypothesisIndex,
          hypothesisTitle: g.hypothesisTitle,
          banners: g.banners.map(b => ({
            key: b.key, label: b.label, sublabel: b.sublabel,
            imageUrl: b.imageUrl, error: b.error,
          })),
        })),
      };
      return [iteration, ...prev];
    });
    bannersSavedRef.current = false;
    setBannerGroups(initialGroups);
    setActiveBannerTab(0);
    setIsSwitchingTab(false);

    const basePrompt = [
      brief.product,
      brief.utp      && `УТП: ${brief.utp}`,
      brief.audience && `Аудитория: ${brief.audience}`,
      brief.goal     && `Цель: ${brief.goal}`,
    ].filter(Boolean).join('. ');

    const activeFormats = BANNER_FORMATS.filter(f => selectedFormats.has(f.key));

    for (let groupIndex = 0; groupIndex < selectedList.length; groupIndex++) {
      const hypothesisIdx = selectedList[groupIndex];
      const hypothesis = hypotheses[hypothesisIdx];
      const archetype = (hypothesis?.archetypeId || selectedArchetypes[0]?.id || analyzeResult?.primaryArchetype || '').toLowerCase();
      const prompt = hypothesis
        ? `${basePrompt}. Гипотеза: ${hypothesis.idea}. Визуал: ${hypothesis.visual}.`
        : basePrompt;

      for (let fmtIndex = 0; fmtIndex < activeFormats.length; fmtIndex++) {
        const fmt = activeFormats[fmtIndex];

        const briefImageUrls: string[] =
          brief.visualMode === 'upload' && brief.imageUrls.length > 0
            ? brief.imageUrls
            : brief.visualMode === 'link' && brief.imageLink.trim()
            ? [brief.imageLink.trim()]
            : [];

        const shouldUsePhoto = hypothesis?.usePhoto !== false;
        const imageUrlsToSend = shouldUsePhoto && briefImageUrls.length > 0 ? briefImageUrls : undefined;

        try {
          const res = await fetch('/api/generate-banner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              width: fmt.width,
              height: fmt.height,
              style: 'bold',
              archetype,
              offer: brief.offer || undefined,
              toneOfVoice: brief.toneOfVoice || undefined,
              imageUrls: imageUrlsToSend,
            }),
          });

          if (res.status === 402 || res.status === 403) {
            setShowNoCreditsModal(true);
            setBannerGroups(prev =>
              prev.map((g, gi) =>
                gi !== groupIndex ? g : {
                  ...g,
                  banners: g.banners.map(b =>
                    b.key === fmt.key ? { ...b, loading: false, error: 'Недостаточно кредитов' } : b
                  ),
                }
              )
            );
            return;
          }

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Ошибка' }));
            throw new Error(err.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          const taskId = data.taskId;
          if (!taskId) throw new Error('No taskId in NanoBanana API response');

          setBannerGroups(prev =>
            prev.map((g, gi) =>
              gi !== groupIndex ? g : {
                ...g,
                banners: g.banners.map(b =>
                  b.key === fmt.key ? { ...b, taskId } : b
                ),
              }
            )
          );

          await waitForBanner(groupIndex, fmt.key, taskId);

          if (fmtIndex < activeFormats.length - 1 || groupIndex < selectedList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Генерация не удалась. Кредиты не списаны — попробуйте ещё раз.';
          setBannerGroups(prev =>
            prev.map((g, gi) =>
              gi !== groupIndex ? g : {
                ...g,
                banners: g.banners.map(b =>
                  b.key === fmt.key ? { ...b, loading: false, error: errMsg } : b
                ),
              }
            )
          );
        }
      }
    }
  }, [brief, hypotheses, selectedHypotheses, selectedFormats, selectedArchetypes, analyzeResult, waitForBanner]);

  // ── Generate banners for a single hypothesis (branching) ──
  const generateForSingleHypothesis = useCallback(async (
    hypothesisIdx: number,
    hypothesis: NewHypothesis,
  ) => {
    const activeFormats = BANNER_FORMATS.filter(f => selectedFormats.has(f.key));
    const requiredCredits = activeFormats.length * 10;

    try {
      const creditsRes = await fetch('/api/check-credits');
      if (creditsRes.ok) {
        const { credits } = await creditsRes.json();
        if (credits < requiredCredits) { setShowNoCreditsModal(true); return; }
      } else if (creditsRes.status === 401) { return; }
    } catch {}

    const newGroup: BannerGroup = {
      hypothesisIndex: hypothesisIdx,
      hypothesisTitle: hypothesis.idea,
      banners: activeFormats.map(f => ({
        ...f, taskId: null, imageUrl: null, loading: true, error: null,
        refreshCount: 0, previousVersions: [],
      })),
    };

    bannersSavedRef.current = false;
    const newGroupIndex = bannerGroups.length;
    setBannerGroups(prev => [...prev, newGroup]);
    setActiveBannerTab(newGroupIndex);

    const archetype = (hypothesis.archetypeId || selectedArchetypes[0]?.id || analyzeResult?.primaryArchetype || '').toLowerCase();
    const basePrompt = [
      brief.product,
      brief.utp      && `УТП: ${brief.utp}`,
      brief.audience && `Аудитория: ${brief.audience}`,
      brief.goal     && `Цель: ${brief.goal}`,
    ].filter(Boolean).join('. ');
    const prompt = `${basePrompt}. Гипотеза: ${hypothesis.idea}. Визуал: ${hypothesis.visual}.`;

    const briefImageUrls: string[] =
      brief.visualMode === 'upload' && brief.imageUrls.length > 0
        ? brief.imageUrls
        : brief.visualMode === 'link' && brief.imageLink.trim()
        ? [brief.imageLink.trim()]
        : [];
    const shouldUsePhoto = hypothesis.usePhoto !== false;
    const imageUrlsToSend = shouldUsePhoto && briefImageUrls.length > 0 ? briefImageUrls : undefined;

    for (let fmtIndex = 0; fmtIndex < activeFormats.length; fmtIndex++) {
      const fmt = activeFormats[fmtIndex];
      try {
        const res = await fetch('/api/generate-banner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            width: fmt.width,
            height: fmt.height,
            style: 'bold',
            archetype,
            offer: brief.offer || undefined,
            toneOfVoice: brief.toneOfVoice || undefined,
            imageUrls: imageUrlsToSend,
          }),
        });

        if (res.status === 402 || res.status === 403) {
          setShowNoCreditsModal(true);
          setBannerGroups(prev =>
            prev.map((g, gi) =>
              gi !== newGroupIndex ? g : {
                ...g,
                banners: g.banners.map(b =>
                  b.key === fmt.key ? { ...b, loading: false, error: 'Недостаточно кредитов' } : b
                ),
              }
            )
          );
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Ошибка' }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const taskId = data.taskId;
        if (!taskId) throw new Error('No taskId in NanoBanana API response');

        setBannerGroups(prev =>
          prev.map((g, gi) =>
            gi !== newGroupIndex ? g : {
              ...g,
              banners: g.banners.map(b =>
                b.key === fmt.key ? { ...b, taskId } : b
              ),
            }
          )
        );

        await waitForBanner(newGroupIndex, fmt.key, taskId);

        if (fmtIndex < activeFormats.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Генерация не удалась. Кредиты не списаны — попробуйте ещё раз.';
        setBannerGroups(prev =>
          prev.map((g, gi) =>
            gi !== newGroupIndex ? g : {
              ...g,
              banners: g.banners.map(b =>
                b.key === fmt.key ? { ...b, loading: false, error: errMsg } : b
              ),
            }
          )
        );
      }
    }
  }, [bannerGroups, brief, selectedFormats, selectedArchetypes, analyzeResult, waitForBanner]);

  // ── Download ──
  const handleDownload = useCallback((banner: BannerItem) => {
    if (!banner.imageUrl) return;
    const a = document.createElement('a');
    a.href = `/api/download-image?url=${encodeURIComponent(banner.imageUrl)}`;
    a.download = `banner-${banner.key}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // ── Refresh banner ──
  const handleRefreshBanner = useCallback(async (groupIndex: number, fmtKey: string) => {
    const group = bannerGroups[groupIndex];
    if (!group) return;
    const banner = group.banners.find(b => b.key === fmtKey);
    if (!banner || banner.loading || banner.refreshCount >= MAX_REFRESHES_PER_BANNER) return;
    bannersSavedRef.current = false;

    try {
      const creditsRes = await fetch('/api/check-credits');
      if (creditsRes.ok) {
        const { credits } = await creditsRes.json();
        if (credits < 10) {
          setShowNoCreditsModal(true);
          return;
        }
      }
    } catch {}

    const hypothesis = hypotheses[group.hypothesisIndex];
    const archetype = (hypothesis?.archetypeId || selectedArchetypes[0]?.id || analyzeResult?.primaryArchetype || '').toLowerCase();
    const basePrompt = [
      brief.product,
      brief.utp      && `УТП: ${brief.utp}`,
      brief.audience && `Аудитория: ${brief.audience}`,
      brief.goal     && `Цель: ${brief.goal}`,
    ].filter(Boolean).join('. ');
    const prompt = hypothesis
      ? `${basePrompt}. Гипотеза: ${hypothesis.idea}. Визуал: ${hypothesis.visual}.`
      : basePrompt;

    const briefImageUrls: string[] =
      brief.visualMode === 'upload' && brief.imageUrls.length > 0
        ? brief.imageUrls
        : brief.visualMode === 'link' && brief.imageLink.trim()
        ? [brief.imageLink.trim()]
        : [];

    const shouldUsePhoto = hypothesis?.usePhoto !== false;
    const imageUrlsToSend = shouldUsePhoto && briefImageUrls.length > 0 ? briefImageUrls : undefined;

    setBannerGroups(prev =>
      prev.map((g, gi) =>
        gi !== groupIndex ? g : {
          ...g,
          banners: g.banners.map(b =>
            b.key === fmtKey ? {
              ...b,
              loading: true,
              error: null,
              taskId: null,
              previousVersions: b.imageUrl ? [...b.previousVersions, b.imageUrl] : b.previousVersions,
              refreshCount: b.refreshCount + 1,
            } : b
          ),
        }
      )
    );

    try {
      const res = await fetch('/api/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          width: banner.width,
          height: banner.height,
          style: 'bold',
          archetype,
          offer: brief.offer || undefined,
          toneOfVoice: brief.toneOfVoice || undefined,
          imageUrls: imageUrlsToSend,
        }),
      });

      if (res.status === 402 || res.status === 403) {
        setShowNoCreditsModal(true);
        setBannerGroups(prev =>
          prev.map((g, gi) =>
            gi !== groupIndex ? g : {
              ...g,
              banners: g.banners.map(b =>
                b.key === fmtKey ? { ...b, loading: false, error: 'Недостаточно кредитов' } : b
              ),
            }
          )
        );
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Ошибка' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const taskId = data.taskId;
      if (!taskId) throw new Error('No taskId in NanoBanana API response');

      setBannerGroups(prev =>
        prev.map((g, gi) =>
          gi !== groupIndex ? g : {
            ...g,
            banners: g.banners.map(b =>
              b.key === fmtKey ? { ...b, taskId } : b
            ),
          }
        )
      );

      await waitForBanner(groupIndex, fmtKey, taskId);
    } catch (err) {
      setBannerGroups(prev =>
        prev.map((g, gi) =>
          gi !== groupIndex ? g : {
            ...g,
            banners: g.banners.map(b => {
              if (b.key !== fmtKey) return b;
              const prevUrl = b.previousVersions[b.previousVersions.length - 1] || null;
              return {
                ...b,
                loading: false,
                imageUrl: prevUrl ?? b.imageUrl,
                error: err instanceof Error ? err.message : 'Генерация не удалась. Кредиты не списаны — попробуйте ещё раз.',
                previousVersions: prevUrl ? b.previousVersions.slice(0, -1) : b.previousVersions,
                refreshCount: b.refreshCount - 1,
              };
            }),
          }
        )
      );
    }
  }, [bannerGroups, brief, hypotheses, selectedArchetypes, analyzeResult, waitForBanner]);

  return {
    bannerGroups,
    setBannerGroups,
    activeBannerTab,
    setActiveBannerTab,
    isSwitchingTab,
    anyBannerLoading,
    showNoCreditsModal,
    setShowNoCreditsModal,
    bannerHistory,
    setBannerHistory,
    showingHistory,
    setShowingHistory,
    historyTab,
    setHistoryTab,
    activeBannerGroup,
    bannersSavedRef,
    handleGenerateBanners,
    generateForSingleHypothesis,
    handleRefreshBanner,
    handleDownload,
    switchTab,
    waitForBanner,
  };
}
