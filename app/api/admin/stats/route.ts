import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = ['kirian99939@gmail.com'];

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || !ADMIN_EMAILS.includes(token.email as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Пользователи
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, name, credits, created_at')
    .order('created_at', { ascending: false });

  // Проекты
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, user_id, status, created_at, updated_at, banners, banner_history')
    .order('created_at', { ascending: false });

  const allUsers = users || [];
  const allProjects = projects || [];

  // Метрики по юзерам
  const totalUsers = allUsers.length;
  const totalCreditsRemaining = allUsers.reduce((sum, u) => sum + (u.credits || 0), 0);
  const initialCredits = totalUsers * 3; // каждый получил 3 при регистрации
  const creditsSpent = initialCredits - totalCreditsRemaining;

  // Активные (создали хотя бы 1 проект)
  const activeUserIds = new Set(allProjects.map(p => p.user_id));
  const activeUsers = activeUserIds.size;

  // Проекты
  const completedProjects = allProjects.filter(p => p.status === 'completed').length;

  // Баннеры
  let totalBanners = 0;
  allProjects.forEach(p => {
    if (Array.isArray(p.banner_history)) {
      p.banner_history.forEach((iter: any) => {
        if (Array.isArray(iter.bannerGroups)) {
          iter.bannerGroups.forEach((g: any) => {
            if (Array.isArray(g.banners)) {
              totalBanners += g.banners.filter((b: any) => b.imageUrl).length;
            }
          });
        }
      });
    } else if (Array.isArray(p.banners)) {
      p.banners.forEach((g: any) => {
        if (Array.isArray(g.banners)) {
          totalBanners += g.banners.filter((b: any) => b.imageUrl).length;
        }
      });
    }
  });

  // Регистрации по дням (последние 30 дней)
  const registrationsByDay: Record<string, number> = {};
  allUsers.forEach(u => {
    const day = new Date(u.created_at).toISOString().split('T')[0];
    registrationsByDay[day] = (registrationsByDay[day] || 0) + 1;
  });

  // Проекты по дням
  const projectsByDay: Record<string, number> = {};
  allProjects.forEach(p => {
    const day = new Date(p.created_at).toISOString().split('T')[0];
    projectsByDay[day] = (projectsByDay[day] || 0) + 1;
  });

  // Расход API (оценка: ~150₽ за кредит)
  const estimatedApiCost = creditsSpent * 150;

  return NextResponse.json({
    users: {
      total: totalUsers,
      active: activeUsers,
      list: allUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        credits: u.credits,
        createdAt: u.created_at,
        projectCount: allProjects.filter(p => p.user_id === u.id).length,
        completedCount: allProjects.filter(p => p.user_id === u.id && p.status === 'completed').length,
      })),
    },
    projects: {
      total: allProjects.length,
      completed: completedProjects,
      byDay: projectsByDay,
    },
    banners: {
      total: totalBanners,
    },
    credits: {
      initialTotal: initialCredits,
      spent: creditsSpent,
      remaining: totalCreditsRemaining,
    },
    finance: {
      estimatedApiCost,
      registrationsByDay,
    },
  });
}
