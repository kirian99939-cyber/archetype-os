'use client';

const ACCENT = '#C8FF00';

interface Props {
  onNavigate: (page: string) => void;
}

const TOOLS = [
  {
    id: 'banner-generator',
    title: 'Генератор баннеров',
    description: 'Создавайте рекламные баннеры с помощью AI на основе архетипов',
    icon: '🎨',
    available: true,
  },
  {
    id: 'video-generator',
    title: 'Генератор видео',
    description: 'AI-видео для рекламы и соцсетей',
    icon: '🎬',
    available: false,
  },
  {
    id: 'text-generator',
    title: 'Генератор текстов',
    description: 'Рекламные тексты, заголовки и описания',
    icon: '✍️',
    available: false,
  },
];

export default function ToolsPage({ onNavigate }: Props) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Инструменты</h2>
        <p className="text-white/40 text-sm mt-1">
          AI-инструменты для создания рекламных материалов
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <div
            key={tool.id}
            className="rounded-xl border p-5 transition-all duration-150"
            style={{
              borderColor: tool.available ? 'rgba(200,255,0,0.2)' : 'rgba(255,255,255,0.08)',
              background: tool.available ? 'rgba(200,255,0,0.03)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <div className="text-3xl mb-3">{tool.icon}</div>
            <h3 className="text-white font-semibold text-base mb-1">{tool.title}</h3>
            <p className="text-white/40 text-xs mb-4 leading-relaxed">{tool.description}</p>

            {tool.available ? (
              <button
                onClick={() => onNavigate('new-project')}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:scale-[1.02]"
                style={{ background: ACCENT, color: '#0A0A0A' }}
              >
                Открыть
              </button>
            ) : (
              <div
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-center"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
              >
                Скоро
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
