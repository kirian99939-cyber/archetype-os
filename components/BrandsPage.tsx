'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Brand } from '@/lib/brand-types';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.2)';

const FIELDS: { key: keyof Brand; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'name', label: 'Название бренда', placeholder: 'Nike, Яндекс...' },
  { key: 'website', label: 'Сайт', placeholder: 'https://...' },
  { key: 'audience', label: 'Целевая аудитория', placeholder: 'Мужчины 25-35, предприниматели...', multiline: true },
  { key: 'utp', label: 'УТП', placeholder: 'Уникальное торговое предложение...', multiline: true },
  { key: 'tone_of_voice', label: 'Тон коммуникации', placeholder: 'Дружелюбный, экспертный, провокационный...', multiline: true },
  { key: 'context', label: 'Контекст / описание', placeholder: 'Дополнительная информация о бренде...', multiline: true },
];

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      setBrands(data.brands ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
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
        setBrands((prev) => [data.brand, ...prev]);
        setModalOpen(false);
        setForm({});
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить бренд?')) return;
    await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    setBrands((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/40 text-sm">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Мои бренды</h2>
          <p className="text-white/40 text-sm mt-1">
            Сохраняйте информацию о брендах для быстрого создания проектов
          </p>
        </div>
        <button
          onClick={() => { setForm({}); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:scale-[1.02]"
          style={{ background: ACCENT, color: '#0A0A0A' }}
        >
          <span>+</span>
          <span>Новый бренд</span>
        </button>
      </div>

      {/* Brand cards */}
      {brands.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-12 text-center"
          style={{ borderColor: ACCENT_BORDER }}
        >
          <p className="text-white/30 text-lg mb-2">Нет брендов</p>
          <p className="text-white/20 text-sm">Создайте первый бренд, чтобы ускорить работу над проектами</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="rounded-xl border p-5 transition-all duration-150 hover:border-white/20 cursor-pointer"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
              onClick={() => router.push(`/brands/${brand.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-base">{brand.name}</h3>
                  {brand.website && (
                    <p className="text-white/30 text-xs mt-0.5 truncate max-w-[200px]">{brand.website}</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(brand.id); }}
                  className="text-white/20 hover:text-red-400 text-xs transition-colors p-1"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>

              {brand.audience && (
                <div className="mb-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Аудитория</p>
                  <p className="text-white/60 text-xs line-clamp-2">{brand.audience}</p>
                </div>
              )}

              {brand.utp && (
                <div className="mb-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">УТП</p>
                  <p className="text-white/60 text-xs line-clamp-2">{brand.utp}</p>
                </div>
              )}

              {brand.tone_of_voice && (
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Тон</p>
                  <p className="text-white/60 text-xs line-clamp-1">{brand.tone_of_voice}</p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-white/20 text-[10px]">
                  {new Date(brand.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-6 max-h-[85vh] overflow-y-auto"
            style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Новый бренд</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
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
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white/50 border transition-colors hover:text-white/70 hover:border-white/20"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name?.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40"
                style={{ background: ACCENT, color: '#0A0A0A' }}
              >
                {saving ? 'Создание...' : 'Создать бренд'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
