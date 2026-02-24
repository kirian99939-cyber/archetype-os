import type { GenerateBannerRequest } from '@/app/api/generate-banner/route';

const MAX_POLL = 20;
const POLL_INTERVAL_MS = 5000;

export async function generateBanner(data: GenerateBannerRequest): Promise<{ imageUrl: string; prompt: string }> {
  // Шаг 1 — запустить задачу
  const res = await fetch('/api/generate-banner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const { taskId, prompt } = await res.json();
  if (!taskId) throw new Error('No taskId returned');

  // Шаг 2 — polling статуса
  for (let attempt = 1; attempt <= MAX_POLL; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const statusRes = await fetch(`/api/banner-status?taskId=${taskId}`);
    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `Status HTTP ${statusRes.status}`);
    }

    const statusData = await statusRes.json();
    if (statusData.ready && statusData.imageUrl) {
      return { imageUrl: statusData.imageUrl, prompt };
    }
  }

  throw new Error(`Timeout: image not ready after ${MAX_POLL} attempts`);
}

export function base64ToDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}
