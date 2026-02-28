'use client';

import { useState } from 'react';
import { analyzeArchetypes } from '@/lib/anthropic';
import type { AnalyzeResponse } from '@/app/api/analyze/route';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function ArchetypeAnalyzer() {
  const [productDescription, setProductDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeArchetypes({
        productDescription,
        targetAudience,
        brandValues: brandValues || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="glass-card p-8">
        <h2 className="text-white font-semibold text-xl mb-6">Анализ архетипов бренда</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">
              Описание продукта / бренда *
            </label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Опишите ваш продукт, услугу или бренд..."
              rows={4}
              className="input-field resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">
              Целевая аудитория *
            </label>
            <textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Опишите вашу целевую аудиторию: возраст, интересы, боли..."
              rows={3}
              className="input-field resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">
              Ценности бренда{' '}
              <span className="text-white/30">(необязательно)</span>
            </label>
            <input
              type="text"
              value={brandValues}
              onChange={(e) => setBrandValues(e.target.value)}
              placeholder="Надёжность, инновации, экологичность..."
              className="input-field"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <AnimatedLogo size={16} inline />
                Анализируем...
              </span>
            ) : (
              'Проанализировать архетипы'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-6">
        {!result && !loading && (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-white/40">Заполните форму и получите анализ архетипов вашего бренда</p>
          </div>
        )}

        {loading && (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            <AnimatedLogo size={48} inline />
            <p className="text-white/60 mt-4">Claude анализирует ваш бренд...</p>
          </div>
        )}

        {result && (
          <>
            {/* Positioning */}
            <div className="glass-card p-6">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Позиционирование</p>
              <p className="text-white text-lg font-medium">{result.positioning}</p>
              <span className="inline-block mt-3 px-3 py-1 bg-brand-500/20 text-brand-500 text-xs font-semibold rounded-full">
                Основной архетип: {result.primaryArchetype}
              </span>
            </div>

            {/* Archetypes */}
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-4">Архетипы бренда</h3>
              <div className="space-y-4">
                {result.archetypes.map((archetype, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{archetype.name}</span>
                      <span className="text-brand-500 font-semibold text-sm">{archetype.matchScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${archetype.matchScore}%` }}
                      />
                    </div>
                    <p className="text-white/50 text-sm">{archetype.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {archetype.keywords.map((kw, j) => (
                        <span key={j} className="px-2 py-0.5 bg-white/5 text-white/40 text-xs rounded-md">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hypotheses */}
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-4">Маркетинговые гипотезы</h3>
              <div className="space-y-4">
                {result.hypotheses.map((h, i) => (
                  <div key={i} className="border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-white font-medium">{h.title}</h4>
                      <span className="shrink-0 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-md">
                        {h.tone}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm mb-3">{h.rationale}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">CTA:</span>
                      <span className="text-brand-500 text-sm font-medium">"{h.cta}"</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
