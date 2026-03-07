'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCENT = '#C8FF00';

const PLATFORMS = [
  'Instagram', 'TikTok', 'VK', 'Telegram', 'YouTube',
  'Яндекс Директ', 'Google Ads', 'MyTarget', 'Одноклассники',
];

const TOOLS = [
  { id: 'banners', icon: '🖼', label: 'Баннеры', active: true },
  { id: 'video', icon: '🎬', label: 'Видео', active: false },
  { id: 'texts', icon: '✍️', label: 'Тексты', active: false },
] as const;

interface BrandData {
  audience?: string | null;
  utp?: string | null;
  tone_of_voice?: string | null;
  context?: string | null;
}

interface NewProjectModalProps {
  brandId: string;
  brandName: string;
  brandData: BrandData;
  onClose: () => void;
}

export default function NewProjectModal({ brandId, brandName, brandData, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Brief fields
  const [offer, setOffer] = useState('');
  const [goal, setGoal] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);

  // Brand data (editable)
  const [audience, setAudience] = useState(brandData.audience ?? '');
  const [utp, setUtp] = useState(brandData.utp ?? '');
  const [toneOfVoice, setToneOfVoice] = useState(brandData.tone_of_voice ?? '');
  const [brandAccordionOpen, setBrandAccordionOpen] = useState(false);

  const [creating, setCreating] = useState(false);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleCreate = async () => {
    if (!offer.trim() || !goal.trim()) return;
    setCreating(true);
    try {
      const brief = {
        product: brandName,
        price: '',
        audience,
        goal,
        utp,
        offer,
        toneOfVoice,
        platforms,
        context: brandData.context ?? '',
        visualMode: 'ai' as const,
        imageUrls: [],
        imageLink: '',
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: brandName,
          brief,
          status: 'brief',
          brand_id: brandId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/project/${data.id}`);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-6 relative"
        style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors text-lg"
        >
          ✕
        </button>

        {/* Step 1 — Tool selection */}
        {step === 1 && (
          <div>
            <h3 className="text-white font-bold text-lg mb-1">Что создаём?</h3>
            <p className="text-white/40 text-sm mb-5">Выберите тип контента</p>

            <div className="grid grid-cols-3 gap-3">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => { if (tool.active) setStep(2); }}
                  disabled={!tool.active}
                  className="relative flex flex-col items-center gap-2 rounded-xl border p-5 transition-all duration-150"
                  style={{
                    borderColor: tool.active ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.08)',
                    background: tool.active ? 'rgba(200,255,0,0.05)' : 'rgba(255,255,255,0.02)',
                    cursor: tool.active ? 'pointer' : 'default',
                    opacity: tool.active ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (tool.active) e.currentTarget.style.borderColor = 'rgba(200,255,0,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    if (tool.active) e.currentTarget.style.borderColor = 'rgba(200,255,0,0.3)';
                  }}
                >
                  <span className="text-3xl">{tool.icon}</span>
                  <span className="text-white text-sm font-medium">{tool.label}</span>
                  {!tool.active && (
                    <span
                      className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      Скоро
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Quick brief */}
        {step === 2 && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="text-white/30 hover:text-white/60 text-xs mb-3 transition-colors"
            >
              ← Назад
            </button>
            <h3 className="text-white font-bold text-lg mb-1">
              Кампания для {brandName}
            </h3>
            <p className="text-white/40 text-sm mb-5">Заполните основные параметры</p>

            <div className="flex flex-col gap-4">
              {/* Offer */}
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5">
                  Оффер / УТП для этой кампании <span style={{ color: ACCENT }}>*</span>
                </label>
                <textarea
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="Скидка 30% на всё до конца недели..."
                  rows={2}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Goal */}
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5">
                  Цель рекламы <span style={{ color: ACCENT }}>*</span>
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Увеличить продажи, привлечь трафик..."
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5">Платформы</label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => {
                    const selected = platforms.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                        style={{
                          background: selected ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.05)',
                          color: selected ? ACCENT : 'rgba(255,255,255,0.5)',
                          border: `1px solid ${selected ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand data accordion */}
              <div
                className="rounded-lg border"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
              >
                <button
                  onClick={() => setBrandAccordionOpen(!brandAccordionOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-white/50 hover:text-white/70 transition-colors"
                >
                  <span className="font-medium">Данные бренда</span>
                  <span className="text-xs">{brandAccordionOpen ? '▲' : '▼'}</span>
                </button>

                {brandAccordionOpen && (
                  <div className="px-3 pb-3 flex flex-col gap-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="pt-3">
                      <label className="block text-white/40 text-xs mb-1">Аудитория</label>
                      <textarea
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        rows={2}
                        placeholder="Целевая аудитория..."
                        className="w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 text-xs mb-1">УТП бренда</label>
                      <textarea
                        value={utp}
                        onChange={(e) => setUtp(e.target.value)}
                        rows={2}
                        placeholder="Уникальное торговое предложение..."
                        className="w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 text-xs mb-1">Тон коммуникации</label>
                      <input
                        type="text"
                        value={toneOfVoice}
                        onChange={(e) => setToneOfVoice(e.target.value)}
                        placeholder="Дружелюбный, экспертный..."
                        className="w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={!offer.trim() || !goal.trim() || creating}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-40"
                style={{ background: ACCENT, color: '#0A0A0A' }}
              >
                {creating ? 'Создание...' : 'Создать проект'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
