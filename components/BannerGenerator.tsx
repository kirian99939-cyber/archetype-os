'use client';

import { useState } from 'react';
import Image from 'next/image';
import { generateBanner } from '@/lib/gemini';

const STYLES = [
  { value: 'minimal', label: 'Минимализм' },
  { value: 'bold', label: 'Смелый' },
  { value: 'elegant', label: 'Элегантный' },
  { value: 'playful', label: 'Игривый' },
  { value: 'corporate', label: 'Корпоративный' },
];

const ARCHETYPES = [
  { value: 'hero', label: 'Герой' },
  { value: 'sage', label: 'Мудрец' },
  { value: 'creator', label: 'Творец' },
  { value: 'rebel', label: 'Бунтарь' },
  { value: 'caregiver', label: 'Защитник' },
  { value: 'explorer', label: 'Исследователь' },
  { value: 'innocent', label: 'Невинный' },
  { value: 'magician', label: 'Маг' },
  { value: 'ruler', label: 'Правитель' },
  { value: 'lover', label: 'Любовник' },
  { value: 'jester', label: 'Шут' },
  { value: 'everyman', label: 'Обычный человек' },
];

const SIZES = [
  { label: '16:9 (YouTube)', width: 1280, height: 720 },
  { label: '1:1 (Instagram)', width: 1080, height: 1080 },
  { label: '4:5 (Stories)', width: 1080, height: 1350 },
  { label: '3:1 (Баннер)', width: 1200, height: 400 },
];

export default function BannerGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('minimal');
  const [archetype, setArchetype] = useState('');
  const [sizeIndex, setSizeIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSize = SIZES[sizeIndex];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const result = await generateBanner({
        prompt,
        width: selectedSize.width,
        height: selectedSize.height,
        style,
        archetype: archetype || undefined,
      });

      setImageUrl(result.imageUrl);
      setUsedPrompt(result.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `banner-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="glass-card p-8">
        <h2 className="text-white font-semibold text-xl mb-6">Генератор баннеров</h2>
        <form onSubmit={handleGenerate} className="space-y-5">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">
              Описание баннера *
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Баннер для запуска нового смартфона. Молодёжная аудитория, акцент на камеру и дизайн..."
              rows={4}
              className="input-field resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Стиль</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    style === s.value
                      ? 'bg-brand-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">
              Архетип{' '}
              <span className="text-white/30">(необязательно)</span>
            </label>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="input-field"
            >
              <option value="">Без архетипа</option>
              {ARCHETYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Размер</label>
            <div className="grid grid-cols-2 gap-2">
              {SIZES.map((size, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSizeIndex(i)}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${
                    sizeIndex === i
                      ? 'bg-brand-500/20 border border-brand-500 text-brand-500'
                      : 'bg-white/5 border border-transparent text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="font-medium">{size.label}</span>
                  <br />
                  <span className="text-xs opacity-60">
                    {size.width}×{size.height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Генерируем баннер...
              </span>
            ) : (
              'Сгенерировать баннер'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="glass-card p-8 flex flex-col">
        <h3 className="text-white font-semibold mb-4">Предпросмотр</h3>

        {!imageUrl && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white/40">Ваш баннер появится здесь</p>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white/60">Gemini генерирует изображение...</p>
            <p className="text-white/30 text-sm mt-1">Обычно 10–30 секунд</p>
          </div>
        )}

        {imageUrl && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-white/5">
              <Image
                src={imageUrl}
                alt="Generated banner"
                width={selectedSize.width}
                height={selectedSize.height}
                className="w-full h-auto object-contain"
                unoptimized
              />
            </div>

            <div className="flex gap-2">
              <button onClick={handleDownload} className="btn-primary flex-1">
                Скачать
              </button>
              <button
                onClick={() => {
                  setImageUrl(null);
                  setUsedPrompt(null);
                }}
                className="btn-secondary"
              >
                Сбросить
              </button>
            </div>

            {usedPrompt && (
              <details className="text-xs">
                <summary className="text-white/30 cursor-pointer hover:text-white/50">
                  Использованный промпт
                </summary>
                <p className="text-white/30 mt-2 leading-relaxed">{usedPrompt}</p>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
