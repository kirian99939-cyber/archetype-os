import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = ['kirian99939@gmail.com'];

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || !ADMIN_EMAILS.includes(token.email as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  // Все проекты с баннерами
  const { data: projects, error } = await supabaseAdmin
    .from('projects')
    .select('id, title, user_id, banners, archetypes, hypotheses, brief, updated_at')
    .not('banners', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Юзеры
  const userIds = Array.from(new Set((projects || []).map(p => p.user_id)));
  const { data: users } = userIds.length > 0
    ? await supabaseAdmin.from('users').select('id, email, name, avatar_url').in('id', userIds)
    : { data: [] };

  const usersMap = new Map((users || []).map(u => [u.id, u]));

  // Собираем плоский список баннеров
  interface FlatBanner {
    imageUrl: string | null;
    format: string;
    formatLabel: string;
    hypothesisTitle: string;
    archetype: string;
    projectId: string;
    projectTitle: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    createdAt: string;
  }

  const allBanners: FlatBanner[] = [];

  for (const project of (projects || [])) {
    const bannerGroups = Array.isArray(project.banners) ? project.banners : [];
    const user = usersMap.get(project.user_id);
    const mainArchetype = project.archetypes?.[0]?.label || project.archetypes?.[0]?.id || '';

    for (const group of bannerGroups) {
      const banners = Array.isArray(group.banners) ? group.banners : [];
      for (const b of banners) {
        if (!b.imageUrl) continue; // пропускаем баннеры без картинки
        allBanners.push({
          imageUrl: b.imageUrl,
          format: b.key || '',
          formatLabel: b.label || b.sublabel || b.key || '',
          hypothesisTitle: group.hypothesisTitle || '',
          archetype: mainArchetype,
          projectId: project.id,
          projectTitle: project.title || project.brief?.product || 'Без названия',
          userId: project.user_id,
          userName: user?.name || user?.email || 'Unknown',
          userAvatar: user?.avatar_url || null,
          createdAt: project.updated_at,
        });
      }
    }
  }

  // Пагинация (уже отсортировано по updated_at desc)
  const paginated = allBanners.slice(offset, offset + limit);

  return NextResponse.json({
    banners: paginated,
    total: allBanners.length,
    page,
    totalPages: Math.ceil(allBanners.length / limit),
  });
}
