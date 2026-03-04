'use client';

import { useState, useEffect } from 'react';

const ACCENT = '#C8FF00';
const ACCENT_BG = 'rgba(200,255,0,0.1)';
const ACCENT_BORDER = 'rgba(200,255,0,0.25)';
const GOLD = '#FFD700';
const GOLD_BG = 'rgba(255,215,0,0.1)';
const GOLD_BORDER = 'rgba(255,215,0,0.25)';

interface Earning {
  id: string;
  referred_user_email: string;
  payment_amount: number;
  commission: number;
  paid_out: boolean;
  created_at: string;
}

interface GoldenProfile {
  id: string;
  email: string;
  name: string;
  referral_code: string;
  referralLink: string;
  earnings: Earning[];
  totalEarned: number;
  totalPaid: number;
  pending: number;
  isGolden: boolean;
}

export default function GoldenPage() {
  const [profile, setProfile] = useState<GoldenProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGolden, setIsGolden] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral/golden')
      .then(res => res.json())
      .then(data => {
        if (data.isGolden) {
          setProfile(data);
          setIsGolden(true);
        } else {
          setIsGolden(false);
        }
      })
      .catch(() => setIsGolden(false))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <span style={{ color: GOLD, fontSize: '2rem' }}>...</span>
      </div>
    );
  }

  if (!isGolden || !profile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="text-5xl mb-4 opacity-30">🔒</div>
        <h2 className="text-white font-bold text-xl mb-2">Закрытый раздел</h2>
        <p className="text-white/40 text-sm">
          Золотые кабинеты доступны только для партнёров программы
        </p>
      </div>
    );
  }

  const uniqueReferrals = new Set(profile.earnings.map(e => e.referred_user_email)).size;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-3">👑</div>
        <h2 className="text-white font-extrabold text-2xl mb-2">
          Золотой кабинет
        </h2>
        <p className="text-white/50 text-sm">
          25% комиссия от каждого платежа ваших рефералов
        </p>
      </div>

      {/* Referral link */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>
          Ваша реферальная ссылка
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={profile.referralLink}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white/80 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button
            onClick={handleCopy}
            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all shrink-0"
            style={{
              background: copied ? 'rgba(100,200,100,0.15)' : GOLD_BG,
              border: `1px solid ${copied ? 'rgba(100,200,100,0.3)' : GOLD_BORDER}`,
              color: copied ? '#6c6' : GOLD,
            }}
          >
            {copied ? 'Скопировано \u2713' : 'Скопировать'}
          </button>
        </div>
        <p className="text-white/30 text-xs">
          Код: <span className="font-mono" style={{ color: GOLD }}>{profile.referral_code}</span>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-2xl mb-2">👥</div>
          <p className="text-white font-bold text-2xl">{uniqueReferrals}</p>
          <p className="text-white/40 text-xs mt-1">Рефералов привёл</p>
        </div>
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-2xl mb-2">💰</div>
          <p className="font-bold text-2xl" style={{ color: GOLD }}>
            {profile.totalEarned.toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-white/40 text-xs mt-1">Заработано всего</p>
        </div>
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-2xl mb-2">⏳</div>
          <p className="font-bold text-2xl" style={{ color: ACCENT }}>
            {profile.pending.toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-white/40 text-xs mt-1">Ожидает выплаты</p>
        </div>
      </div>

      {/* Earnings table */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <p className="text-white/40 text-xs uppercase tracking-widest">Начисления</p>

        {profile.earnings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3 opacity-30">💸</div>
            <p className="text-white/30 text-sm">
              Пока нет начислений. Поделитесь ссылкой!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/30 text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Дата</th>
                  <th className="text-left py-2 pr-4">Email реферала</th>
                  <th className="text-right py-2 pr-4">Платёж</th>
                  <th className="text-right py-2 pr-4">Комиссия 25%</th>
                  <th className="text-center py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {profile.earnings.map((e) => (
                  <tr key={e.id} className="border-t border-white/5">
                    <td className="py-2.5 pr-4 text-white/40 text-xs">
                      {new Date(e.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-2.5 pr-4 text-white/60">{e.referred_user_email}</td>
                    <td className="py-2.5 pr-4 text-right text-white/50">
                      {e.payment_amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold" style={{ color: GOLD }}>
                      +{e.commission.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: e.paid_out ? 'rgba(100,200,100,0.1)' : 'rgba(245,158,11,0.1)',
                          color: e.paid_out ? '#6c6' : '#f59e0b',
                        }}
                      >
                        {e.paid_out ? 'Выплачено' : 'Ожидает'}
                      </span>
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
