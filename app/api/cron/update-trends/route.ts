import { NextRequest, NextResponse } from 'next/server';
import { refreshTrends } from '@/lib/trends';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Vercel Cron передаёт Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await refreshTrends();
    return NextResponse.json({
      success: true,
      trendsUpdated: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/update-trends] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
