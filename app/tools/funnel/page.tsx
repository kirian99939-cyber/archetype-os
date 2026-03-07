'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';
import { PLATFORM_CONFIG } from '@/lib/funnel-types';
import type { FunnelPlatform, InstagramSubtype } from '@/lib/funnel-types';

interface BrandOption {
  id: string;
  name: string;
  audience: string | null;
  utp: string | null;
  context: string | null;
}

const ACCENT = '#C8FF00';

interface SlideResult {
  index: number;
  taskId: string;
  description: string;
  imageUrl: string | null;
  loading: boolean;
  error: boolean;
}

function FunnelContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandIdParam = searchParams.get('brand_id');

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [platform, setPlatform] = useState<FunnelPlatform | null>(null);
  const [subtype, setSubtype] = useState<InstagramSubtype | null>(null);

  // Step 2
  const [slideCount, setSlideCount] = useState(5);
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [generating, setGenerating] = useState(false);

  // Brand selector
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandIdParam || '');

  // Photo upload
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [slides, setSlides] = useState<SlideResult[]>([]);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  // Auth redirect
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/landing');
  }, [status, router]);

  // Load brands list
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => {
        const list: BrandOption[] = (data.brands ?? []).map((b: any) => ({
          id: b.id, name: b.name, audience: b.audience, utp: b.utp, context: b.context,
        }));
        setBrands(list);
        // Auto-fill if brand_id from URL
        if (brandIdParam) {
          const brand = list.find((b) => b.id === brandIdParam);
          if (brand) {
            if (brand.audience && !audience) setAudience(brand.audience);
            if (brand.utp && !offer) setOffer(brand.utp);
            if (brand.context && !characteristics) setCharacteristics(brand.context);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Handle brand selection change
  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    if (!brandId) return;
    const brand = brands.find((b) => b.id === brandId);
    if (brand) {
      if (brand.audience) setAudience(brand.audience);
      if (brand.utp) setOffer(brand.utp);
      if (brand.context) setCharacteristics(brand.context);
    }
  };

  // Photo upload
  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;
    const remaining = 10 - photoUrls.length;
    const toUpload = fileArray.slice(0, remaining);
    if (toUpload.length === 0) return;

    setPhotoUploading(true);
    for (const file of toUpload) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload-photo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
          setPhotoUrls((prev) => [...prev, data.url]);
        }
      } catch {
        // silent
      }
    }
    setPhotoUploading(false);
  };

  const removePhoto = (idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // Set default slide count when platform changes
  useEffect(() => {
    if (platform) {
      setSlideCount(PLATFORM_CONFIG[platform].defaultSlides);
      setSubtype(null);
    }
  }, [platform]);

  // Polling for slide status
  const pollSlide = useCallback(async (taskId: string, index: number) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/banner-status?taskId=${taskId}`);
        const data = await res.json();
        if (data.ready && data.imageUrl) {
          setSlides((prev) =>
            prev.map((s) => (s.index === index ? { ...s, imageUrl: data.imageUrl, loading: false } : s)),
          );
          return;
        }
      } catch {
        // retry
      }
    }
    // Timeout
    setSlides((prev) =>
      prev.map((s) => (s.index === index ? { ...s, loading: false, error: true } : s)),
    );
  }, []);

  // Generate funnel
  const handleGenerate = async () => {
    if (!platform || !product.trim() || !audience.trim()) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/generate-funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          subtype: platform === 'instagram' ? subtype : undefined,
          slideCount,
          product: product.trim(),
          audience: audience.trim(),
          offer: offer.trim(),
          characteristics: characteristics.trim(),
          brandId: selectedBrandId || brandIdParam || undefined,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === 'NO_CREDITS') {
          alert(`Недостаточно кредитов. Нужно: ${err.required}, доступно: ${err.available}`);
        }
        return;
      }

      const data = await res.json();
      const newSlides: SlideResult[] = (data.slides ?? []).map((s: any) => ({
        index: s.index,
        taskId: s.taskId,
        description: s.description,
        imageUrl: null,
        loading: true,
        error: false,
      }));

      setSlides(newSlides);
      setStep(3);

      // Save funnel as project
      setSavedProjectId(null);
      const platformLabel = PLATFORM_CONFIG[platform].label;
      const brandName = selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name : null;
      const title = [brandName, platformLabel, product.trim()].filter(Boolean).join(' · ');
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          status: 'funnel',
          brand_id: selectedBrandId || brandIdParam || undefined,
          funnel: {
            platform,
            subtype: platform === 'instagram' ? subtype : undefined,
            slideCount,
            product: product.trim(),
            audience: audience.trim(),
            offer: offer.trim(),
            characteristics: characteristics.trim(),
            photoUrls,
            slides: newSlides.map(s => ({
              index: s.index, taskId: s.taskId, description: s.description, imageUrl: null,
            })),
            generatedAt: new Date().toISOString(),
          },
        }),
      }).then(r => r.json()).then(d => { if (d.id) setSavedProjectId(d.id); }).catch(() => {});

      // Start polling for each slide
      for (const slide of newSlides) {
        pollSlide(slide.taskId, slide.index);
      }
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate single slide
  const handleRegenerateSlide = async (slideIndex: number) => {
    if (!platform) return;
    const config = PLATFORM_CONFIG[platform];
    let slideStructure = config.slideStructure;
    if (platform === 'instagram' && subtype && config.subtypes) {
      const sub = config.subtypes[subtype];
      if (sub) slideStructure = sub.slideStructure;
    }
    const desc = slideStructure[slideIndex % slideStructure.length];

    setSlides((prev) =>
      prev.map((s) => (s.index === slideIndex ? { ...s, loading: true, error: false, imageUrl: null } : s)),
    );

    try {
      const res = await fetch('/api/generate-funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          subtype: platform === 'instagram' ? subtype : undefined,
          slideCount: 1,
          product: product.trim(),
          audience: audience.trim(),
          offer: offer.trim(),
          characteristics: characteristics.trim(),
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const newSlide = data.slides?.[0];
      if (!newSlide) return;

      setSlides((prev) =>
        prev.map((s) =>
          s.index === slideIndex ? { ...s, taskId: newSlide.taskId, description: desc, loading: true } : s,
        ),
      );

      pollSlide(newSlide.taskId, slideIndex);
    } catch {
      setSlides((prev) =>
        prev.map((s) => (s.index === slideIndex ? { ...s, loading: false, error: true } : s)),
      );
    }
  };

  // Regenerate all
  const handleRegenerateAll = () => {
    setStep(2);
    setSlides([]);
    setSavedProjectId(null);
  };

  const handleDownloadAll = async () => {
    const ready = slides.filter((s) => s.imageUrl);
    if (ready.length === 0) return;

    // Single slide — download directly
    if (ready.length === 1) {
      try {
        const res = await fetch(`/api/download-image?url=${encodeURIComponent(ready[0].imageUrl!)}`);
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `slide-1.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        window.open(ready[0].imageUrl!, '_blank');
      }
      return;
    }

    // Multiple slides — ZIP
    try {
      const platformLabel = platform ? PLATFORM_CONFIG[platform].label.toLowerCase().replace(/\s+/g, '-') : 'funnel';
      const res = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ready.map(s => s.imageUrl!),
          prefix: platformLabel,
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${platformLabel}-funnel.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open each in new tab
      for (const s of ready) {
        window.open(s.imageUrl!, '_blank');
      }
    }
  };

  if (status === 'loading') {
    return (
      <DashboardShell title="Фотоворонки">
        <div className="flex items-center justify-center py-20">
          <p className="text-white/40 text-sm">Загрузка...</p>
        </div>
      </DashboardShell>
    );
  }

  const platformConfig = platform ? PLATFORM_CONFIG[platform] : null;

  return (
    <DashboardShell activePage="tools" title="Фотоворонки">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/dashboard?page=tools')}
            className="text-white/30 hover:text-white/70 transition-colors text-sm"
          >
            ← Инструменты
          </button>
          <span className="text-white/10">/</span>
          <h2 className="text-xl font-bold text-white">Фотоворонки</h2>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['Платформа', 'Данные', 'Результат'].map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px" style={{ background: isDone ? ACCENT : 'rgba(255,255,255,0.1)' }} />}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: isActive || isDone ? ACCENT : 'rgba(255,255,255,0.06)',
                      color: isActive || isDone ? '#0A0A0A' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {isDone ? '✓' : stepNum}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? ACCENT : 'rgba(255,255,255,0.4)' }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══════ Step 1: Platform ══════ */}
        {step === 1 && (
          <div>
            <p className="text-white/50 text-sm mb-4">Выберите платформу для воронки</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {(Object.keys(PLATFORM_CONFIG) as FunnelPlatform[]).map((key) => {
                const cfg = PLATFORM_CONFIG[key];
                const selected = platform === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPlatform(key)}
                    className="flex flex-col items-center gap-2 rounded-xl border p-5 transition-all duration-150 text-center"
                    style={{
                      borderColor: selected ? 'rgba(200,255,0,0.4)' : 'rgba(255,255,255,0.08)',
                      background: selected ? 'rgba(200,255,0,0.06)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <span className="text-3xl">{cfg.emoji}</span>
                    <span className="text-white text-sm font-semibold">{cfg.label}</span>
                    <span className="text-white/30 text-[10px] leading-tight">{cfg.description}</span>
                    <span className="text-white/20 text-[10px]">
                      {cfg.format.width}×{cfg.format.height}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Instagram subtypes */}
            {platform === 'instagram' && PLATFORM_CONFIG.instagram.subtypes && (
              <div className="mb-6">
                <p className="text-white/50 text-xs font-medium mb-2">Тип карусели</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(PLATFORM_CONFIG.instagram.subtypes) as InstagramSubtype[]).map((key) => {
                    const sub = PLATFORM_CONFIG.instagram.subtypes![key];
                    const selected = subtype === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSubtype(key)}
                        className="px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                        style={{
                          background: selected ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.05)',
                          color: selected ? ACCENT : 'rgba(255,255,255,0.5)',
                          border: `1px solid ${selected ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!platform || (platform === 'instagram' && !subtype)}
              className="px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-30"
              style={{ background: ACCENT, color: '#0A0A0A' }}
            >
              Далее →
            </button>
          </div>
        )}

        {/* ══════ Step 2: Data ══════ */}
        {step === 2 && platformConfig && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="text-white/30 hover:text-white/60 text-xs mb-4 transition-colors"
            >
              ← Назад
            </button>

            <div
              className="rounded-xl border p-5 mb-5"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{platformConfig.emoji}</span>
                <h3 className="text-white font-semibold text-base">{platformConfig.label}</h3>
              </div>

              <div className="flex flex-col gap-4 max-w-lg">
                {/* Brand quick-fill */}
                {brands.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedBrandId ? (
                      <>
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(200,255,0,0.1)', color: ACCENT, border: '1px solid rgba(200,255,0,0.25)' }}
                        >
                          {brands.find((b) => b.id === selectedBrandId)?.name}
                        </span>
                        <button
                          onClick={() => setSelectedBrandId('')}
                          className="text-white/30 hover:text-white/60 text-xs transition-colors"
                        >
                          сменить
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-white/40 text-xs">Заполнить из бренда:</span>
                        {brands.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => handleBrandChange(b.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.5)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            {b.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Slide count */}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">
                    Количество слайдов: <span style={{ color: ACCENT }}>{slideCount}</span>
                  </label>
                  <input
                    type="range"
                    min={platformConfig.minSlides}
                    max={platformConfig.maxSlides}
                    value={slideCount}
                    onChange={(e) => setSlideCount(Number(e.target.value))}
                    className="w-full accent-lime-400"
                  />
                  <div className="flex justify-between text-white/20 text-[10px] mt-0.5">
                    <span>{platformConfig.minSlides}</span>
                    <span>{platformConfig.maxSlides}</span>
                  </div>
                </div>

                {/* Product */}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">
                    Продукт / тема <span style={{ color: ACCENT }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="Что продаём или о чём пост..."
                    className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </div>

                {/* Audience */}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">
                    Целевая аудитория <span style={{ color: ACCENT }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Кто целевая аудитория..."
                    className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </div>

                {/* Offer */}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Оффер / ключевое сообщение</label>
                  <textarea
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    placeholder="Скидка 30%, бесплатная доставка..."
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </div>

                {/* Characteristics */}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Ключевые характеристики</label>
                  <textarea
                    value={characteristics}
                    onChange={(e) => setCharacteristics(e.target.value)}
                    placeholder="Размер, материал, особенности..."
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">Ваши фото товара</label>
                  <p className="text-white/20 text-[10px] mb-2">Загрузите фото товара — AI использует их как основу для слайдов</p>

                  {/* Drop zone */}
                  <div
                    className="rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer"
                    style={{
                      borderColor: photoDragOver ? 'rgba(200,255,0,0.4)' : 'rgba(255,255,255,0.1)',
                      background: photoDragOver ? 'rgba(200,255,0,0.03)' : 'transparent',
                    }}
                    onClick={() => photoInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
                    onDragLeave={() => setPhotoDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setPhotoDragOver(false);
                      if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
                    }}
                  >
                    <p className="text-white/30 text-xs">
                      {photoUploading ? 'Загрузка...' : `Перетащите фото сюда или нажмите (${photoUrls.length}/10)`}
                    </p>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }}
                  />

                  {/* Photo previews */}
                  {photoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {photoUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                          />
                          <button
                            onClick={() => removePhoto(i)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(255,0,0,0.6)' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Slide preview */}
                <div>
                  <p className="text-white/40 text-xs font-medium mb-2">Структура слайдов:</p>
                  <div className="flex flex-col gap-1">
                    {(() => {
                      let structure = platformConfig.slideStructure;
                      if (platform === 'instagram' && subtype && platformConfig.subtypes) {
                        const sub = platformConfig.subtypes[subtype];
                        if (sub) structure = sub.slideStructure;
                      }
                      return Array.from({ length: slideCount }, (_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          <span className="text-white/20 font-mono w-4">{i + 1}.</span>
                          <span className="text-white/50">{structure[i % structure.length]}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!product.trim() || !audience.trim() || generating}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-30"
                  style={{ background: ACCENT, color: '#0A0A0A' }}
                >
                  {generating ? 'Генерация...' : `Сгенерировать воронку (${slideCount * 10} кр.)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ Step 3: Result ══════ */}
        {step === 3 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h3 className="text-white font-semibold text-base">
                  {platformConfig?.emoji} {platformConfig?.label} — {slides.length} слайдов
                </h3>
                {savedProjectId ? (
                  <button
                    onClick={() => router.push(`/project/${savedProjectId}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                    style={{ background: 'rgba(200,255,0,0.1)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.2)' }}
                  >
                    ✓ Сохранено → открыть
                  </button>
                ) : (
                  <span className="text-white/20 text-[11px]">сохранение...</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerateAll}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Заново
                </button>
                <button
                  onClick={handleDownloadAll}
                  disabled={slides.every((s) => !s.imageUrl)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-30"
                  style={{ background: ACCENT, color: '#0A0A0A' }}
                >
                  Скачать все
                </button>
              </div>
            </div>

            {/* Horizontal slides */}
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollSnapType: 'x mandatory' }}>
              {slides.map((slide) => (
                <div
                  key={slide.index}
                  className="shrink-0 rounded-xl border overflow-hidden"
                  style={{
                    width: platformConfig && platformConfig.format.height > platformConfig.format.width ? 200 : 280,
                    borderColor: slide.error ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    scrollSnapAlign: 'start',
                  }}
                >
                  {/* Image area */}
                  <div
                    className="relative flex items-center justify-center"
                    style={{
                      aspectRatio: platformConfig
                        ? `${platformConfig.format.width} / ${platformConfig.format.height}`
                        : '1 / 1',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    {slide.loading && (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="w-6 h-6 border-2 rounded-full animate-spin"
                          style={{ borderColor: 'rgba(200,255,0,0.2)', borderTopColor: ACCENT }}
                        />
                        <span className="text-white/30 text-[10px]">Генерация...</span>
                      </div>
                    )}
                    {slide.error && !slide.loading && (
                      <span className="text-red-400/60 text-xs">Ошибка</span>
                    )}
                    {slide.imageUrl && (
                      <img src={slide.imageUrl} alt={`Slide ${slide.index + 1}`} className="w-full h-full object-cover" />
                    )}

                    {/* Regenerate button */}
                    {!slide.loading && (
                      <button
                        onClick={() => handleRegenerateSlide(slide.index)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-opacity hover:opacity-100"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', opacity: 0.6 }}
                        title="Перегенерировать"
                      >
                        ↻
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-3 py-2.5">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      Слайд {slide.index + 1}
                    </p>
                    <p className="text-white/40 text-[10px] leading-tight line-clamp-2">
                      {slide.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function FunnelPage() {
  return (
    <Suspense fallback={
      <DashboardShell title="Фотоворонки">
        <div className="flex items-center justify-center py-20">
          <p className="text-white/40 text-sm">Загрузка...</p>
        </div>
      </DashboardShell>
    }>
      <FunnelContent />
    </Suspense>
  );
}
