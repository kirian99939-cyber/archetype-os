'use client';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';

interface ArchetypeCTR {
  emoji: string;
  name: string;
  ctr: number;
  impressions: number;
  clicks: number;
  status: 'tested' | 'pending';
}

const CTR_DATA: ArchetypeCTR[] = [
  { emoji: '⚔️', name: 'Герой',          ctr: 5.8, impressions: 12400, clicks: 719,  status: 'tested'   },
  { emoji: '🔥', name: 'Бунтарь',        ctr: 5.2, impressions: 9800,  clicks: 510,  status: 'tested'   },
  { emoji: '🌀', name: 'Маг',            ctr: 4.7, impressions: 7200,  clicks: 338,  status: 'tested'   },
  { emoji: '🎭', name: 'Шут',            ctr: 4.4, impressions: 11300, clicks: 497,  status: 'tested'   },
  { emoji: '🚀', name: 'Первопроходец',  ctr: 4.1, impressions: 6100,  clicks: 250,  status: 'tested'   },
  { emoji: '💡', name: 'Инноватор',      ctr: 3.9, impressions: 8500,  clicks: 332,  status: 'tested'   },
  { emoji: '✨', name: 'Невинный',       ctr: 2.1, impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🧭', name: 'Исследователь', ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '📚', name: 'Мудрец',         ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '👥', name: 'Свой парень',    ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '❤️', name: 'Любовник',       ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🛡️', name: 'Защитник',       ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🎨', name: 'Творец',         ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '👑', name: 'Правитель',      ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '⚡', name: 'Воин',           ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🔮', name: 'Провидец',       ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🌟', name: 'Идеалист',       ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🎯', name: 'Перфекционист',  ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '♟️', name: 'Стратег',        ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🎓', name: 'Наставник',      ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🎪', name: 'Артист',         ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🤝', name: 'Компаньон',      ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '📐', name: 'Архитектор',     ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '📖', name: 'Рассказчик',     ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🦋', name: 'Преобразователь',ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
  { emoji: '🌿', name: 'Хранитель',      ctr: 0,   impressions: 0,     clicks: 0,    status: 'pending'  },
];

const maxCTR = Math.max(...CTR_DATA.filter((r) => r.status === 'tested').map((r) => r.ctr));

const STAT_CARDS = [
  {
    value: '+37%',
    label: 'Средний прирост CTR',
    sub: 'vs. без архетипа',
    icon: '↗',
  },
  {
    value: '4.2ч',
    label: 'Среднее время гипотезы',
    sub: 'от брифа до баннера',
    icon: '⏱',
  },
  {
    value: '6/26',
    label: 'Архетипов протестировано',
    sub: '20 ещё ждут запуска',
    icon: '◈',
  },
];

const AI_INSIGHT =
  'Архетипы «Герой» и «Бунтарь» стабильно показывают CTR выше 5%. Рекомендуется приоритизировать тест «Мага» — его формула трансформации близка к топ-результатам. Архетипы с низкой эмоциональностью (Стратег, Архитектор) лучше работают в B2B-каналах — выделите отдельный сплит.';

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl mb-1">Аналитика</h2>
        <p className="text-white/40 text-sm">CTR по архетипам и сводные метрики</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-5 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl font-bold" style={{ color: ACCENT }}>
                {card.value}
              </span>
              <span
                className="text-sm px-2 py-1 rounded-lg"
                style={{ background: ACCENT_BG, color: ACCENT }}
              >
                {card.icon}
              </span>
            </div>
            <p className="text-white text-sm font-medium leading-tight">{card.label}</p>
            <p className="text-white/30 text-xs mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div
        className="rounded-xl p-4 border mb-6"
        style={{
          background: 'rgba(200,255,0,0.04)',
          borderColor: 'rgba(200,255,0,0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: ACCENT }}>✦</span>
          <span className="text-xs font-semibold" style={{ color: ACCENT }}>AI-инсайт</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">{AI_INSIGHT}</p>
      </div>

      {/* CTR Table */}
      <div
        className="rounded-xl border border-white/10 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">CTR по архетипам</p>
          <span className="text-xs text-white/30">26 архетипов</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Архетип', 'CTR', 'Показы', 'Клики', 'Прогресс', 'Статус'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-medium"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CTR_DATA.map((row, i) => (
                <tr
                  key={row.name}
                  className="border-b border-white/5 transition-colors"
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)';
                  }}
                >
                  {/* Archetype */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{row.emoji}</span>
                      <span className="text-white font-medium">{row.name}</span>
                    </div>
                  </td>

                  {/* CTR */}
                  <td className="px-5 py-3">
                    {row.status === 'tested' ? (
                      <span className="font-semibold" style={{ color: ACCENT }}>
                        {row.ctr.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>

                  {/* Impressions */}
                  <td className="px-5 py-3 text-white/50">
                    {row.status === 'tested' ? fmt(row.impressions) : '—'}
                  </td>

                  {/* Clicks */}
                  <td className="px-5 py-3 text-white/50">
                    {row.status === 'tested' ? fmt(row.clicks) : '—'}
                  </td>

                  {/* Progress bar */}
                  <td className="px-5 py-3" style={{ minWidth: 120 }}>
                    {row.status === 'tested' ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 flex-1 rounded-full overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.08)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(row.ctr / maxCTR) * 100}%`,
                              background: ACCENT,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="h-1.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      />
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3">
                    {row.status === 'tested' ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: ACCENT_BG, color: ACCENT }}
                      >
                        Протестирован
                      </span>
                    ) : (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        Ожидает
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
