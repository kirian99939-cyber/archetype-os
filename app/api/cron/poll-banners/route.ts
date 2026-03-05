import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Берём все pending задачи
  const { data: tasks } = await supabase
    .from('banner_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let done = 0;
  let failed = 0;

  await Promise.all(tasks.map(async (task) => {
    try {
      const res = await fetch(
        `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${task.task_id}`,
        { headers: { Authorization: `Bearer ${process.env.NANO_BANANA_API_KEY}` } }
      );
      const data = await res.json();
      const imageUrl = data.data?.response?.resultImageUrl;
      const successFlag = data.data?.successFlag;

      if (successFlag === 1 && imageUrl) {
        await supabase
          .from('banner_tasks')
          .update({ status: 'done', image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq('task_id', task.task_id);
        done++;
      } else if (successFlag === 2 || successFlag === 3) {
        await supabase
          .from('banner_tasks')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('task_id', task.task_id);
        failed++;
      }
      // successFlag === 0 — ещё генерируется, оставляем pending
    } catch (err) {
      console.error('[poll-banners] Error polling task:', task.task_id, err);
    }
  }));

  return NextResponse.json({ ok: true, processed: tasks.length, done, failed });
}
