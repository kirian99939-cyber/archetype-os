'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Brand } from '@/lib/brand-types';
import DashboardShell from '@/components/DashboardShell';

const ACCENT = '#C8FF00';

type Tab = 'overview' | 'projects' | 'banners' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'projects', label: 'Проекты' },
  { id: 'banners', label: 'Баннеры' },
  { id: 'settings', label: 'Настройки' },
];

const FIELDS: { key: string; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'name', label: 'Название бренда', placeholder: 'Nike, Яндекс...' },
  { key: 'website', label: 'Сайт', placeholder: 'https://...' },
  { key: 'audience', label: 'Целевая аудитория', placeholder: 'Мужчины 25-35, предприниматели...', multiline: true },
  { key: 'utp', label: 'УТП', placeholder: 'Уникальное торговое предложение...', multiline: true },
  { key: 'tone_of_voice', label: 'Тон коммуникации', placeholder: 'Дружелюбный, экспертный, провокационный...', multiline: true },
  { key: 'context', label: 'Контекст / описание', placeholder: 'Дополнительная информация о бренде...', multiline: true },
];

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => {
        const found = (data.brands ?? []).find((b: Brand) => b.id === brandId);
        if (found) {
          setBrand(found);
          setForm({
            name: found.name || '',
            website: found.website || '',
            audience: found.audience || '',
            utp: found.utp || '',
            tone_of_voice: found.tone_of_voice || '',
            context: found.context || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brandId]);

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          website: form.website?.trim() || null,
          audience: form.audience?.trim() || null,
          utp: form.utp?.trim() || null,
          tone_of_voice: form.tone_of_voice?.trim() || null,
          context: form.context?.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.brand) {
        setBrand(data.brand);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell activePage="brands" title="Бренд">
        <div className="flex items-center justify-center py-20">
          <p className="text-white/40 text-sm">Загрузка...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!brand) {
    return (
      <DashboardShell activePage="brands" title="Бренд">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-white/40 text-sm mb-4">Бренд не найден</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: 'rgba(200,255,0,0.1)', color: ACCENT }}
          >
            Вернуться
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell activePage="brands" title={brand.name}>
      <div className="max-w-4xl mx-auto">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/dashboard?page=brands')}
            className="text-white/30 hover:text-white/70 transition-colors text-sm"
          >
            ← Бренды
          </button>
          <span className="text-white/10">/</span>
          <h2 className="text-xl font-bold text-white">{brand.name}</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10 pb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2.5 text-sm font-medium transition-all duration-150 rounded-t-lg"
                style={{
                  color: isActive ? ACCENT : 'rgba(255,255,255,0.4)',
                  borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <p className="text-white/30 text-sm">Раздел в разработке</p>
          </div>
        )}

        {activeTab === 'projects' && (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <p className="text-white/30 text-sm">Раздел в разработке</p>
          </div>
        )}

        {activeTab === 'banners' && (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <p className="text-white/30 text-sm">Раздел в разработке</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div
            className="rounded-xl border p-6"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <h3 className="text-white font-semibold text-base mb-5">Редактирование бренда</h3>
            <div className="flex flex-col gap-4 max-w-lg">
              {FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">
                    {field.label}
                    {field.key === 'name' && <span style={{ color: ACCENT }}> *</span>}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={form[field.key] ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                      style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[field.key] ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
                      style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                  )}
                </div>
              ))}

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name?.trim()}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40"
                  style={{ background: ACCENT, color: '#0A0A0A' }}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                {saved && (
                  <span className="text-sm" style={{ color: ACCENT }}>Сохранено</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
