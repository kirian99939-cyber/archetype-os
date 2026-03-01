import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = ['kirian99939@gmail.com'];

/** Себестоимость 1 баннера: Claude ~10.8₽ + NanoBanana ~8.4₽ */
const COST_PER_BANNER = 19;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || !ADMIN_EMAILS.includes(token.email as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: projects }, { data: users }] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id, user_id, status, banners, banner_history, created_at')
      .gte('created_at', monthAgo)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('users')
      .select('id, email, credits, created_at'),
  ]);

  const allProjects = projects || [];
  const allUsers = users || [];

  // Заполняем 30 дней
  const dailyStats: Record<string, {
    banners: number;
    projects: number;
    newUsers: number;
    creditsSpent: number;
  }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyStats[key] = { banners: 0, projects: 0, newUsers: 0, creditsSpent: 0 };
  }

  // Проекты и баннеры по дням
  for (const project of allProjects) {
    const day = project.created_at?.split('T')[0];
    if (!dailyStats[day]) continue;

    dailyStats[day].projects++;

    // Считаем баннеры из banner_history (основной источник)
    let bannerCount = 0;
    if (Array.isArray(project.banner_history)) {
      project.banner_history.forEach((iter: any) => {
        if (Array.isArray(iter.bannerGroups)) {
          iter.bannerGroups.forEach((g: any) => {
            if (Array.isArray(g.banners)) {
              bannerCount += g.banners.filter((b: any) => b.imageUrl).length;
            }
          });
        }
      });
    } else if (Array.isArray(project.banners)) {
      project.banners.forEach((g: any) => {
        if (Array.isArray(g.banners)) {
          bannerCount += g.banners.filter((b: any) => b.imageUrl).length;
        }
      });
    }
    dailyStats[day].banners += bannerCount;
  }

  // Новые пользователи по дням
  for (const user of allUsers) {
    const day = user.created_at?.split('T')[0];
    if (dailyStats[day]) {
      dailyStats[day].newUsers++;
    }
  }

  // Кредиты: 10 кр за баннер
  for (const day of Object.keys(dailyStats)) {
    dailyStats[day].creditsSpent = dailyStats[day].banners * 10;
  }

  // Суммирование
  const days = Object.entries(dailyStats).sort(([a], [b]) => a.localeCompare(b));
  const todayKey = now.toISOString().split('T')[0];

  const sum = (slice: [string, typeof dailyStats[string]][]) =>
    slice.reduce(
      (acc, [, d]) => ({
        banners: acc.banners + d.banners,
        projects: acc.projects + d.projects,
        newUsers: acc.newUsers + d.newUsers,
        creditsSpent: acc.creditsSpent + d.creditsSpent,
      }),
      { banners: 0, projects: 0, newUsers: 0, creditsSpent: 0 },
    );

  const todayData = dailyStats[todayKey] || { banners: 0, projects: 0, newUsers: 0, creditsSpent: 0 };
  const weekData = sum(days.slice(-7));
  const monthData = sum(days);

  return NextResponse.json({
    today: { ...todayData, estimatedCostRub: todayData.banners * COST_PER_BANNER },
    week: { ...weekData, estimatedCostRub: weekData.banners * COST_PER_BANNER },
    month: { ...monthData, estimatedCostRub: monthData.banners * COST_PER_BANNER },
    daily: days.map(([date, data]) => ({
      date,
      ...data,
      estimatedCostRub: data.banners * COST_PER_BANNER,
    })),
    totals: {
      totalUsers: allUsers.length,
      usersWithZeroCredits: allUsers.filter(u => u.credits === 0).length,
    },
  });
}
