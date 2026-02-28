'use client';

import { useState, useEffect } from 'react';

const ACCENT = '#B5D334';
const ACCENT_BG = 'rgba(181,211,52,0.1)';
const ACCENT_BORDER = 'rgba(181,211,52,0.25)';

interface Milestone {
  count: number;
  bonus: number;
  label: string;
  reached: boolean;
  claimed: boolean;
}

interface ReferralEntry {
  email: string;
  date: string;
  creditsEarned: number;
}

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalCreditsEarned: number;
  referrals: ReferralEntry[];
  milestones: Milestone[];
  nextMilestone: { count: number; bonus: number; remaining: number } | null;
}

export default function ReferralDashboard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!stats) return;
    await navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    if (!stats) return;
    const text = 'Попробуй Креатику — AI делает рекламные баннеры за минуты. По моей ссылке получишь 200 кредитов!';
    window.open(`https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <span style={{ color: ACCENT, fontSize: '2rem' }}>...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/40 text-sm">Не удалось загрузить данные</p>
      </div>
    );
  }

  const maxMilestone = stats.milestones[stats.milestones.length - 1]?.count ?? 30;
  const progress = Math.min(stats.totalReferrals / maxMilestone, 1);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-white font-extrabold text-2xl mb-2">
          Приглашайте друзей — получайте кредиты
        </h2>
        <p className="text-white/50 text-sm">
          Вы и ваш друг получите по 100 кредитов
        </p>
      </div>

      {/* Referral link */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <p className="text-white/40 text-xs uppercase tracking-widest">Ваша реферальная ссылка</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={stats.referralLink}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white/80 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button
            onClick={handleCopy}
            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all shrink-0"
            style={{
              background: copied ? 'rgba(100,200,100,0.15)' : ACCENT_BG,
              border: `1px solid ${copied ? 'rgba(100,200,100,0.3)' : ACCENT_BORDER}`,
              color: copied ? '#6c6' : ACCENT,
            }}
          >
            {copied ? 'Скопировано \u2713' : 'Скопировать'}
          </button>
        </div>
        <button
          onClick={handleShareTelegram}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(0,136,204,0.12)', border: '1px solid rgba(0,136,204,0.25)', color: '#0088CC' }}
        >
          <span>✈</span> Поделиться в Telegram
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-2xl mb-2">👥</div>
          <p className="text-white font-bold text-2xl">{stats.totalReferrals}</p>
          <p className="text-white/40 text-xs mt-1">Приглашено</p>
        </div>
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-2xl mb-2">💰</div>
          <p className="text-white font-bold text-2xl">{stats.totalCreditsEarned.toLocaleString('ru-RU')}</p>
          <p className="text-white/40 text-xs mt-1">Заработано кредитов</p>
        </div>
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-2xl mb-2">🎯</div>
          <p className="text-white font-bold text-2xl">
            {stats.nextMilestone ? stats.nextMilestone.remaining : '—'}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {stats.nextMilestone ? 'До следующего бонуса' : 'Все бонусы получены!'}
          </p>
        </div>
      </div>

      {/* Milestone progress */}
      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <p className="text-white/40 text-xs uppercase tracking-widest">Бонусные этапы</p>

        {/* Progress bar */}
        <div className="relative">
          <div
            className="h-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ background: ACCENT, width: `${progress * 100}%` }}
            />
          </div>

          {/* Milestone dots */}
          <div className="flex justify-between mt-1">
            {stats.milestones.map(m => {
              const pos = (m.count / maxMilestone) * 100;
              return (
                <div
                  key={m.count}
                  className="flex flex-col items-center"
                  style={{ position: 'absolute', left: `${pos}%`, transform: 'translateX(-50%)', top: -4 }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: m.reached ? ACCENT : 'rgba(255,255,255,0.1)',
                      color: m.reached ? '#0A0A0A' : 'rgba(255,255,255,0.3)',
                      border: m.reached ? 'none' : '2px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    {m.reached ? '\u2713' : m.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestone cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {stats.milestones.map(m => (
            <div
              key={m.count}
              className="rounded-xl p-4"
              style={{
                background: m.reached ? ACCENT_BG : 'rgba(255,255,255,0.02)',
                border: `1px solid ${m.reached ? ACCENT_BORDER : 'rgba(255,255,255,0.06)'}`,
                opacity: m.reached ? 1 : 0.6,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{m.reached ? '\u2705' : '\u23F3'}</span>
                <span className="text-white font-semibold text-sm">{m.label}</span>
              </div>
              <p className="text-xs" style={{ color: m.reached ? ACCENT : 'rgba(255,255,255,0.35)' }}>
                +{m.bonus.toLocaleString('ru-RU')} кредитов
              </p>
              {!m.reached && stats.nextMilestone?.count === m.count && (
                <p className="text-white/30 text-[11px] mt-1">
                  ещё {stats.nextMilestone.remaining} чел.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Referrals table */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <p className="text-white/40 text-xs uppercase tracking-widest">Ваши рефералы</p>

        {stats.referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3 opacity-30">👥</div>
            <p className="text-white/30 text-sm">
              Пока никого не пригласили. Поделитесь ссылкой!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/30 text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Email</th>
                  <th className="text-left py-2 pr-4">Дата</th>
                  <th className="text-right py-2">Кредиты</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-2.5 pr-4 text-white/60">{r.email}</td>
                    <td className="py-2.5 pr-4 text-white/40">{r.date}</td>
                    <td className="py-2.5 text-right font-semibold" style={{ color: ACCENT }}>
                      +{r.creditsEarned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
