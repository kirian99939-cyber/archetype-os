import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ARCHETYPE_NAMES_LIST } from '@/lib/archetypes';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalyzeRequest {
  // Legacy format (ArchetypeAnalyzer)
  productDescription?: string;
  targetAudience?: string;
  brandValues?: string;
  // New brief format (NewProject)
  product?: string;
  price?: string;
  audience?: string;
  goal?: string;
  utp?: string;
  platforms?: string[];
  context?: string;
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
