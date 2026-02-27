'use client';

import { useEffect } from 'react';
import { changelog, LATEST_VERSION } from '@/lib/changelog';

const ICON: Record<string, string> = {
  feature: '✨',
  fix: '🐛',
  improvement: '⚡',
};

const LS_KEY = 'changelog_seen_version';

/** Returns true if the user hasn't seen the latest changelog yet. */
export function hasUnseenChangelog(): boolean {
  try {
    return localStorage.getItem(LS_KEY) !== LATEST_VERSION;
  } catch {
    return false;
  }
}

/** Mark the latest changelog as seen. */
export function markChangelogSeen(): void {
  try {
    localStorage.setItem(LS_KEY, LATEST_VERSION);
  } catch {}
}

export default function ChangelogModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // Mark as seen when opened
  useEffect(() => {
    if (isOpen) markChangelogSeen();
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full"
        style={{
          maxWidth: 560,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: '#131313',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 32,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
          style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ✕
        </button>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-unbounded)',
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 24,
          }}
        >
          🚀 Что нового
        </h2>

        {/* Versions */}
        {changelog.map((entry, i) => (
          <div
            key={entry.version}
            style={{
              paddingBottom: 20,
              marginBottom: 20,
              borderBottom:
                i < changelog.length - 1
                  ? '1px solid rgba(255,255,255,0.06)'
                  : 'none',
            }}
          >
            {/* Version header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-md"
                style={{
                  background: 'rgba(200,255,0,0.1)',
                  color: '#C8FF00',
                  border: '1px solid rgba(200,255,0,0.2)',
                }}
              >
                v{entry.version}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                {entry.date}
              </span>
            </div>

            <p
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
                marginBottom: 10,
              }}
            >
              {entry.title}
            </p>

            {/* Items */}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {entry.items.map((item, j) => (
                <li
                  key={j}
                  className="flex items-start gap-2"
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 4,
                  }}
                >
                  <span className="shrink-0" style={{ width: 20, textAlign: 'center' }}>
                    {ICON[item.type]}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
