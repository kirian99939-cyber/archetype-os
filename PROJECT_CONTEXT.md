# CREATIKA (ex. Archetype OS) — Полная документация проекта

> Этот документ содержит исчерпывающую информацию о проекте для передачи контекста в новый диалог с Claude AI.

## Общие сведения

- **Название:** Creatika (ранее Archetype OS / Архетип-Протокол)
- **Путь:** `C:/Users/kiria/archetype-os/`
- **Репозиторий:** https://github.com/kirian99939-cyber/archetype-os
- **Продакшн:** https://archetype-os-tau.vercel.app
- **Описание:** AI-платформа для маркетологов — генерация рекламных баннеров на основе 26 психологических архетипов
- **Флоу:** 4-шаговый wizard: Бриф → Архетип → Гипотезы → Баннеры

## Стек технологий

| Слой | Технология | Версия | Назначение |
|------|-----------|--------|------------|
| Framework | Next.js (App Router) | 14.2.16 | Full-stack React |
| Language | TypeScript | 5 | Строгая типизация |
| Styling | Tailwind CSS + CSS variables | 3.4.0 | Утилити-CSS + кастомная тёмная тема |
| Auth | NextAuth (Google OAuth) | 4.24 | JWT-сессии |
| Database | Supabase (PostgreSQL) | 2.97 | Пользователи, проекты, кредиты |
| AI Text | Anthropic Claude | claude-opus-4-6 | Анализ архетипов, генерация гипотез |
| AI Images | NanoBanana API | — | Генерация баннерных изображений |
| Image Processing | Sharp | 0.34 | Ресайз/кроп баннеров |
| Payment | Prodamus | — | Приём платежей (webhook + widget) |
| Deploy | Vercel | — | Авто-деплой из main |

## Пользовательские предпочтения

- **Язык:** Русский (и проект, и общение)
- **Workflow:** implement → build → commit → push (всё одним потоком)
- **Коммиты:** `feat:` / `fix:` / `refactor:` с детальными описаниями
- **Всегда пушить** в origin/main после коммита (Vercel авто-деплоит)

---

## Структура файлов

```
C:/Users/kiria/archetype-os/
├── app/
│   ├── layout.tsx                     # Root layout: шрифты (Inter, Unbounded, DM Sans), AuthProvider, ProdamusScript, meta
│   ├── page.tsx                       # Root redirect: авторизован → /dashboard, нет → /landing
│   ├── dashboard/
│   │   └── page.tsx                   # Главный дашборд: боковая панель (8 табов), хедер с кредитами, динамический контент
│   ├── landing/
│   │   └── page.tsx                   # Лендинг: герой, "как работает", статистика, сравнение, архетипы-карусель, прайсинг, FAQ, футер
│   ├── payment/
│   │   ├── success/page.tsx           # Страница успешной оплаты
│   │   └── cancel/page.tsx            # Страница отмены оплаты
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # NextAuth Google OAuth handler
│       ├── analyze/route.ts             # Claude API: рекомендации архетипов, генерация гипотез (554 строк)
│       ├── generate-banner/route.ts     # NanoBanana API: генерация изображений (301 строка)
│       ├── banner-status/route.ts       # Поллинг статуса NanoBanana
│       ├── resize-banner/route.ts       # Sharp: ресайз баннеров к точным размерам
│       ├── upload-photo/route.ts        # Загрузка фото в Supabase Storage
│       ├── download-image/route.ts      # Прокси-скачивание с вайтлистом доменов
│       ├── check-credits/route.ts       # Баланс кредитов пользователя
│       ├── projects/route.ts            # CRUD проектов (POST/GET)
│       ├── projects/[id]/route.ts       # Один проект (GET/PATCH/DELETE)
│       ├── prodamus-webhook/route.ts    # Вебхук оплаты (HMAC-SHA256)
│       └── admin/stats/route.ts         # Админ-аналитика
├── components/
│   ├── AuthProvider.tsx               # SessionProvider обёртка
│   ├── NewProject.tsx                 # Главный компонент — 4-step wizard (2240 строк)
│   ├── DashboardPage.tsx              # Дашборд: метрики, быстрые действия, недавние проекты
│   ├── ArchetypesPage.tsx             # Каталог 26 архетипов
│   ├── ArchetypeAnalyzer.tsx          # Legacy: ручной анализ архетипов
│   ├── BannerGenerator.tsx            # Standalone генератор баннеров
│   ├── HistoryPage.tsx                # История проектов с итерациями
│   ├── AnalyticsPage.tsx              # Аналитика и метрики
│   ├── BannerLibraryPage.tsx          # Библиотека всех баннеров
│   ├── PricingSection.tsx             # Тарифы и цены
│   ├── SettingsPage.tsx               # Настройки пользователя
│   ├── AdminPage.tsx                  # Админ-панель (только для admin email)
│   ├── ProdamusScript.tsx             # Загрузчик скрипта оплаты
│   └── PayButton.tsx                  # Кнопка оплаты
├── lib/
│   ├── archetypes.ts                  # 26 архетипов с полными определениями
│   ├── supabase.ts                    # Supabase admin client, CRUD, credits
│   ├── auth.ts                        # NextAuth конфиг + callbacks
│   ├── anthropic.ts                   # Обёртка для POST /api/analyze
│   ├── gemini.ts                      # Обёртка NanoBanana: генерация + поллинг
│   └── resizeBanner.ts                # Sharp ресайз + BANNER_DIMENSIONS
├── hooks/
│   ├── useProdamus.ts                 # Хук оплаты: pay() / payWithDetails()
│   └── useProdamusEvents.ts           # Слушатель postMessage от Prodamus
├── types/
│   └── next-auth.d.ts                 # Расширение Session: id, credits
├── public/                            # Пустая (нет статических ассетов)
├── tailwind.config.js                 # Бренд-цвета, Inter шрифт
├── next.config.js                     # images.remotePatterns: все HTTPS домены
├── vercel.json                        # maxDuration: generate-banner 120s, analyze 120s, resize 60s
├── tsconfig.json                      # strict: true, alias @/* → root
└── package.json                       # Зависимости и скрипты
```

---

## ENV-переменные (обязательные)

```
ANTHROPIC_API_KEY          # Claude API ключ
NANO_BANANA_API_KEY        # NanoBanana API для генерации изображений
NEXTAUTH_SECRET            # Секрет шифрования JWT сессий
NEXTAUTH_URL               # URL приложения (https://archetype-os-tau.vercel.app)
GOOGLE_CLIENT_ID           # Google OAuth Client ID
GOOGLE_CLIENT_SECRET       # Google OAuth Client Secret
SUPABASE_URL               # URL инстанса Supabase
SUPABASE_SECRET_KEY        # Admin-ключ Supabase (server-side only)
PRODAMUS_SECRET_KEY        # Секрет для верификации вебхуков Prodamus
```

---

## Схема базы данных (Supabase PostgreSQL)

### Таблица `users`
```sql
CREATE TABLE public.users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  credits     INTEGER     DEFAULT 3,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Таблица `projects`
```sql
CREATE TABLE public.projects (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id),
  title           TEXT,
  brief           JSONB,         -- {product, price, audience, goal, utp, offer, platforms, context, visualMode, imageUrls, imageLink}
  archetype       JSONB,         -- {id, label, rank} или гибридный
  hypotheses      JSONB[],       -- [{idea, visual, headline, cta, hook, archetypeLabel, rank}]
  banners         JSONB[],       -- [{hypothesisIndex, banners: [{formatId, taskId, imageUrl, prompt, ...}]}]
  status          TEXT,           -- 'draft' | 'brief' | 'archetype' | 'hypotheses' | 'completed'
  banner_history  JSONB,         -- [{iterationId, createdAt, archetypeId, archetypeLabel, bannerGroups}]
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Аутентификация

**Провайдер:** NextAuth v4 + Google OAuth + JWT-стратегия

**Флоу:**
1. Пользователь жмёт "Войти" → Google OAuth
2. `signIn` callback: если пользователь новый → создаёт запись в Supabase (3 кредита), если существующий → пропускает
3. `session` callback: обогащает сессию полями `id` и `credits` из Supabase
4. Страница входа: `/landing`

**Расширение типов (types/next-auth.d.ts):**
```typescript
interface Session {
  user: {
    id?: string;        // UUID из Supabase
    name?: string | null;
    email?: string | null;
    image?: string | null;
    credits?: number;   // Баланс кредитов
  };
}
```

---

## API Routes — Детальная документация

### 1. POST /api/analyze

**Размер:** 554 строк | **Модель:** claude-opus-4-6

**Actions (параметр `action` в body):**

| Action | Описание | max_tokens |
|--------|----------|------------|
| `suggest-archetype` | Анализ бренда → 3 архетипа (без гипотез) | 800 |
| `recommend-archetypes-v2` | 3 pure + 2 hybrid архетипа | 1200 |
| `generate-hypotheses` | 1 гипотеза на каждый выбранный архетип (параллельно через Promise.all) | 400 каждый |
| `generate-hybrid-hypothesis` | Гибридная гипотеза из 2 скрещенных архетипов | 400 |
| `generate-offer` | 2 коротких рекламных оффера | 200 |
| (по умолчанию) | Полный анализ: 3 архетипа + 4 legacy + 3 new гипотезы | 2560 |

**Request body:**
```typescript
{
  action?: string;
  product?: string;        // макс 300 символов
  price?: string;          // макс 100
  audience?: string;       // макс 600
  goal?: string;           // макс 300
  utp?: string;            // макс 500
  offer?: string;          // макс 500
  platforms?: string[];
  context?: string;        // макс 1000
  selectedArchetypes?: { id: string; label: string; rank: number }[];
  crossedArchetypes?: { id: string; label: string }[];
  hybridName?: string;
}
```

**Response (recommend-archetypes-v2):**
```typescript
{
  pureArchetypes: { id: string; reason: string; matchScore: number }[];  // 3 штуки
  hybridArchetypes: HybridArchetype[];  // 2 штуки
  positioning: string;
}
```

**Response (generate-hypotheses):**
```typescript
{
  newHypotheses: {
    idea: string;
    visual: string;
    headline: string;
    cta: string;
    hook: string;
    archetypeLabel: string;
    rank: number;
  }[];
}
```

**Особенности:**
- Robust JSON extraction: снимает markdown code fences, ищет matching braces
- Санитизация длины входных полей
- ARCHETYPE_NAMES_LIST в системном промпте для ограничения ответов Claude

### 2. POST /api/generate-banner

**Размер:** 301 строка

**Request:**
```typescript
{
  prompt: string;           // Описание баннера
  width?: number;
  height?: number;
  style?: string;
  archetype?: string;       // ID архетипа → визуальный стиль
  offer?: string;           // Текст оффера
  imageUrls?: string[];     // URL фото продукта
  isFirstBanner?: boolean;  // true = списать 1 кредит
}
```

**Response:** `{ taskId: string; prompt: string }`

**Логика:**
1. Проверка JWT + создание пользователя если нет
2. Проверка кредитов, списание на `isFirstBanner=true`
3. Генерация текста баннера через Claude (с учётом textRules архетипа)
4. Формирование image prompt с визуальным стилем архетипа
5. Вычисление aspect ratio через GCD (поддерживаемые: 1:1, 4:5, 9:16, 16:9, 3:4, 4:3)
6. Отправка в NanoBanana API (`generate-pro`, resolution: 2K)
7. Возврат taskId для поллинга

**Маппинг архетипов → визуальный стиль:**
Каждый из 26 архетипов маппится на конкретное описание стиля (напр. `mem` → "Internet meme style, bold Impact font, ironic visuals", `premium` → "Dark luxury background, noble materials, gold accents, minimal text").

### 3. GET /api/banner-status

**Query:** `?taskId=xxx`
**Response:** `{ ready: boolean; imageUrl?: string }`
**API:** NanoBanana `record-info` endpoint
**Логика:** ready=true когда `successFlag === 1` и есть `resultImageUrl`

### 4. POST /api/resize-banner

**Request:** `{ imageUrl: string; formatId: string }`
**Response:** PNG binary (`Content-Disposition: inline`)
**Логика:** Скачивает изображение → Sharp resize (fit: cover, centre) → PNG

### 5. POST /api/upload-photo

**Request:** FormData с file (JPG/PNG/WEBP, макс 10MB)
**Response:** `{ url: string }` — публичный URL в Supabase Storage
**Bucket:** `product-photos`
**Без аутентификации!**

### 6. GET /api/download-image

**Query:** `?url=xxx`
**Вайтлист доменов:** `file.aiquickdraw.com`, `nanobananaapi.ai`, `cdn.nanobananaapi.ai`
**Response:** Бинарный файл с `Content-Disposition: attachment`

### 7. GET /api/check-credits

**Auth:** JWT required
**Response:** `{ credits: number }`

### 8. /api/projects

- **POST** — Создать проект → `{ id: string }`
- **GET** — Список проектов пользователя (order by updated_at DESC)

### 9. /api/projects/[id]

- **GET** — Получить проект (проверка ownership)
- **PATCH** — Обновить + автоматическое добавление в banner_history при `status=completed`
- **DELETE** — Удалить проект (проверка ownership)

### 10. POST /api/prodamus-webhook

**Верификация:** HMAC-SHA256 подпись всех полей (кроме `sign`)
**Статус:** TODO — не реализовано начисление кредитов!
**Всегда возвращает:** `{ success: true }`

### 11. GET /api/admin/stats

**Доступ:** только `kirian99939@gmail.com`
**Response:** users (total, active, list), projects (total, completed, byDay), banners (total), credits (initial, spent, remaining), finance (estimatedApiCost @ 150₽/credit, registrationsByDay)

---

## Компоненты — Детальная документация

### NewProject.tsx (2240 строк) — Главный компонент

**Props:** `{ onBusyChange?: (busy: boolean) => void }`

**Ключевые состояния:**
```typescript
step: 1 | 2 | 3 | 4
brief: { product, price, audience, goal, utp, offer, platforms, context, visualMode, imageUrls, imageLink }
selectedArchetypes: { id: string; rank: number }[]  // до 5 штук
selectedHybrids: HybridArchetype[]
hypotheses: NewHypothesis[]
selectedHypotheses: Set<number>
bannerGroups: BannerGroup[]  // [{hypothesisIndex, banners: [{formatId, taskId, imageUrl, prompt}]}]
projectId: string | null
```

**Константы:**
- `PLATFORMS`: 9 платформ (Instagram, TikTok, VK, Telegram, YouTube, Facebook, Pinterest, OK, Twitter)
- `BANNER_FORMATS`: 6 форматов (feed 1080×1080, feed_vertical 1080×1350, stories 1080×1920, banner 1920×1080, post_wide 1080×607, rsya_vertical 240×400)
- `AD_PLATFORMS`: 5 рекламных платформ с привязкой к форматам (VK, Yandex, Telegram, MyTarget, Google)
- `MAX_ARCHETYPES`: 5
- `MAX_REFRESHES_PER_BANNER`: 3

**Step 1 — Бриф:**
- Текстовые поля: product, price, audience, goal, utp, offer, context
- Генерация оффера через Claude (handleGenerateOffer)
- Выбор визуального режима: AI-генерация / загрузка фото (drag-drop, до 3 файлов) / вставка ссылки
- Выбор платформ (чипы)
- Выбор форматов баннеров (6 форматов, 3 группы)
- Сохранение в БД при переходе

**Step 2 — Архетип:**
- AI-анализ через `recommend-archetypes-v2`
- Отображение positioning (рекомендация)
- 3 pure архетипа с matchScore
- 2 гибридных архетипа (🧬 бейдж, фиолетовый стиль)
- Полная сетка 26 архетипов с ранговыми индикаторами (🏆 золото, 🟢 зелёный, 🟡 жёлтый)
- Выбор до 5 архетипов

**Step 3 — Гипотезы:**
- Автогенерация при входе в шаг (useEffect)
- 1 гипотеза на pure архетип + 1 на гибридный
- Карточки: idea, visual, headline, cta, hook
- Приоритетные бейджи: gold/green/yellow
- Гибриды с 🧬 иконкой

**Step 4 — Баннеры:**
- Выбор форматов и платформ (быстрые кнопки AD_PLATFORMS)
- Табы гипотез (Г1, Г2...)
- Последовательная генерация: гипотеза за гипотезой, формат за форматом
- Поллинг: проверка /api/banner-status каждые 5с, до 40 попыток (200с макс)
- Рефреш баннера (до 3 раз, без списания кредитов)
- Скачивание через /api/download-image
- Ротация загрузочных фраз каждые 3с
- beforeunload предупреждение при генерации
- Сохранение проекта в Supabase

**Persistence:** localStorage ключ `archetype_draft_project` для возобновления черновиков

### DashboardPage.tsx

**Props:** `{ onNavigate: (page: string) => void }`

**Разделы:**
- 3 карточки метрик: проекты, баннеры, кредиты
- 3 быстрых действия: создать проект, каталог архетипов, история
- Таблица последних 5 проектов с иконкой архетипа, статусом, датой
- Клик по проекту → сохранение в localStorage → навигация к NewProject для возобновления

**Статусы:** completed→"Готов" (зелёный), draft→"Черновик" (серый), прочие→"В работе" (accent)

### HistoryPage.tsx

**Функции:**
- Грид карточек проектов (3 колонки)
- Превью первого баннера или плейсхолдер
- Удаление проекта (модальное подтверждение)
- Продолжение проекта (→ NewProject через localStorage)
- Пустое состояние с CTA

### AnalyticsPage.tsx

**Метрики:**
- Общие: проекты, баннеры, кредиты, гипотезы
- Экономия: часы (×4.5h) и деньги (×5000₽)
- Популярные архетипы (топ 8, bar chart)
- Активность по неделям (8 недель)
- Форматы баннеров (%)

### PricingSection.tsx

**Props:** `{ isLoggedIn?: boolean; onSelectPlan?: (planId: string) => void }`

**Тарифы:**
1. **Free:** 3 кредита, 0₽
2. **Старт:** 5 кредитов, 1490₽ (зачёркнуто 2990₽)
3. **Про** (выделенный): 20 кредитов, 4990₽ (зачёркнуто 9990₽)
4. **Бизнес:** 50 кредитов, 9990₽ (зачёркнуто 24990₽)

### AdminPage.tsx

**Доступ:** только admin email
**3 таба:** Обзор, Пользователи, Активность
**Данные:** метрики, таблица пользователей, графики регистраций/проектов за 14 дней

### SettingsPage.tsx

**Функции:**
- Профиль (аватар, имя, email, кредиты)
- Шаблоны брифа по умолчанию (localStorage `archetype_brief_defaults`)
- Выбор платформ по умолчанию
- Визуальный режим по умолчанию
- Выход из аккаунта

---

## 26 Архетипов — Полное описание

### Интерфейсы

```typescript
interface TextRules {
  level: 'minimal' | 'medium' | 'full';
  includeOffer: boolean;
  includeCta: boolean;
  style: 'elegant' | 'bold' | 'conversational' | 'provocative' | 'playful' | 'scientific';
}

interface ArchetypeDefinition {
  id: string;
  label: string;
  icon: string;
  audience: string;
  categories: string;
  formula: string;
  risk: string;
  tags: string[];
  platforms: string[];
  textRules: TextRules;
}
```

### Список всех 26 архетипов

| # | ID | Название | Icon | ЦА | Формула | TextRules (level/offer/cta/style) |
|---|-----|---------|------|-----|---------|-----------------------------------|
| 1 | `mem` | Мем | 😂 | 18–35, соцсети | Крупный объект + короткий текст мема | medium / no / yes / bold |
| 2 | `trend` | Трендовый | 🔥 | 16–35, TikTok/YT | Атмосфера тренда без копирования | medium / no / yes / bold |
| 3 | `aesthetic` | Эстетический | ✦ | 20–45, женщины | Чистая композиция + минимум текста | minimal / no / no / elegant |
| 4 | `cringe` | Кринжовый | 🤪 | 18–35, ирония | Осознанный "колхозный" баннер | medium / no / yes / provocative |
| 5 | `wow` | WOW | 🎬 | 20–45, премиум | Продукт-герой, драматический свет | medium / no / yes / bold |
| 6 | `acid` | Кислотный | ⚡ | 16–35, Gen Z | Неон + глитч + киберпанк | full / yes / yes / provocative |
| 7 | `zhiza` | Жиза | 🏠 | 25–55, семьи | Продукт в бытовых ситуациях | medium / no / yes / conversational |
| 8 | `premium` | Премиум | 💎 | 25–55, высокий доход | Тёмный фон + благородные материалы | minimal / no / no / elegant |
| 9 | `nostalgia` | Ностальгия | 📼 | 25–45, 90-е/2000-е | VHS-эффект, ретро-шрифты | medium / no / yes / conversational |
| 10 | `story` | Сюжетный | 📖 | Широкая ЦА | До/после, проблема → решение | full / yes / yes / conversational |
| 11 | `social_proof` | Соцдоказательство | ⭐ | 25–55, осторожные | Отзывы + рейтинги + UGC | full / yes / yes / bold |
| 12 | `shock` | Шок | 💥 | 18–40, смелые | Парадоксы + провокация | full / yes / yes / provocative |
| 13 | `science` | Научный | 🔬 | 25–55, B2B | Схемы + графики + цифры | full / yes / yes / scientific |
| 14 | `asmr` | ASMR | 🧸 | 20–55, женщины | Мягкий свет + текстуры | minimal / no / no / elegant |
| 15 | `gamification` | Геймификация | 🎮 | 16–40, геймеры | Баннер как игра: квест, кнопки | full / yes / yes / playful |
| 16 | `surreal` | Сюрреализм | 🌀 | 18–40, арт-любители | Левитация + необычная физика | minimal / no / no / provocative |
| 17 | `cultural` | Культурный код | 🌍 | Локальные рынки | Локальные символы + традиции | medium / no / yes / conversational |
| 18 | `hyperbole` | Гиперболизация | 🚀 | 18–45, юмор | Утрируем свойства до эпичного | full / yes / yes / bold |
| 19 | `cinematic` | Синематический | 🎥 | 18–45, кино | Кадр из жанра: боевик, sci-fi | minimal / no / no / elegant |
| 20 | `cat` | Котоархетип | 🐱 | 18–40, женщины | Продукт + кот + мягкий свет | minimal / no / no / playful |
| 21 | `eco` | Экологичный | 🌿 | 20–50, сознательные | Продукт + природа + эко-иконки | medium / no / yes / elegant |
| 22 | `cute` | Милота | 🩷 | 18–35, женщины | Мини-продукт + пастельные цвета | minimal / no / no / playful |
| 23 | `pov` | POV | 👁 | 16–40, Gen Z | Камера = глаза, руки + действие | medium / no / yes / conversational |
| 24 | `celebrity` | Ассоциация с персоной | 🧠 | 18–45, образное мышление | Перенос смысла без прямого использования | full / yes / yes / conversational |
| 25 | `badgood` | Чем хуже тем лучше | 📉 | 18–35, Gen Z | Осознанно ломаем качество подачи | full / yes / yes / provocative |

### Экспортируемая строка
```typescript
export const ARCHETYPE_NAMES_LIST = "mem, trend, aesthetic, cringe, wow, acid, zhiza, premium, nostalgia, story, social_proof, shock, science, asmr, gamification, surreal, cultural, hyperbole, cinematic, cat, eco, cute, pov, celebrity, badgood"
```

---

## Форматы баннеров

```typescript
const BANNER_DIMENSIONS = {
  'feed':          { width: 1080, height: 1080 },   // 1:1 — лента
  'feed_vertical': { width: 1080, height: 1350 },   // 4:5 — вертикальная лента
  'stories':       { width: 1080, height: 1920 },   // 9:16 — сторис
  'banner':        { width: 1920, height: 1080 },   // 16:9 — горизонтальный
  'post_wide':     { width: 1080, height: 607 },    // ~16:9 — широкий пост
  'rsya_vertical': { width: 240,  height: 400 },    // ~3:5 — РСЯ вертикальный
};
```

---

## Кредитная система

- При регистрации: **3 бесплатных кредита**
- 1 кредит = 1 пачка баннеров (все форматы для одной генерации)
- `isFirstBanner=true` списывает кредит, остальные форматы в пачке — бесплатно
- Рефреш баннера (до 3 раз) — бесплатно
- Оптимистичный lock: `UPDATE SET credits = credits - 1 WHERE credits = текущее_значение`
- Тарифы: Free (3), Старт (5 за 1490₽), Про (20 за 4990₽), Бизнес (50 за 9990₽)

---

## Pipeline генерации баннеров

```
1. Пользователь заполняет бриф (Step 1)
2. Claude анализирует бренд → рекомендует 3 pure + 2 hybrid архетипа (Step 2)
3. Пользователь выбирает до 5 архетипов
4. Claude генерирует 1 гипотезу на каждый выбранный архетип (Step 3)
5. Пользователь выбирает гипотезы и форматы (Step 4)
6. Для каждой гипотезы × каждый формат:
   a. Claude генерирует текст баннера (с учётом textRules архетипа)
   b. Формируется image prompt с визуальным стилем архетипа
   c. Вычисляется aspect ratio (GCD → ближайший поддерживаемый)
   d. POST /api/generate-banner → NanoBanana API → taskId
   e. Поллинг /api/banner-status каждые 5с (макс 40 попыток = 200с)
   f. При готовности: отображение баннера
7. Проект сохраняется в Supabase с полной историей итераций
```

---

## Система оплаты (Prodamus)

**Статус:** Частично реализовано

**Что сделано:**
- `ProdamusScript.tsx` — загрузка виджета (домен: pikaevdmitriy.payform.ru)
- `useProdamus.ts` — хук с `pay()` и `payWithDetails()`
- `useProdamusEvents.ts` — слушатель postMessage (success/close/waiting)
- `PayButton.tsx` — готовая кнопка
- `prodamus-webhook/route.ts` — верификация HMAC-SHA256 подписи
- Страницы success и cancel

**TODO (не реализовано):**
- Добавить `PRODAMUS_SECRET_KEY` в Vercel env
- Настроить URL вебхука в панели Prodamus
- Подключить PayButton в PricingSection
- Реализовать начисление кредитов в вебхуке
- Логика маппинга суммы оплаты → количество кредитов

---

## Дизайн-система

### Цвета (CSS variables)
```css
--accent: #C8FF00         /* лаймовый зелёный — основной акцент */
--background: #0A0A0A     /* чёрный фон */
--foreground: #FFFFFF      /* белый текст */
--border: rgba(255,255,255,0.1)
```

**Акцент:** `#C8FF00` (lime/neon green)
- Фон акцента: `rgba(200,255,0,0.1)`
- Бордер акцента: `rgba(200,255,0,0.2)`

**Семантические:**
- Success: `#4ade80`
- Error: `#ff6b6b`
- Фон карточек: `rgba(255,255,255,0.03)` – `0.06`
- Вторичный текст: `rgba(255,255,255,0.5)` – `0.7`

### Шрифты
- **Inter** — основной (latin + cyrillic)
- **Unbounded** — акцентный (latin + cyrillic)
- **DM Sans** — дополнительный (latin)

### Паттерны
- Тёмная тема по умолчанию
- Стеклянные карточки (glass-card)
- Скелетоны при загрузке (skeleton-shimmer)
- Адаптивный дизайн (mobile-first, Tailwind breakpoints)

---

## Lib-утилиты

### lib/anthropic.ts
```typescript
export async function analyzeArchetypes(data: AnalyzeRequest): Promise<AnalyzeResponse>
// Обёртка: POST /api/analyze, возвращает результат анализа
```

### lib/gemini.ts
```typescript
export async function generateBanner(data): Promise<{ imageUrl: string; prompt: string }>
// 1. POST /api/generate-banner → taskId
// 2. Поллинг /api/banner-status (20 попыток × 5с = 100с макс)
// 3. Возврат imageUrl + prompt

export function base64ToDataUrl(base64, mimeType): string
```

### lib/supabase.ts
```typescript
export const supabaseAdmin: SupabaseClient
export async function getCredits(userId): Promise<number>
export async function spendCredit(userId): Promise<boolean>
export async function saveProject(userId, data, existingId?): Promise<string | null>
export async function getProjects(userId): Promise<Project[]>
export async function getProject(projectId): Promise<Project | null>
```

### lib/resizeBanner.ts
```typescript
export const BANNER_DIMENSIONS: Record<string, { width: number; height: number }>
export async function resizeBanner(inputBuffer, formatId, outputFormat): Promise<Buffer>
// Sharp resize: fit='cover', position='centre'
```

---

## Гибридные архетипы (Archetype Crossing 🧬)

**Фича:** скрещивание двух архетипов для уникальных комбинаций

**API:** `recommend-archetypes-v2` возвращает 2 гибрида:
```typescript
interface HybridArchetype {
  ids: [string, string];       // ID обоих архетипов
  labels: [string, string];    // Названия
  icons: [string, string];     // Иконки
  hybridName: string;          // Синтез-название
  reason: string;              // Почему эта комбинация работает
  matchScore: number;          // Оценка совместимости
}
```

**UI:** фиолетовая тема, 🧬 бейдж, отдельная секция на Step 2

**Генерация гипотез:** через `generate-hybrid-hypothesis` action

---

## Известные TODO и проблемы

1. **Prodamus:** env key, webhook config, credit top-up, подключение в pricing UI
2. **Analytics:** используют моковые/захардкоженные данные
3. **Пагинация:** нет на GET /api/projects
4. **Хранение баннеров:** изображения хранятся на NanoBanana временно (нужно постоянное хранилище)
5. **Resize endpoint:** не подключён к flow скачивания
6. **Upload photo:** нет аутентификации! (security issue)
7. **Rate limiting:** нет на API routes
8. **Ребрендинг:** переименовать в "Creatika" (метаданные, тексты, лого)

---

## История коммитов (последние)

```
619c812 feat: archetype crossing — hybrid archetypes (3 pure + 2 hybrids)
42bcf2b feat: add refresh button to regenerate individual banners
114195f fix: auto-resize banners to exact dimensions via Sharp
ae73806 feat: integrate Prodamus payment widget (Единое Окно)
b4cbd94 fix: sequential banner generation to prevent NanoBanana API overload
51efb89 fix: update FAQ texts for archetypes and photo upload
13f4a5b feat: add FAQ section to landing page
a84987b fix: map non-standard aspect ratios to nearest supported for NanoBanana API
4b13825 feat: add Yandex, Google Ads, MyTarget, OK to platform chips in brief
c0c14f8 feat: 6 banner formats + ad platform selector
```

---

## Vercel конфигурация

```json
{
  "framework": "nextjs",
  "functions": {
    "app/api/generate-banner/route.ts": { "maxDuration": 120 },
    "app/api/analyze/route.ts": { "maxDuration": 120 },
    "app/api/resize-banner/route.ts": { "maxDuration": 60 }
  }
}
```

---

## Зависимости (package.json)

**Production:**
- `@anthropic-ai/sdk` ^0.24.0
- `@google/generative-ai` ^0.15.0 (пока не используется)
- `@supabase/supabase-js` ^2.97.0
- `next` 14.2.16
- `next-auth` ^4.24.13
- `react` / `react-dom` ^18
- `sharp` ^0.34.5

**Dev:**
- `typescript` ^5, `@types/*`, `eslint`, `tailwindcss` ^3.4.0, `postcss`, `autoprefixer`
