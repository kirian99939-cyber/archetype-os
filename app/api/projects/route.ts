import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, saveProject, getProjects, type ProjectPayload } from '@/lib/supabase';

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log('[projects] getToken result:', { email: token?.email ?? null, hasToken: !!token });

  if (!token?.email) return null;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', token.email)
    .maybeSingle();

  console.log('[projects] users lookup:', { email: token.email, found: !!data, id: data?.id ?? null, error: error?.message ?? null });
  return data?.id ?? null;
}

/** POST /api/projects — создать новый проект */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    console.log('[projects POST] no userId — returning 401');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: ProjectPayload = await req.json();
  console.log('[projects POST] creating project for userId:', userId, 'title:', body.title);
  const id = await saveProject(userId, body);
  console.log('[projects POST] saveProject result:', id);
  if (!id) return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });

  return NextResponse.json({ id });
}

/** GET /api/projects — список проектов текущего пользователя */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await getProjects(userId);
  return NextResponse.json(projects);
}
