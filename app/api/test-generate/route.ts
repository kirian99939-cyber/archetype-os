import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const { prompt } = await request.json();

  console.log('[test-generate] Starting with prompt:', prompt?.substring(0, 50));

  // 1. Отправляем в NanoBanana
  const res = await fetch('https://api.nanobananaapi.ai/api/v1/nanobanana/generate-pro', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspectRatio: '1:1',
      resolution: '2K',
      callBackUrl: 'https://archetype-os-tau.vercel.app/api/nanobanana-callback',
    }),
  });

  const data = await res.json();
  console.log('[test-generate] NanoBanana response:', JSON.stringify(data));

  const taskId = data?.data?.taskId;
  if (!taskId) {
    return NextResponse.json({ error: 'No taskId', raw: data }, { status: 500 });
  }

  // 2. Поллим record-info до 60 секунд
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000));

    const statusRes = await fetch(
      `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NANO_BANANA_API_KEY}`,
        },
      }
    );

    const statusData = await statusRes.json();
    console.log(`[test-generate] Poll ${i+1}:`, JSON.stringify(statusData));

    // Проверяем ВСЕ возможные поля
    const imageUrl = statusData.data?.response?.resultImageUrl
      || statusData.data?.imageUrl
      || statusData.data?.result_urls?.[0];
    const successFlag = statusData.data?.successFlag;

    if (successFlag === 1 && imageUrl) {
      return NextResponse.json({ success: true, imageUrl, taskId, polls: i+1 });
    }

    if (successFlag === 2 || successFlag === 3) {
      return NextResponse.json({ error: 'Generation failed', taskId, statusData });
    }
  }

  return NextResponse.json({
    error: 'Timeout after 60s',
    taskId,
    message: 'record-info never returned successFlag=1'
  });
}
