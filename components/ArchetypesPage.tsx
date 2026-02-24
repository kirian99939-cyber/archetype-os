'use client';

import { ARCHETYPES } from '@/lib/archetypes';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.2)';

export default function ArchetypesPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl mb-1">Библиотека архетипов</h2>
        <p className="text-white/40 text-sm">26 архетипов с формулами, аудиторией и рисками</p>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {ARCHETYPES.map((a) => (
          <div
            key={a.id}
            className="rounded-xl p-4 border border-white/10 flex flex-col gap-3"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
              >
                {a.icon}
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">{a.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{a.audience}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {a.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Formula */}
            <div
              className="rounded-lg px-3 py-2 text-xs font-mono"
              style={{ background: ACCENT_BG, color: ACCENT }}
            >
              {a.formula}
            </div>

            {/* Risk */}
            <div className="flex items-start gap-2">
              <span className="text-xs shrink-0" style={{ color: 'rgba(255,100,100,0.7)' }}>⚠</span>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.risk}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
