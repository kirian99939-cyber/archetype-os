import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ARCHETYPES, ARCHETYPE_NAMES_LIST } from '@/lib/archetypes';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalyzeRequest {
  action?: 'generate-offer' | 'suggest-archetype' | 'generate-hypotheses';
  // Для generate-hypotheses: выбранный архетип
  selectedArchetype?: { id: string; label: string };
  // Legacy format (ArchetypeAnalyzer)
  productDescription?: string;
  targetAudience?: string;
  brandValues?: string;
  // Brief format (NewProject)
  product?: string;
  price?: string;
  audience?: string;
  goal?: string;
  utp?: string;
  offer?: string;
  platforms?: string[];
  context?: string;
}

export interface OfferResponse {
  offers: string[];
}

export interface Archetype {
  name: string;
  description: string;
  matchScore: number;
  keywords: string[];
}

export interface Hypothesis {
  title: string;
  rationale: string;
  cta: string;
  tone: string;
}

export interface NewHypothesis {
  idea: string;
  visual: string;
  headline: string;
  cta: string;
  hook: string;
}

export interface AnalyzeResponse {
  archetypes: Archetype[];
  hypotheses: Hypothesis[];
  newHypotheses: NewHypothesis[];
  positioning: string;
  primaryArchetype: string;
}

const SYSTEM_PROMPT = `Ты — эксперт по бренд-стратегии и маркетингу, специализирующийся на теории архетипов.

26 архетипов бренда: ${ARCHETYPE_NAMES_LIST}.

Для каждого запроса:
1. Определи 3 наиболее подходящих архетипа из списка с процентом соответствия (0–100)
2. Сгенерируй 4 маркетинговые гипотезы в формате «hypotheses»
3. Сгенерируй ровно 3 маркетинговые гипотезы в формате «newHypotheses»
4. Сформулируй позиционирование бренда (1–2 предложения)

Отвечай ТОЛЬКО валидным JSON строго в формате:
{
  "archetypes": [
    {
      "name": "Точное название из списка 26",
      "description": "Как этот архетип проявляется в данном бренде",
      "matchScore": 85,
      "keywords": ["слово1", "слово2", "слово3"]
    }
  ],
  "hypotheses": [
    {
      "title": "Название гипотезы",
      "rationale": "Обоснование почему это сработает",
      "cta": "Призыв к действию",
      "tone": "Тон коммуникации"
    }
  ],
  "newHypotheses": [
    {
      "idea": "Идея кампании одним ёмким предложением",
      "visual": "Описание визуала: что изображено, стиль, настроение, цвета",
      "headline": "Заголовок рекламного объявления",
      "cta": "Текст кнопки или призыв к действию",
      "hook": "Первая фраза-крючок для захвата внимания аудитории"
    }
  ],
  "positioning": "Краткое позиционирование бренда",
  "primaryArchetype": "Основной архетип (точное название из списка)"
}`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not set in environment variables' },
        { status: 500 }
      );
    }

    const body: AnalyzeRequest = await req.json();

    const productDesc = body.product || body.productDescription;
    const audience    = body.audience || body.targetAudience;

    // ── generate-offer action ──────────────────────────────────────────────
    if (body.action === 'generate-offer') {
      if (!productDesc) {
        return NextResponse.json(
          { error: 'product is required for generate-offer' },
          { status: 400 }
        );
      }

      const lines = [`Продукт: ${productDesc}`];
      if (audience) lines.push(`Аудитория: ${audience}`);

      const offerMsg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Придумай 2 коротких сильных оффера (до 10 слов каждый) для рекламного баннера.

${lines.join('\n')}

Оффер должен быть конкретным — с чёткой выгодой или уникальностью. Без воды и общих фраз. Пример хорошего оффера: «Доставка и установка бесплатно», «Гарантия 3 года — или вернём деньги».

Верни ТОЛЬКО валидный JSON без пояснений:
{"offers": ["оффер 1", "оффер 2"]}`,
        }],
      });

      const offerContent = offerMsg.content[0];
      if (offerContent.type !== 'text') throw new Error('Unexpected Claude response');
      const offerJsonMatch = offerContent.text.match(/\{[\s\S]*\}/);
      if (!offerJsonMatch) throw new Error('No JSON in Claude response');
      return NextResponse.json(JSON.parse(offerJsonMatch[0]) as OfferResponse);
    }

    // ── suggest-archetype: только определение архетипа, без гипотез ──────
    if (body.action === 'suggest-archetype') {
      if (!productDesc || !audience) {
        return NextResponse.json(
          { error: 'product and audience are required' },
          { status: 400 }
        );
      }

      const lines: string[] = [`Продукт/бренд: ${productDesc}`];
      if (body.price)             lines.push(`Цена: ${body.price}`);
      lines.push(`Целевая аудитория: ${audience}`);
      if (body.goal)              lines.push(`Цель рекламы: ${body.goal}`);
      if (body.utp)               lines.push(`УТП: ${body.utp}`);
      if (body.platforms?.length) lines.push(`Платформы: ${body.platforms.join(', ')}`);
      if (body.context)           lines.push(`Контекст: ${body.context}`);

      const suggestMsg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 800,
        system: `Ты — эксперт по бренд-стратегии и теории архетипов рекламных баннеров.

26 архетипов: ${ARCHETYPE_NAMES_LIST}.

Проанализируй бриф. Определи 3 наиболее подходящих архетипа с процентом соответствия.
НЕ генерируй гипотезы — только анализ архетипов.

Верни ТОЛЬКО валидный JSON без markdown и пояснений:
{
  "archetypes": [{"name":"id архетипа","description":"как проявляется","matchScore":85,"keywords":["тег1","тег2"]}],
  "primaryArchetype": "id основного архетипа",
  "positioning": "Краткое позиционирование 1–2 предложения",
  "hypotheses": [],
  "newHypotheses": []
}`,
        messages: [{ role: 'user', content: lines.join('\n') }],
      });

      const suggestContent = suggestMsg.content[0];
      if (suggestContent.type !== 'text') throw new Error('Unexpected Claude response');
      const suggestMatch = suggestContent.text.match(/\{[\s\S]*\}/);
      if (!suggestMatch) throw new Error('No JSON in Claude response');
      return NextResponse.json(JSON.parse(suggestMatch[0]) as AnalyzeResponse);
    }

    // ── generate-hypotheses: 5 гипотез строго под выбранный архетип ──────
    if (body.action === 'generate-hypotheses') {
      if (!body.selectedArchetype?.id) {
        return NextResponse.json(
          { error: 'selectedArchetype is required' },
          { status: 400 }
        );
      }

      const archDef = ARCHETYPES.find(a => a.id === body.selectedArchetype!.id);
      const archLabel = archDef?.label ?? body.selectedArchetype.label;
      const archFormula = archDef?.formula ?? '';
      const archTags = archDef?.tags?.join(', ') ?? '';
      const archAudience = archDef?.audience ?? '';
      const archStyle = archDef?.textRules?.style ?? 'bold';

      const briefLines: string[] = [];
      if (body.product)           briefLines.push(`Продукт: ${body.product}`);
      if (body.price)             briefLines.push(`Цена/сегмент: ${body.price}`);
      if (body.audience)          briefLines.push(`Аудитория: ${body.audience}`);
      if (body.goal)              briefLines.push(`Цель рекламы: ${body.goal}`);
      if (body.utp)               briefLines.push(`УТП: ${body.utp}`);
      if (body.offer)             briefLines.push(`Оффер: ${body.offer}`);
      if (body.platforms?.length) briefLines.push(`Платформы: ${body.platforms.join(', ')}`);
      if (body.context)           briefLines.push(`Контекст: ${body.context}`);

      const hypoMsg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        system: `Ты — эксперт по рекламным коммуникациям и маркетинговым баннерам.

ВЫБРАННЫЙ АРХЕТИП: ${archLabel} (id: ${body.selectedArchetype.id})
ФОРМУЛА АРХЕТИПА: ${archFormula}
ГОЛОС И СТИЛЬ: ${archStyle}
ТЕГИ АРХЕТИПА: ${archTags}
ТИПИЧНАЯ АУДИТОРИЯ АРХЕТИПА: ${archAudience}

ЗАДАЧА: Сгенерировать РОВНО 5 уникальных маркетинговых гипотез для рекламных баннеров.

ЖЁСТКИЕ ТРЕБОВАНИЯ — каждая из 5 гипотез ОБЯЗАНА:
1. Явно воплощать стиль, логику и ценности архетипа "${archLabel}"
2. Визуально соответствовать формуле архетипа: "${archFormula}"
3. Использовать голос и тон "${archStyle}"
4. Упоминать или использовать паттерны архетипа: ${archTags}
5. Быть уникальной — каждая под разным углом, но в рамках ОДНОГО архетипа

Верни ТОЛЬКО валидный JSON без markdown:
{
  "newHypotheses": [
    {
      "idea": "Идея кампании — явно отражает архетип ${archLabel}",
      "visual": "Визуал строго по формуле: ${archFormula}",
      "headline": "Заголовок в стиле ${archStyle}",
      "cta": "Призыв к действию",
      "hook": "Первая фраза-крючок"
    }
  ]
}`,
        messages: [{
          role: 'user',
          content: `Бриф продукта:\n${briefLines.join('\n')}\n\nСгенерируй 5 гипотез строго под архетип "${archLabel}".`,
        }],
      });

      const hypoContent = hypoMsg.content[0];
      if (hypoContent.type !== 'text') throw new Error('Unexpected Claude response');
      const hypoMatch = hypoContent.text.match(/\{[\s\S]*\}/);
      if (!hypoMatch) throw new Error('No JSON in Claude response');
      const hypoResult = JSON.parse(hypoMatch[0]);
      if (!Array.isArray(hypoResult.newHypotheses)) hypoResult.newHypotheses = [];
      return NextResponse.json({ newHypotheses: hypoResult.newHypotheses });
    }

    // ── main analyze action ────────────────────────────────────────────────
    if (!productDesc || !audience) {
      return NextResponse.json(
        { error: 'product and audience are required' },
        { status: 400 }
      );
    }

    const lines: string[] = [
      `Продукт/бренд: ${productDesc}`,
    ];
    if (body.price)              lines.push(`Цена: ${body.price}`);
    lines.push(`Целевая аудитория: ${audience}`);
    if (body.goal)               lines.push(`Цель рекламы: ${body.goal}`);
    if (body.utp)                lines.push(`УТП: ${body.utp}`);
    if (body.platforms?.length)  lines.push(`Платформы: ${body.platforms.join(', ')}`);
    if (body.brandValues)        lines.push(`Ценности бренда: ${body.brandValues}`);
    if (body.context)            lines.push(`Контекст: ${body.context}`);
    lines.push('', 'Проведи анализ архетипов и сгенерируй маркетинговые гипотезы.');

    const userMessage = lines.join('\n');

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2560,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const result: AnalyzeResponse = JSON.parse(jsonMatch[0]);

    if (!result.newHypotheses) result.newHypotheses = [];

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze API error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error (${error.status}): ${error.message}` },
        { status: error.status ?? 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
