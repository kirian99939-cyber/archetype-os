import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, type ProjectPayload } from '@/lib/supabase';

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;

  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', token.email)
    .maybeSingle();

  return data?.id ?? null;
}

/** GET /api/projects/[id] — получить один проект */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)   // ownership check
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

/** PATCH /api/projects/[id] — обновить проект */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: ProjectPayload = await req.json();

  const { error } = await supabaseAdmin
    .from('projects')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', userId);  // ownership check

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
