'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.2)';

const LS_DEFAULTS_KEY = 'archetype_brief_defaults';

const PLATFORM_OPTIONS = ['Instagram', 'TikTok', 'VK', 'Facebook', 'YouTube', 'Pinterest', 'Google Display'];
const VISUAL_MODES = [
  { value: 'ai', label: '🤖 Сгенерировать AI', desc: 'Нейросеть создаст визуал с нуля' },
  { value: 'photo', label: '📸 Загрузить фото', desc: 'Использовать своё фото продукта' },
  { value: 'link', label: '🔗 Вставить ссылку', desc: 'Указать URL готового изображения' },
];

interface BriefDefaults {
  company: string;
  audience: string;
  platforms: string[];
  visualMode: string;
}

const EMPTY_DEFAULTS: BriefDefaults = {
  company: '',
  audience: '',
  platforms: [],
  visualMode: '',
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [defaults, setDefaults] = useState<BriefDefaults>(EMPTY_DEFAULTS);
  const [saved, setSaved] = useState(false);

  // Загрузка дефолтов из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_DEFAULTS_KEY);
      if (raw) setDefaults(JSON.parse(raw));
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem(LS_DEFAULTS_KEY, JSON.stringify(defaults));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDefaults(EMPTY_DEFAULTS);
    localStorage.removeItem(LS_DEFAULTS_KEY);
    setSaved(false);
  };

  const togglePlatform = (p: string) => {
    setDefaults((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl">

      {/* ──────────── ПРОФИЛЬ ──────────── */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-4">Профиль</p>
        <div
          className="rounded-xl border border-white/10 p-6"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-center gap-4 mb-5">
            {user?.image ? (
              <img
                src={user.image}
                alt="avatar"
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: ACCENT_BG, color: ACCENT }}
              >
                {user?.name?.[0] || '?'}
              </div>
            )}
            <div>
              <p className="text-white font-medium">{user?.name || 'Пользователь'}</p>
              <p className="text-white/40 text-sm">{user?.email || ''}</p>
            </div>
          </div>

          {/* Кредиты */}
          <div
            className="rounded-lg p-4 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <p className="text-white/50 text-xs mb-1">Баланс кредитов</p>
              <p className="text-2xl font-bold" style={{ color: ACCENT }}>
                {user?.credits ?? '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/30 text-xs leading-relaxed">
                1 кредит = 1 пакет баннеров<br />
                (все форматы за раз)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── ДЕФОЛТЫ БРИФА ──────────── */}
      <section>
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">Шаблон брифа</p>
        <p className="text-white/20 text-xs mb-4">
          Эти значения будут автоматически подставляться при создании нового проекта
        </p>

        <div
          className="rounded-xl border border-white/10 p-6 flex flex-col gap-5"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {/* Компания */}
          <div>
            <label className="text-white/50 text-xs mb-1.5 block">Название компании / бренда</label>
            <input
              type="text"
              value={defaults.company}
              onChange={(e) => setDefaults({ ...defaults, company: e.target.value })}
              placeholder="Например: FitFlow"
              className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT_BORDER; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
          </div>

          {/* Аудитория */}
          <div>
            <label className="text-white/50 text-xs mb-1.5 block">Целевая аудитория по умолчанию</label>
            <input
              type="text"
              value={defaults.audience}
              onChange={(e) => setDefaults({ ...defaults, audience: e.target.value })}
              placeholder="Например: Женщины 25–40, интересуются фитнесом"
              className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT_BORDER; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
          </div>

          {/* Платформы */}
          <div>
            <label className="text-white/50 text-xs mb-2 block">Предпочитаемые платформы</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => {
                const active = defaults.platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: active ? ACCENT_BG : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? ACCENT_BORDER : 'rgba(255,255,255,0.08)'}`,
                      color: active ? ACCENT : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Визуальный режим */}
          <div>
            <label className="text-white/50 text-xs mb-2 block">Визуал по умолчанию</label>
            <div className="flex flex-col gap-2">
              {VISUAL_MODES.map((m) => {
                const active = defaults.visualMode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setDefaults({ ...defaults, visualMode: active ? '' : m.value })}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                    style={{
                      background: active ? ACCENT_BG : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? ACCENT_BORDER : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <span className="text-sm">{m.label}</span>
                    <span className="text-white/25 text-xs ml-auto">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: ACCENT,
                color: '#0A0A0A',
              }}
            >
              {saved ? '✓ Сохранено' : 'Сохранить'}
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Сбросить
            </button>
          </div>
        </div>
      </section>

      {/* ──────────── ВЫХОД ──────────── */}
      <section>
        <div
          className="rounded-xl border border-white/10 p-6 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div>
            <p className="text-white text-sm font-medium">Выйти из аккаунта</p>
            <p className="text-white/30 text-xs mt-0.5">Вы сможете войти снова через Google</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/landing' })}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(255,80,80,0.1)',
              color: 'rgba(255,100,100,0.9)',
              border: '1px solid rgba(255,80,80,0.2)',
            }}
          >
            Выйти
          </button>
        </div>
      </section>

      {/* Версия */}
      <p className="text-white/15 text-xs text-center pb-4">
        Архетип-Протокол v1.0 · Powered by Claude & NanoBanana
      </p>
    </div>
  );
}
