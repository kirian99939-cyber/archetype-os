import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = ['kirian99939@gmail.com'];

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || !ADMIN_EMAILS.includes(token.email as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, email, name, avatar_url, credits, created_at')
    .order('created_at', { ascending: false });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, user_id, status, banners, banner_history, created_at');

  const allProjects = projects || [];

  const enrichedUsers = (users || []).map(user => {
    const userProjects = allProjects.filter(p => p.user_id === user.id);
    const totalProjects = userProjects.length;
    const completedProjects = userProjects.filter(p => p.status === 'completed').length;

    let totalBanners = 0;
    userProjects.forEach(p => {
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

    const lastProjectDate = userProjects
      .map(p => p.created_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      credits: user.credits,
      createdAt: user.created_at,
      totalProjects,
      completedProjects,
      totalBanners,
      lastActive: lastProjectDate || user.created_at,
    };
  });

  return NextResponse.json({ users: enrichedUsers });
}
