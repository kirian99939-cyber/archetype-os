import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// POST — запустить генерацию и сохранить taskId
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { prompt, aspectRatio } = await req.json();

  const res = await fetch('https://api.nanobananaapi.ai/api/v1/nanobanana/generate-pro', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NANO_BANANA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, aspectRatio: aspectRatio || '1:1', resolution: '1K' }),
  });

  const data = await res.json();
  const taskId = data?.data?.taskId;
  if (!taskId) return NextResponse.json({ error: 'No taskId' }, { status: 500 });

  await supabase.from('banner_tasks').insert({
    task_id: taskId,
    user_id: token?.sub || null,
    fmt_key: 'test',
    prompt,
    status: 'pending',
  });

  return NextResponse.json({ taskId, message: 'Генерация запущена в фоне' });
}

// GET — получить последние задачи пользователя
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { data } = await supabase
    .from('banner_tasks')
    .select('*')
    .eq('user_id', token?.sub || '')
    .eq('fmt_key', 'test')
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({ tasks: data ?? [] });
}
