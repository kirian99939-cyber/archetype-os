import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from './supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface Trend {
  category: string;
  trend: string;
  description: string;
  relevance_score: number;
}

/**
 * Вызывает Claude с web search, парсит тренды, сохраняет в Supabase.
 * Возвращает количество обновлённых трендов.
 */
export async function refreshTrends(): Promise<number> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305' as any, name: 'web_search' } as any],
    messages: [{
      role: 'user',
      content: `Найди актуальные тренды за последнюю неделю для рекламных креативов в России и СНГ.

Ищи по категориям:
1. Поп-культура (pop_culture): новые фильмы, сериалы, релизы, вирусные моменты
2. Музыка (music): новые треки, артисты, вирусные звуки
3. Мемы и интернет (memes): свежие мемы, форматы, челленджи
4. Общество (society): обсуждаемые темы, события, дискуссии
5. Визуальные тренды (visual): стили дизайна, эстетики
6. Поведенческие (behavioral): привычки, lifestyle-тренды
7. Игры (gaming): релизы, стримеры, гейминг-культура
8. Технологии (tech): AI, гаджеты, приложения

Для каждого тренда укажи:
- category: один из ключей выше (pop_culture, music, memes, society, visual, behavioral, gaming, tech)
- trend: название тренда (3-7 слов)
- description: как бренд может использовать (1 предложение)
- relevance_score: оценка актуальности 1-10

Верни ТОЛЬКО JSON массив без пояснений:
[{"category":"...","trend":"...","description":"...","relevance_score":8}]

Найди минимум 20 трендов, максимум 40.`,
    }],
  });

  // Извлекаем текст
  const textContent = response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('');

  // Парсим JSON
  const jsonMatch = textContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array in Claude response');

  const trends: Trend[] = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(trends) || trends.length === 0) {
    throw new Error('Empty trends array');
  }

  // Удаляем просроченные тренды
  await supabaseAdmin
    .from('trends')
    .delete()
    .lt('expires_at', new Date().toISOString());

  // Вставляем новые (upsert по trend)
  const trendRows = trends.map((t) => ({
    category: t.category || 'other',
    trend: t.trend,
    description: t.description || '',
    relevance_score: t.relevance_score || 5,
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { data, error } = await supabaseAdmin
    .from('trends')
    .upsert(trendRows, { onConflict: 'trend' })
    .select('id');

  if (error) throw new Error(`Supabase upsert error: ${error.message}`);

  return data?.length || 0;
}

/**
 * Загружает актуальные тренды из базы.
 */
export async function getActiveTrends(limit = 30): Promise<Trend[]> {
  const { data } = await supabaseAdmin
    .from('trends')
    .select('category, trend, description, relevance_score')
    .gte('expires_at', new Date().toISOString())
    .order('relevance_score', { ascending: false })
    .limit(limit);

  return (data as Trend[]) || [];
}
