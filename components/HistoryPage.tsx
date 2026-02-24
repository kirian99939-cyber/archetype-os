'use client';

import { useState } from 'react';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';

type CTRLevel = 'very-high' | 'high' | 'medium';

interface BannerCard {
  id: number;
  projectName: string;
  archetype: string;
  archetypeEmoji: string;
  headline: string;
  cta: string;
  accentColor: string;
  bgGradient: string;
  ctrLevel: CTRLevel;
  ctrValue: string;
  date: string;
  format: string;
  meta: {
    composition: string;
    color: string;
    emotion: string;
  };
}

const CTR_META: Record<CTRLevel, { label: string; color: string; bg: string; border: string }> = {
  'very-high': {
    label: 'Очень высокий CTR',
    color: ACCENT,
    bg: ACCENT_BG,
    border: ACCENT_BORDER,
  },
  high: {
    label: 'Высокий CTR',
    color: 'rgba(100,210,255,0.9)',
    bg: 'rgba(100,210,255,0.08)',
    border: 'rgba(100,210,255,0.2)',
  },
  medium: {
    label: 'Средний CTR',
    color: 'rgba(255,200,80,0.9)',
    bg: 'rgba(255,200,80,0.08)',
    border: 'rgba(255,200,80,0.2)',
  },
};

const BANNERS: BannerCard[] = [
  {
    id: 1,
    projectName: 'FitFlow — Запуск приложения',
    archetype: 'Герой',
    archetypeEmoji: '⚔️',
    headline: 'Сломай свои пределы. Начни сегодня.',
    cta: 'Скачать бесплатно',
    accentColor: ACCENT,
    bgGradient: 'linear-gradient(135deg, #0f1a0a 0%, #1a2e0d 50%, #0d1a08 100%)',
    ctrLevel: 'very-high',
    ctrValue: '5.8%',
    date: '21 фев 2026',
    format: 'Feed 1:1',
    meta: {
      composition: 'Центрированная, динамичная',
      color: 'Лайм + чёрный, высокий контраст',
      emotion: 'Мотивация, вызов',
    },
  },
  {
    id: 2,
    projectName: 'Кампания «Осень с нами»',
    archetype: 'Хранитель',
    archetypeEmoji: '🌿',
    headline: 'Тепло дома в каждой детали.',
    cta: 'Узнать больше',
    accentColor: 'rgba(100,210,150,0.9)',
    bgGradient: 'linear-gradient(135deg, #0a150f 0%, #112018 50%, #091410 100%)',
    ctrLevel: 'high',
    ctrValue: '4.1%',
    date: '14 фев 2026',
    format: 'Stories 9:16',
    meta: {
      composition: 'Органичная, мягкая',
      color: 'Зелёный + кремовый, низкий контраст',
      emotion: 'Уют, доверие',
    },
  },
  {
    id: 3,
    projectName: 'BrandLab Pro — Ребрендинг',
    archetype: 'Инноватор',
    archetypeEmoji: '💡',
    headline: 'Будущее бренда — уже здесь.',
    cta: 'Попробовать',
    accentColor: 'rgba(160,120,255,0.9)',
    bgGradient: 'linear-gradient(135deg, #0e0a1a 0%, #1a1030 50%, #0c0915 100%)',
    ctrLevel: 'medium',
    ctrValue: '2.9%',
    date: '9 фев 2026',
    format: 'Banner 16:9',
    meta: {
      composition: 'Асимметричная, технологичная',
      color: 'Фиолетовый + белый, средний контраст',
      emotion: 'Любопытство, прогресс',
    },
  },
];

function BannerPreview({ banner }: { banner: BannerCard }) {
  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{
        aspectRatio: '16/9',
        background: banner.bgGradient,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)',
        }}
      />

      {/* Archetype badge top-left */}
      <div className="absolute top-3 left-3">
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {banner.archetypeEmoji} {banner.archetype}
        </span>
      </div>

      {/* Format badge top-right */}
      <div className="absolute top-3 right-3">
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.35)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {banner.format}
        </span>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p
          className="font-bold text-white leading-tight mb-3"
          style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
        >
          {banner.headline}
        </p>
        <div
          className="px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: banner.accentColor,
            color: '#000',
          }}
        >
          {banner.cta}
        </div>
      </div>

      {/* CTR badge bottom-left */}
      <div className="absolute bottom-3 left-3">
        <span
          className="text-xs px-2 py-1 rounded-full font-semibold"
          style={{
            background: CTR_META[banner.ctrLevel].bg,
            color: CTR_META[banner.ctrLevel].color,
            border: `1px solid ${CTR_META[banner.ctrLevel].border}`,
            backdropFilter: 'blur(4px)',
          }}
        >
          {banner.ctrValue} · {CTR_META[banner.ctrLevel].label}
        </span>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-white/25 text-xs shrink-0 w-24">{label}</span>
      <span className="text-white/60 text-xs">{value}</span>
    </div>
  );
}

function BannerCardItem({ banner }: { banner: BannerCard }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div
      className="rounded-xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)' }}
    >
      {/* Preview */}
      <div className="p-4 pb-3">
        <BannerPreview banner={banner} />
      </div>

      {/* Info */}
      <div className="px-4 pb-4 flex flex-col gap-3">
        {/* Project + archetype */}
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{banner.projectName}</p>
          <p className="text-white/35 text-xs mt-0.5">{banner.date}</p>
        </div>

        {/* CTR badge (standalone row) */}
        <div>
          <span
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background: CTR_META[banner.ctrLevel].bg,
              color: CTR_META[banner.ctrLevel].color,
              border: `1px solid ${CTR_META[banner.ctrLevel].border}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: CTR_META[banner.ctrLevel].color }}
            />
            {CTR_META[banner.ctrLevel].label} · {banner.ctrValue}
          </span>
        </div>

        {/* Meta */}
        <div
          className="rounded-lg p-3 flex flex-col gap-1.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <MetaRow label="Композиция" value={banner.meta.composition} />
          <MetaRow label="Цвет"       value={banner.meta.color} />
          <MetaRow label="Эмоция"     value={banner.meta.emotion} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setAccepted((v) => !v)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              accepted
                ? {
                    background: ACCENT_BG,
                    color: ACCENT,
                    border: `1px solid ${ACCENT_BORDER}`,
                  }
                : {
                    background: ACCENT,
                    color: '#000',
                    border: '1px solid transparent',
                  }
            }
          >
            {accepted ? '✓ Принято' : 'Принять'}
          </button>
          <button
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            Править
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl mb-1">История генераций</h2>
        <p className="text-white/40 text-sm">Сгенерированные баннеры и их показатели</p>
      </div>

      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
      >
        {BANNERS.map((banner) => (
          <BannerCardItem key={banner.id} banner={banner} />
        ))}
      </div>
    </div>
  );
}
