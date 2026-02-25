'use client';

import { useState, useEffect } from 'react';
import { ARCHETYPES } from '@/lib/archetypes';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';

export default function BannerLibraryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | string>('all');

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        const withBanners = (data || []).filter((p: any) =>
          (Array.isArray(p.banner_history) && p.banner_history.length > 0) ||
          (Array.isArray(p.banners) && p.banners.length > 0)
        );
        setProjects(withBanners);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allBanners: any[] = [];
  projects.forEach(project => {
    const iterations = Array.isArray(project.banner_history) && project.banner_history.length > 0
      ? project.banner_history
      : Array.isArray(project.banners) && project.banners.length > 0
        ? [{ iterationId: 'legacy', createdAt: project.updated_at, archetypeId: project.archetype?.id, archetypeLabel: project.archetype?.id, bannerGroups: project.banners }]
        : [];

    iterations.forEach((iter: any, iterIdx: number) => {
      (iter.bannerGroups || []).forEach((group: any) => {
        (group.banners || []).forEach((b: any) => {
          if (b.imageUrl) {
            allBanners.push({
              projectTitle: project.title || 'Без названия',
              projectId: project.id,
              iterationLabel: `#${iterIdx + 1}`,
              archetypeId: iter.archetypeId || '',
              archetypeLabel: iter.archetypeLabel || '',
              createdAt: iter.createdAt || project.created_at,
              banner: b,
            });
          }
        });
      });
    });
  });

  const archetypeIds = Array.from(new Set(allBanners.map(b => b.archetypeId).filter(Boolean)));
  const filtered = filter === 'all' ? allBanners : allBanners.filter(b => b.archetypeId === filter);

  const handleDownload = (banner: any) => {
    if (!banner.imageUrl) return;
    const a = document.createElement('a');
    a.href = `/api/download-image?url=${encodeURIComponent(banner.imageUrl)}`;
    a.download = `banner-${banner.key}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-white font-bold text-2xl">📚 Все баннеры</h1>
        <p className="text-white/40 text-sm mt-1">
          {allBanners.length} баннеров из {projects.length} проектов
        </p>
      </div>

      {archetypeIds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === 'all' ? ACCENT_BG : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filter === 'all' ? ACCENT : 'rgba(255,255,255,0.1)'}`,
              color: filter === 'all' ? ACCENT : 'rgba(255,255,255,0.5)',
            }}>
            Все
          </button>
          {archetypeIds.map(id => {
            const arch = ARCHETYPES.find(a => a.id === id);
            return (
              <button key={id} onClick={() => setFilter(id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: filter === id ? ACCENT_BG : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${filter === id ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                  color: filter === id ? ACCENT : 'rgba(255,255,255,0.5)',
                }}>
                {arch?.icon} {arch?.label || id}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-3xl mb-3">🖼</div>
          <p className="text-white/40 text-sm">Пока нет баннеров. Создайте первый проект!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item, i) => (
            <div key={i} className="glass-card p-3 flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.banner.imageUrl} alt={item.banner.label}
                className="w-full rounded-lg cursor-pointer"
                onClick={() => window.open(item.banner.imageUrl, '_blank')} />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 truncate max-w-[60%]">{item.projectTitle}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: ACCENT_BG, color: ACCENT }}>{item.banner.sublabel}</span>
              </div>
              {item.archetypeLabel && (
                <span className="text-[10px] text-white/25">
                  {item.archetypeLabel} · {item.iterationLabel}
                </span>
              )}
              <button onClick={() => handleDownload(item.banner)}
                className="w-full py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: ACCENT, color: '#0A0A0A' }}>
                ↓ Скачать
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
