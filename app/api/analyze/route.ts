import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ARCHETYPES, ARCHETYPE_NAMES_LIST } from '@/lib/archetypes';
import { getActiveTrends } from '@/lib/trends';

export const dynamic = 'force-dynamic';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractJSON(text: string): Record<string, unknown> {
  // Strip markdown code fences if present
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');

  // Try direct parse first
  try {
    return JSON.parse(cleaned.trim());
  } catch {}

  // Find the outermost JSON object by matching braces
  let depth = 0;
  let start = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {}
      }
    }
  }

  throw new SyntaxError('No valid JSON found in AI response');
}

export interface AnalyzeRequest {
  action?: 'generate-offer' | 'suggest-archetype' | 'generate-hypotheses' | 'recommend-archetypes-v2' | 'generate-hybrid-hypothesis';
  // Для generate-hypotheses: выбранный архетип
  selectedArchetype?: { id: string; label: string };
  selectedArchetypes?: { id: string; label: string; rank: number }[];
  // Для generate-hybrid-hypothesis: скрещиваемые архетипы
  crossedArchetypes?: { id: string; label: string }[];
  hybridName?: string;
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
  toneOfVoice?: string;
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
  usePhoto?: boolean;
  archetypeId: string;
  archetypeLabel: string;
  rank: number;
  priority: 'gold' | 'green' | 'yellow' | 'default';
}

export interface HybridArchetype {
  archetypes: [string, string];
  hybridName: string;
  reason: string;
  visualHint: string;
}

export interface RecommendV2Response {
  pureArchetypes: { id: string; reason: string; matchScore: number }[];
  hybridArchetypes: HybridArchetype[];
  positioning: string;
}

export interface AnalyzeResponse {
  archetypes: Archetype[];
  hypotheses: Hypothesis[];
  newHypotheses: NewHypothesis[];
  positioning: string;
  primaryArchetype: string;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly: 'Тон коммуникации: дружелюбный, на «ты». Используй неформальный язык, обращайся к аудитории как к другу.',
  formal: 'Тон коммуникации: профессиональный, на «вы». Уважительный, деловой стиль без фамильярности.',
  provocative: 'Тон коммуникации: провокационный, дерзкий. Вызывающие формулировки, ломающие шаблоны. Можно использовать риторические вопросы и вызовы.',
  expert: 'Тон коммуникации: экспертный, авторитетный. Используй цифры, факты, конкретику. Говори как признанный специалист.',
};

const SYSTEM_PROMPT = `Ты — эксперт по бренд-стратегии и маркетингу, специализирующийся на теории архетипов.

28 архетипов бренда: ${ARCHETYPE_NAMES_LIST}.

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

    // Лимиты на входные данные
    const MAX_LEN: Record<string, number> = {
      product: 300, price: 100, audience: 600, goal: 300,
      utp: 500, offer: 500, context: 1000,
    };
    for (const [key, max] of Object.entries(MAX_LEN)) {
      if (typeof (body as any)[key] === 'string' && (body as any)[key].length > max) {
        (body as any)[key] = (body as any)[key].slice(0, max);
      }
    }

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
      return NextResponse.json(extractJSON(offerContent.text) as unknown as OfferResponse);
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

28 архетипов: ${ARCHETYPE_NAMES_LIST}.

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
      return NextResponse.json(extractJSON(suggestContent.text) as unknown as AnalyzeResponse);
    }

    // ── recommend-archetypes-v2: 3 чистых + 2 гибрида ─────────────────
    if (body.action === 'recommend-archetypes-v2') {
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

      const v2Msg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1200,
        system: `Ты — креативный стратег по рекламным баннерам.

28 архетипов (используй ТОЛЬКО id из этого списка): ${ARCHETYPE_NAMES_LIST}.

Проанализируй бриф и порекомендуй 5 архетипов:

1. ТРИ чистых архетипа из списка — наиболее подходящих для продукта и аудитории.
   Для каждого укажи matchScore (0-100) и объясни ПОЧЕМУ он подходит (1 предложение).

2. ДВА гибрида — уникальные скрещивания из доступных архетипов.
   Для каждого:
   - archetypes: массив из РОВНО двух id архетипов
   - hybridName: яркое короткое название (2-3 слова на русском)
   - reason: почему эта пара сработает для данного брифа (1 предложение)
   - visualHint: как будет выглядеть баннер в этом гибриде (1 предложение)

Правила гибридов:
- Скрещивай архетипы которые ДОПОЛНЯЮТ друг друга, а не дублируют
- Один из гибридов может включать чистый архетип из тройки выше
- Гибрид — это СИНТЕЗ, а не чередование

Верни ТОЛЬКО валидный JSON без markdown:
{
  "pureArchetypes": [
    {"id": "точный_id", "reason": "почему подходит", "matchScore": 85}
  ],
  "hybridArchetypes": [
    {"archetypes": ["id1", "id2"], "hybridName": "Название", "reason": "почему сработает", "visualHint": "описание визуала"}
  ],
  "positioning": "Краткое позиционирование 1-2 предложения"
}`,
        messages: [{ role: 'user', content: lines.join('\n') }],
      });

      const v2Content = v2Msg.content[0];
      if (v2Content.type !== 'text') throw new Error('Unexpected Claude response');
      return NextResponse.json(extractJSON(v2Content.text) as unknown as RecommendV2Response);
    }

    // ── generate-hybrid-hypothesis: гибридная гипотеза для скрещенных архетипов
    if (body.action === 'generate-hybrid-hypothesis') {
      if (!body.crossedArchetypes || body.crossedArchetypes.length < 2) {
        return NextResponse.json(
          { error: 'crossedArchetypes (2 items) is required' },
          { status: 400 }
        );
      }

      const [arch1, arch2] = body.crossedArchetypes;
      const def1 = ARCHETYPES.find(a => a.id === arch1.id);
      const def2 = ARCHETYPES.find(a => a.id === arch2.id);

      const briefLines: string[] = [];
      if (body.product)           briefLines.push(`Продукт: ${body.product}`);
      if (body.price)             briefLines.push(`Цена/сегмент: ${body.price}`);
      if (body.audience)          briefLines.push(`Аудитория: ${body.audience}`);
      if (body.goal)              briefLines.push(`Цель рекламы: ${body.goal}`);
      if (body.utp)               briefLines.push(`УТП: ${body.utp}`);
      if (body.offer)             briefLines.push(`Оффер: ${body.offer}`);
      if (body.platforms?.length) briefLines.push(`Платформы: ${body.platforms.join(', ')}`);

      const hybridMsg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 800,
        system: `Ты — креативный стратег. Тебе даны два архетипа рекламного креатива.
Твоя задача — создать ГИБРИДНУЮ гипотезу, которая объединяет сильные стороны обоих архетипов в единый креативный подход.

Архетип 1: ${def1?.label ?? arch1.label} (${arch1.id})
  Формула: ${def1?.formula ?? ''}
  Стиль: ${def1?.textRules?.style ?? 'bold'}
  Теги: ${def1?.tags?.join(', ') ?? ''}

Архетип 2: ${def2?.label ?? arch2.label} (${arch2.id})
  Формула: ${def2?.formula ?? ''}
  Стиль: ${def2?.textRules?.style ?? 'bold'}
  Теги: ${def2?.tags?.join(', ') ?? ''}

${body.hybridName ? `Название гибрида: ${body.hybridName}` : ''}

Создай ОДНУ гибридную гипотезу — именно СКРЕЩИВАНИЕ подходов, а не чередование.

${body.toneOfVoice && TONE_INSTRUCTIONS[body.toneOfVoice] ? TONE_INSTRUCTIONS[body.toneOfVoice] + ' Все тексты (headline, cta, hook) должны соответствовать этому тону.' : ''}

Если пользователь загрузил фото (спикер, продукт, команда), определи, подходит ли оно для визуальной концепции этой гипотезы.
Установи usePhoto: true если визуал предполагает реального человека, продукт, команду, эксперта, лицо бренда.
Установи usePhoto: false если визуал абстрактный, графический, типографический, сюрреалистический или не предполагает конкретные фотографии.

Верни ТОЛЬКО валидный JSON без markdown:
{
  "newHypotheses": [{
    "idea": "Идея кампании — синтез двух архетипов",
    "visual": "Описание визуала: что изображено, стиль, настроение, цвета",
    "headline": "Заголовок рекламного объявления",
    "cta": "Текст кнопки или призыв к действию",
    "hook": "Первая фраза-крючок для захвата внимания",
    "usePhoto": true
  }]
}`,
        messages: [{
          role: 'user',
          content: `Бриф:\n${briefLines.join('\n')}\n\nСгенерируй 1 гибридную гипотезу: скрещивание "${def1?.label ?? arch1.id}" × "${def2?.label ?? arch2.id}".`,
        }],
      });

      const hybridContent = hybridMsg.content[0];
      if (hybridContent.type !== 'text') throw new Error('Unexpected Claude response');

      const hybridResult = extractJSON(hybridContent.text) as Record<string, unknown>;
      const rawHypos = Array.isArray(hybridResult.newHypotheses) ? hybridResult.newHypotheses : [];

      const hypos: NewHypothesis[] = rawHypos.slice(0, 1).map((h: any) => ({
        idea: h.idea || '',
        visual: h.visual || '',
        headline: h.headline || '',
        cta: h.cta || '',
        hook: h.hook || '',
        usePhoto: h.usePhoto ?? true,
        archetypeId: `${arch1.id}×${arch2.id}`,
        archetypeLabel: body.hybridName || `${def1?.label ?? arch1.id} × ${def2?.label ?? arch2.id}`,
        rank: 0,
        priority: 'default' as const,
      }));

      return NextResponse.json({ newHypotheses: hypos });
    }

    // ── generate-hypotheses: 5 гипотез строго под выбранный архетип ──────
    if (body.action === 'generate-hypotheses') {
      // Поддержка нового формата (массив) и старого (один архетип)
      let archetypesToProcess: { id: string; label: string; rank: number }[] = [];

      if (body.selectedArchetypes && body.selectedArchetypes.length > 0) {
        archetypesToProcess = body.selectedArchetypes;
      } else if (body.selectedArchetype?.id) {
        archetypesToProcess = [{ id: body.selectedArchetype.id, label: body.selectedArchetype.label, rank: 1 }];
      } else {
        return NextResponse.json(
          { error: 'selectedArchetypes is required' },
          { status: 400 }
        );
      }

      const briefLines: string[] = [];
      if (body.product)           briefLines.push(`Продукт: ${body.product}`);
      if (body.price)             briefLines.push(`Цена/сегмент: ${body.price}`);
      if (body.audience)          briefLines.push(`Аудитория: ${body.audience}`);
      if (body.goal)              briefLines.push(`Цель рекламы: ${body.goal}`);
      if (body.utp)               briefLines.push(`УТП: ${body.utp}`);
      if (body.offer)             briefLines.push(`Оффер: ${body.offer}`);
      if (body.platforms?.length) briefLines.push(`Платформы: ${body.platforms.join(', ')}`);
      if (body.context)           briefLines.push(`Контекст: ${body.context}`);

      const allHypotheses: NewHypothesis[] = [];

      // Загружаем актуальные тренды для архетипа "trend"
      const hasTrendArchetype = archetypesToProcess.some(a => a.id === 'trend');
      let trendsBlock = '';
      if (hasTrendArchetype) {
        try {
          const currentTrends = await getActiveTrends(30);
          if (currentTrends.length > 0) {
            trendsBlock = `\nАКТУАЛЬНЫЕ ТРЕНДЫ (автообновление ${new Date().toLocaleDateString('ru-RU')}):\n` +
              currentTrends.map(t => `- [${t.category}] ${t.trend}: ${t.description} (${t.relevance_score}/10)`).join('\n');
          }
        } catch {
          // Если тренды не загрузились — генерируем без них
        }
      }

      await Promise.all(archetypesToProcess.map(async (arch) => {
        const archDef = ARCHETYPES.find(a => a.id === arch.id);
        const archLabel = archDef?.label ?? arch.label;
        const archFormula = archDef?.formula ?? '';
        const archTags = archDef?.tags?.join(', ') ?? '';
        const archAudience = archDef?.audience ?? '';
        const archStyle = archDef?.textRules?.style ?? 'bold';

        const priority: 'gold' | 'green' | 'yellow' | 'default' =
          arch.rank === 1 ? 'gold' : arch.rank === 2 ? 'green' : arch.rank === 3 ? 'yellow' : 'default';

        const trendInstruction = arch.id === 'trend' ? `

⚠️ КРИТИЧЕСКИ ВАЖНО — ПРОЧИТАЙ ВНИМАТЕЛЬНО:

Ты НЕ должен писать что продукт сам по себе тренд.
Ты НЕ должен писать бизнес-аналитику или статистику роста.
Ты НЕ должен писать "это тренд", "это актуально", "это растёт".

Ты ДОЛЖЕН:
1. Взять КОНКРЕТНЫЙ тренд из списка ниже (фильм, мем, явление)
2. Придумать НЕОЖИДАННУЮ метафору между этим трендом и продуктом клиента
3. Написать заголовок который звучит как вирусный пост, а НЕ как реклама

ФОРМУЛА: [Известный тренд/мем/фильм] → [неожиданная связь] → [продукт клиента]

ПРИМЕРЫ ДЛЯ ПАДЕЛ-КЛУБА:
✅ Тренд "Дюна" → "В пустыне выживает сильнейший. На корте — быстрейший" → hook: эпическая подача спорта
✅ Тренд "дофаминовый детокс" → "Лучший детокс — не отключить телефон, а включить тело" → hook: антитеза
✅ Тренд "AI заменит всех" → "AI заменит программистов, дизайнеров, юристов. Но не твою подачу" → hook: юмор + уникальность спорта
✅ Тренд "Roman Empire" → "Мужчины думают о Римской империи. Умные мужчины думают о падел-корте" → hook: мем-формат
✅ Тренд "Baldur's Gate" → "Прокачай ловкость в реальной жизни. Без кубиков, но с ракеткой" → hook: геймерский язык

❌ ЗАПРЕЩЕНО:
- "Падел — тренд №1" (это не привязка к тренду, это констатация)
- "Самый быстрорастущий вид спорта" (это статистика, не креатив)
- "Инвестируйте в падел" (это бизнес-предложение, не реклама)
- Любой текст со словами "тренд", "растёт", "бизнес-модель", "инвестиции"

ОБЯЗАТЕЛЬНО в idea:
- Первое предложение: "Тренд: [название конкретного тренда из списка]"
- Второе предложение: "Связка: [как этот тренд связан с продуктом]"
- Третье предложение: "Формат: [как это выглядит — мем, пост, сториз]"

headline: 3-5 слов в ЯЗЫКЕ ТРЕНДА (как будто это заголовок мема или вирусного поста)
cta: 2-3 слова (тоже в языке тренда, не "купить" или "заказать")

${trendsBlock}

ВЫБЕРИ ОДИН ТРЕНД ИЗ СПИСКА ВЫШЕ И ИСПОЛЬЗУЙ ЕГО. НЕ ПРИДУМЫВАЙ СВОЙ.
` : '';

        const hypoMsg = await client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 1200,
          system: `Ты — эксперт по рекламным коммуникациям и маркетинговым баннерам.

АРХЕТИП: ${archLabel} (id: ${arch.id})
ФОРМУЛА: ${archFormula}
СТИЛЬ: ${archStyle}
ТЕГИ: ${archTags}
АУДИТОРИЯ АРХЕТИПА: ${archAudience}

Сгенерируй РОВНО 1 уникальную маркетинговую гипотезу для рекламного баннера.
Гипотеза ОБЯЗАНА воплощать стиль и логику архетипа "${archLabel}".
Выбери самый сильный и эффективный подход.${trendInstruction}

${body.toneOfVoice && TONE_INSTRUCTIONS[body.toneOfVoice] ? TONE_INSTRUCTIONS[body.toneOfVoice] + ' Все тексты (headline, cta, hook) должны соответствовать этому тону.' : ''}

Если пользователь загрузил фото (спикер, продукт, команда), определи, подходит ли оно для визуальной концепции этой гипотезы.
Установи usePhoto: true если визуал предполагает реального человека, продукт, команду, эксперта, лицо бренда.
Установи usePhoto: false если визуал абстрактный, графический, типографический, сюрреалистический или не предполагает конкретные фотографии.

Верни ТОЛЬКО валидный JSON без markdown:
{
  "newHypotheses": [
    {
      "idea": "Идея кампании",
      "visual": "Описание визуала",
      "headline": "Заголовок",
      "cta": "Призыв к действию",
      "hook": "Фраза-крючок",
      "usePhoto": true
    }
  ]
}`,
          messages: [{
            role: 'user',
            content: `Бриф:\n${briefLines.join('\n')}\n\nСгенерируй 1 гипотезу строго под архетип "${archLabel}".`,
          }],
        });

        const hypoContent = hypoMsg.content[0];
        if (hypoContent.type !== 'text') return;

        try {
          const hypoResult = extractJSON(hypoContent.text) as Record<string, unknown>;
          const rawHypotheses = Array.isArray(hypoResult.newHypotheses) ? hypoResult.newHypotheses : [];

          rawHypotheses.slice(0, 1).forEach((h: any) => {
            allHypotheses.push({
              idea: h.idea || '',
              visual: h.visual || '',
              headline: h.headline || '',
              cta: h.cta || '',
              hook: h.hook || '',
              usePhoto: h.usePhoto ?? true,
              archetypeId: arch.id,
              archetypeLabel: archLabel,
              rank: arch.rank,
              priority,
            });
          });
        } catch {
          // Skip failed archetype
        }
      }));

      return NextResponse.json({ newHypotheses: allHypotheses });
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

    const result: AnalyzeResponse = extractJSON(content.text) as unknown as AnalyzeResponse;

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
