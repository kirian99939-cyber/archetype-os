'use client';

import { useState, useEffect } from 'react';

const ACCENT = '#C8FF00';
const STORAGE_KEY = 'google_api_key';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? '';
    setApiKey(stored);
    setSaved(stored);
  }, []);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setSaved(trimmed);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setSaved('');
  };

  const isConnected = saved.length > 0;
  const isDirty = apiKey.trim() !== saved;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl mb-1">Настройки</h2>
        <p className="text-white/40 text-sm">Управление API-ключами и подключениями</p>
      </div>

      {/* Status card */}
      <div
        className="rounded-xl p-4 border mb-6 flex items-center gap-3"
        style={{
          background: isConnected ? 'rgba(200,255,0,0.05)' : 'rgba(255,255,255,0.03)',
          borderColor: isConnected ? 'rgba(200,255,0,0.25)' : 'rgba(255,255,255,0.1)',
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            background: isConnected ? ACCENT : 'rgba(255,255,255,0.2)',
            boxShadow: isConnected ? `0 0 8px ${ACCENT}` : 'none',
          }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: isConnected ? ACCENT : 'rgba(255,255,255,0.4)' }}>
            {isConnected ? 'Google API подключён' : 'Google API не подключён'}
          </p>
          {isConnected && (
            <p className="text-xs text-white/30 mt-0.5">
              Ключ: {saved.slice(0, 8)}••••{saved.slice(-4)}
            </p>
          )}
        </div>
      </div>

      {/* API Key field */}
      <div
        className="rounded-xl p-5 border border-white/10"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <label className="block text-sm font-medium text-white mb-1">
          Google API Key
        </label>
        <p className="text-xs text-white/30 mb-3">
          Используется для генерации баннеров через Gemini. Сохраняется в localStorage вашего браузера.
        </p>

        <div className="relative mb-4">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(200,255,0,0.4)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs"
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty && !justSaved}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: justSaved ? 'rgba(200,255,0,0.2)' : ACCENT,
              color: justSaved ? ACCENT : '#000',
              opacity: (!isDirty && !justSaved) ? 0.4 : 1,
              cursor: (!isDirty && !justSaved) ? 'not-allowed' : 'pointer',
            }}
          >
            {justSaved ? '✓ Сохранено' : 'Сохранить'}
          </button>

          {isConnected && (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,100,100,0.7)',
                border: '1px solid rgba(255,100,100,0.2)',
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* Info block */}
      <div
        className="rounded-xl p-4 border border-white/10 mt-4 text-xs text-white/30 leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <p className="font-medium text-white/50 mb-1">Где получить ключ?</p>
        <p>Перейдите в Google AI Studio → Get API Key. Ключ начинается с «AIza».</p>
        <p className="mt-1">Ключ хранится только в вашем браузере и никуда не отправляется.</p>
      </div>
    </div>
  );
}
