'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectData } from '@/lib/project-types';
import { PLATFORM_CONFIG } from '@/lib/funnel-types';

const ACCENT = '#C8FF00';

interface FunnelWorkspaceProps {
  project: ProjectData;
}

export default function FunnelWorkspace({ project }: FunnelWorkspaceProps) {
  const router = useRouter();
  const funnel = project.funnel;
  const [downloading, setDownloading] = useState(false);

  if (!funnel) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40 text-sm">Данные воронки не найдены</p>
      </div>
    );
  }

  const platformConfig = PLATFORM_CONFIG[funnel.platform as keyof typeof PLATFORM_CONFIG] ?? null;
  const readySlides = funnel.slides.filter(s => s.imageUrl);

  const handleDownloadZip = async () => {
    if (readySlides.length === 0) return;
    setDownloading(true);
    try {
      const prefix = funnel.platform ?? 'funnel';
      const res = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: readySlides.map(s => s.imageUrl!), prefix }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${prefix}-funnel.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      for (const s of readySlides) window.open(s.imageUrl!, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-white/30 hover:text-white/70 transition-colors text-sm"
        >
          ←
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{project.title || 'Воронка'}</h2>
          <p className="text-white/30 text-xs mt-0.5">
            {platformConfig?.emoji} {platformConfig?.label} · {funnel.slides.length} слайдов ·{' '}
            {new Date(funnel.generatedAt).toLocaleDateString('ru-RU')}
          </p>
        </div>
        {readySlides.length > 0 && (
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: ACCENT, color: '#0A0A0A' }}
          >
            {downloading ? 'Упаковка...' : `Скачать ZIP (${readySlides.length})`}
          </button>
        )}
      </div>

      {/* Brief summary */}
      <div
        className="rounded-xl border p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
      >
        {[
          { label: 'Продукт', value: funnel.product },
          { label: 'Аудитория', value: funnel.audience },
          { label: 'Оффер', value: funnel.offer },
          { label: 'Характеристики', value: funnel.characteristics },
        ].map(({ label, value }) => value ? (
          <div key={label}>
            <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-white/70 text-xs leading-snug line-clamp-3">{value}</p>
          </div>
        ) : null)}
      </div>

      {/* Photo thumbnails if any */}
      {funnel.photoUrls?.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {funnel.photoUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Фото ${i + 1}`}
              className="w-14 h-14 rounded-lg object-cover border"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>
      )}

      {/* Slides grid */}
      {funnel.slides.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollSnapType: 'x mandatory' }}>
          {funnel.slides.map((slide) => (
            <div
              key={slide.index}
              className="shrink-0 rounded-xl border overflow-hidden"
              style={{
                width: platformConfig && platformConfig.format.height > platformConfig.format.width ? 200 : 280,
                borderColor: 'rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                scrollSnapAlign: 'start',
              }}
            >
              <div
                className="relative flex items-center justify-center bg-black/30"
                style={{
                  aspectRatio: platformConfig
                    ? `${platformConfig.format.width} / ${platformConfig.format.height}`
                    : '1 / 1',
                }}
              >
                {slide.imageUrl ? (
                  <>
                    <img src={slide.imageUrl} alt={`Слайд ${slide.index + 1}`} className="w-full h-full object-cover" />
                    <a
                      href={`/api/download-image?url=${encodeURIComponent(slide.imageUrl)}`}
                      download={`slide-${slide.index + 1}.png`}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                      title="Скачать слайд"
                    >
                      ↓
                    </a>
                  </>
                ) : (
                  <span className="text-white/20 text-xs">Нет изображения</span>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  Слайд {slide.index + 1}
                </p>
                <p className="text-white/40 text-[10px] leading-tight line-clamp-2">{slide.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-white/30 text-sm">Слайды ещё не сгенерированы</p>
          <button
            onClick={() => router.push('/tools/funnel')}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ background: ACCENT, color: '#0A0A0A' }}
          >
            Создать новую воронку
          </button>
        </div>
      )}
    </div>
  );
}
