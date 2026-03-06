import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, saveProject, getProjects, type ProjectPayload } from '@/lib/supabase';

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

/** POST /api/projects — создать новый проект */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: ProjectPayload = await req.json();

  // Auto-create brand from brief if brand_id not provided
  if (!body.brand_id && body.brief) {
    const brief = body.brief as Record<string, any>;
    const productName = (brief.product || '').trim();

    if (productName) {
      // Check if brand with same name already exists for this user
      const { data: existing } = await supabaseAdmin
        .from('brands')
        .select('id')
        .eq('user_id', userId)
        .eq('name', productName)
        .maybeSingle();

      if (existing) {
        body.brand_id = existing.id;
      } else {
        const { data: newBrand } = await supabaseAdmin
          .from('brands')
          .insert({
            user_id: userId,
            name: productName,
            audience: brief.audience || null,
            utp: brief.utp || null,
            tone_of_voice: brief.toneOfVoice || null,
            context: brief.context || null,
          })
          .select('id')
          .single();

        if (newBrand) {
          body.brand_id = newBrand.id;
        }
      }
    }
  }

  const id = await saveProject(userId, body);
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
