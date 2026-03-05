import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.NANO_BANANA_API_KEY) {
      return NextResponse.json(
        { error: 'NANO_BANANA_API_KEY is not set in environment variables' },
        { status: 500 }
      );
    }

    const taskId = req.nextUrl.searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `NanoBanana status error (${res.status}): ${res.statusText}` },
        { status: res.status }
      );
    }

    const statusData = await res.json();
    console.log('[NanoBanana] record-info full response:', JSON.stringify(statusData, null, 2));

    const imageUrl = statusData.data?.response?.resultImageUrl || statusData.data?.result_urls?.[0];
    const isReady = !!imageUrl;

    return NextResponse.json({ ready: isReady, imageUrl });
  } catch (error) {
    console.error('Banner status API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
