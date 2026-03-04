'use client';

import { useState, useRef, useCallback } from 'react';

const ARCHETYPES = [
  { id: 'mem', label: 'Мем', icon: '😂' },
  { id: 'trend', label: 'Трендовый', icon: '🔥' },
  { id: 'aesthetic', label: 'Эстетический', icon: '✦' },
  { id: 'cringe', label: 'Кринжовый', icon: '🤪' },
  { id: 'wow', label: 'WOW-архетип', icon: '🎬' },
  { id: 'acid', label: 'Кислотный', icon: '⚡' },
  { id: 'zhiza', label: 'Жиза', icon: '🏠' },
  { id: 'premium', label: 'Премиум', icon: '💎' },
  { id: 'nostalgia', label: 'Ностальгический', icon: '📼' },
  { id: 'story', label: 'Сюжетный', icon: '📖' },
  { id: 'social_proof', label: 'Соцдоказательство', icon: '⭐' },
  { id: 'shock', label: 'Шок/провокация', icon: '💥' },
  { id: 'science', label: 'Научный', icon: '🔬' },
  { id: 'asmr', label: 'ASMR / Мягкий', icon: '🧸' },
  { id: 'gamification', label: 'Геймификация', icon: '🎮' },
  { id: 'surreal', label: 'AI-Сюрреализм', icon: '🌀' },
  { id: 'cultural', label: 'Культурный код', icon: '🌍' },
  { id: 'hyperbole', label: 'Гиперболизация', icon: '🚀' },
  { id: 'cinematic', label: 'Синематический', icon: '🎥' },
  { id: 'cat', label: 'Котоархетип', icon: '🐱' },
  { id: 'eco', label: 'Экологичный', icon: '🌿' },
  { id: 'cute', label: 'Милота', icon: '🩷' },
  { id: 'pov', label: 'POV', icon: '👁' },
  { id: 'celebrity', label: 'Ассоциация с персоной', icon: '🧠' },
  { id: 'badgood', label: 'Чем хуже тем лучше', icon: '📉' },
  { id: 'seduction', label: 'Соблазн', icon: '🔥' },
  { id: 'black-box', label: 'Чёрный ящик', icon: '📦' },
];

type CardStatus = 'idle' | 'generating' | 'done' | 'error';

interface CardState {
  status: CardStatus;
  imageUrl: string | null;
  timeMs: number | null;
  error: string | null;
}

export default function TestArchetypesPage() {
  const [product, setProduct] = useState('Женская джинсовая рубашка The Legend');
  const [description, setDescription] = useState('Стильная базовая одежда для женщин 25-40 лет. Комфорт и свобода. Выглядит дороже своей цены.');
  const [audience, setAudience] = useState('Женщины 25-40 лет, ценят эстетику и качество');

  const [cards, setCards] = useState<Record<string, CardState>>(() => {
    const init: Record<string, CardState> = {};
    for (const a of ARCHETYPES) init[a.id] = { status: 'idle', imageUrl: null, timeMs: null, error: null };
    return init;
  });

  const [selected, setSelected] = useState<Set<string>>(() => new Set(ARCHETYPES.map(a => a.id)));
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(ARCHETYPES.map(a => a.id))), []);
  const selectNone = useCallback(() => setSelected(new Set()), []);

  const runGeneration = useCallback(async () => {
    const ids = ARCHETYPES.filter(a => selected.has(a.id)).map(a => a.id);
    if (ids.length === 0 || !product.trim()) return;

    abortRef.current = false;
    setIsRunning(true);
    setProgress({ current: 0, total: ids.length });

    // Reset selected cards
    setCards(prev => {
      const next = { ...prev };
      for (const id of ids) next[id] = { status: 'idle', imageUrl: null, timeMs: null, error: null };
      return next;
    });

    for (let i = 0; i < ids.length; i++) {
      if (abortRef.current) break;

      const archetypeId = ids[i];
      setProgress({ current: i + 1, total: ids.length });
      setCards(prev => ({ ...prev, [archetypeId]: { ...prev[archetypeId], status: 'generating' } }));

      try {
        const res = await fetch('/api/test-archetype-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product, description, audience, archetypeId }),
        });

        const data = await res.json();

        if (data.success && data.imageUrl) {
          setCards(prev => ({
            ...prev,
            [archetypeId]: { status: 'done', imageUrl: data.imageUrl, timeMs: data.timeMs, error: null },
          }));
        } else {
          setCards(prev => ({
            ...prev,
            [archetypeId]: { status: 'error', imageUrl: null, timeMs: data.timeMs, error: data.error || 'Failed' },
          }));
        }
      } catch (err) {
        setCards(prev => ({
          ...prev,
          [archetypeId]: { status: 'error', imageUrl: null, timeMs: null, error: err instanceof Error ? err.message : 'Network error' },
        }));
      }
    }

    setIsRunning(false);
  }, [product, description, audience, selected]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
  }, []);

  const doneCount = Object.values(cards).filter(c => c.status === 'done').length;
  const errorCount = Object.values(cards).filter(c => c.status === 'error').length;

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', color: '#ededed', padding: '24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          Тест архетипов
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>
          Сравнение всех 28 архетипов на одном продукте
        </p>

        {/* Brief form */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Продукт</label>
              <input
                value={product}
                onChange={e => setProduct(e.target.value)}
                disabled={isRunning}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '10px 12px', color: '#ededed', fontSize: 14, outline: 'none',
                }}
                placeholder="Название продукта"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Аудитория</label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                disabled={isRunning}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '10px 12px', color: '#ededed', fontSize: 14, outline: 'none',
                }}
                placeholder="Целевая аудитория"
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' }}>Описание / УТП</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isRunning}
              rows={2}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '10px 12px', color: '#ededed', fontSize: 14, outline: 'none', resize: 'vertical',
              }}
              placeholder="Описание продукта и УТП"
            />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {!isRunning ? (
              <button
                onClick={runGeneration}
                disabled={selected.size === 0 || !product.trim()}
                style={{
                  background: selected.size > 0 && product.trim() ? '#C8FF00' : 'rgba(255,255,255,0.1)',
                  color: selected.size > 0 && product.trim() ? '#0A0A0A' : 'rgba(255,255,255,0.3)',
                  border: 'none', borderRadius: 8, padding: '10px 20px',
                  fontWeight: 600, fontSize: 14, cursor: selected.size > 0 && product.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Сгенерировать {selected.size === ARCHETYPES.length ? 'все' : `выбранные (${selected.size})`}
              </button>
            ) : (
              <button
                onClick={handleStop}
                style={{
                  background: '#ef4444', color: 'white', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Стоп
              </button>
            )}

            <button
              onClick={selectAll}
              disabled={isRunning}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              Выбрать все
            </button>
            <button
              onClick={selectNone}
              disabled={isRunning}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              Снять все
            </button>

            {isRunning && (
              <span style={{ color: '#C8FF00', fontSize: 14, fontWeight: 500 }}>
                Генерация {progress.current}/{progress.total}...
              </span>
            )}
            {!isRunning && (doneCount > 0 || errorCount > 0) && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                Готово: {doneCount} | Ошибок: {errorCount}
              </span>
            )}
          </div>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {ARCHETYPES.map(arch => {
            const card = cards[arch.id];
            const isSelected = selected.has(arch.id);

            return (
              <div
                key={arch.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: isSelected ? 1 : 0.5,
                  transition: 'opacity 0.2s, border-color 0.2s',
                }}
              >
                {/* Card header */}
                <div
                  onClick={() => !isRunning && toggleSelect(arch.id)}
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isRunning ? 'default' : 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{arch.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{arch.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {card.timeMs && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                        {(card.timeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {card.status === 'generating' && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#C8FF00',
                        animation: 'pulse 1s infinite',
                      }} />
                    )}
                    {card.status === 'done' && (
                      <span style={{ color: '#22c55e', fontSize: 14 }}>&#10003;</span>
                    )}
                    {card.status === 'error' && (
                      <span style={{ color: '#ef4444', fontSize: 14 }}>&#10007;</span>
                    )}
                    {/* Checkbox */}
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `2px solid ${isSelected ? '#C8FF00' : 'rgba(255,255,255,0.25)'}`,
                      background: isSelected ? '#C8FF00' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <span style={{ color: '#0A0A0A', fontSize: 11, fontWeight: 'bold' }}>&#10003;</span>}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ aspectRatio: '1', position: 'relative', background: 'rgba(0,0,0,0.3)' }}>
                  {card.status === 'idle' && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 48 }}>{arch.icon}</span>
                    </div>
                  )}

                  {card.status === 'generating' && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 32, height: 32, border: '3px solid rgba(200,255,0,0.2)',
                        borderTopColor: '#C8FF00', borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Генерируем...</span>
                    </div>
                  )}

                  {card.status === 'done' && card.imageUrl && (
                    <img
                      src={card.imageUrl}
                      alt={arch.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}

                  {card.status === 'error' && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16,
                    }}>
                      <span style={{ color: '#ef4444', fontSize: 24 }}>&#10007;</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>
                        {card.error}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
