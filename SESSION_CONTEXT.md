# SESSION_CONTEXT.md
> Контекст для продолжения разработки. Обновлён: 2026-02-25.
> Проект: **Архетип-Протокол** — AI-платформа для генерации рекламных баннеров на основе теории архетипов.
> Репозиторий: https://github.com/kirian99939-cyber/archetype-os
> Продакшн: https://archetype-os-tau.vercel.app

---

## 1. Стек

| Слой | Технология |
|---|---|
| Фреймворк | Next.js 14.2.16 (App Router) |
| Язык | TypeScript 5 |
| Стили | Tailwind CSS 3.4 + CSS-переменные |
| Авторизация | NextAuth v4 (стратегия JWT) |
| База данных | Supabase (PostgreSQL) |
| AI текст | Anthropic Claude Opus 4.6 |
| AI изображения | NanoBanana API (generate-pro endpoint) |
| Хранилище файлов | Supabase Storage |
| Деплой | Vercel |

---

## 2. Структура файлов

```
archetype-os/
├── app/
│   ├── layout.tsx                   # Корневой layout: шрифты (Inter, Unbounded, DM_Sans), AuthProvider, метаданные
│   ├── page.tsx                     # Корневой маршрут: redirect → /dashboard (авт.) или /landing (нет)
│   ├── globals.css                  # CSS-переменные, Tailwind, keyframes, компоненты (.btn-primary, .glass-card, etc.)
│   ├── landing/
│   │   └── page.tsx                 # Лендинг: hero, «Как работает», статистика, marquee с архетипами, CTA, footer
│   ├── dashboard/
│   │   └── page.tsx                 # Shell дашборда: sidebar, topbar, роутинг между страницами через state
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/route.ts  # NextAuth handler (не показан — стандартный)
│       ├── analyze/route.ts         # POST: 4 action-а через Claude — анализ архетипа, гипотезы, offer, suggest
│       ├── generate-banner/route.ts # POST: генерация баннера — Claude (текст) → NanoBanana (изображение)
│       ├── banner-status/route.ts   # GET ?taskId=: поллинг статуса задачи NanoBanana
│       ├── check-credits/route.ts   # GET: текущий баланс кредитов пользователя
│       ├── upload-photo/route.ts    # POST FormData: загрузка фото в Supabase Storage, возврат URL
│       └── projects/
│           ├── route.ts             # POST (создать проект) + GET (список проектов)
│           └── [id]/route.ts        # GET (один проект) + PATCH (обновить проект)
│
├── components/
│   ├── AuthProvider.tsx             # Обёртка SessionProvider (next-auth/react) — нужна для 'use client'
│   ├── DashboardPage.tsx            # Страница «Панель управления»: статистика (хардкод), быстрые действия, последние проекты (хардкод)
│   ├── NewProject.tsx               # ⭐ Главный компонент: 4-шаговый мастер создания проекта (см. §5)
│   ├── ArchetypesPage.tsx           # Библиотека архетипов: карточки с формулой, тегами, риском
│   ├── HistoryPage.tsx              # История проектов: реальные данные из Supabase, карточки с превью
│   ├── AnalyticsPage.tsx            # Аналитика: хардкод CTR-данные, таблица, AI-инсайт
│   ├── SettingsPage.tsx             # Настройки: сохранение Google API Key в localStorage (устарело)
│   ├── ArchetypeAnalyzer.tsx        # Legacy компонент (не используется в основном флоу)
│   └── BannerGenerator.tsx         # Legacy компонент (не используется в основном флоу)
│
├── lib/
│   ├── auth.ts                      # NextAuth authOptions: Google Provider, JWT стратегия, signIn/session callbacks
│   ├── supabase.ts                  # supabaseAdmin клиент + функции: getCredits, spendCredit, saveProject, getProjects, getProject
│   ├── archetypes.ts                # 26 архетипов: id, label, icon, audience, formula, risk, tags, platforms, textRules
│   ├── anthropic.ts                 # Тонкая обёртка: analyzeArchetypes() → POST /api/analyze
│   └── gemini.ts                    # Обёртка polling: generateBanner() → POST /api/generate-banner → GET /api/banner-status
│
├── vercel.json                      # maxDuration: generate-banner=120с, analyze=60с
├── package.json
└── SESSION_CONTEXT.md               # Этот файл
```

---

## 3. Переменные окружения

Все настраиваются в Vercel → Project Settings → Environment Variables.

| Переменная | Где используется | Описание |
|---|---|---|
| `NEXTAUTH_SECRET` | `lib/auth.ts`, все API routes (`getToken`) | Секрет для подписи JWT. Обязателен. |
| `NEXTAUTH_URL` | NextAuth internals | URL приложения (автоматически на Vercel) |
| `GOOGLE_CLIENT_ID` | `lib/auth.ts` → GoogleProvider | OAuth 2.0 Client ID из Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `lib/auth.ts` → GoogleProvider | OAuth 2.0 Client Secret |
| `SUPABASE_URL` | `lib/supabase.ts` | URL проекта Supabase (публичный) |
| `SUPABASE_SECRET_KEY` | `lib/supabase.ts` | service_role ключ Supabase (приватный!) |
| `ANTHROPIC_API_KEY` | `app/api/analyze/route.ts`, `app/api/generate-banner/route.ts` | Ключ Anthropic API |
| `NANO_BANANA_API_KEY` | `app/api/generate-banner/route.ts`, `app/api/banner-status/route.ts` | Ключ NanoBanana API |

> ⚠️ SUPABASE_SECRET_KEY — это service_role ключ. Он обходит RLS. Никогда не использовать на клиенте.

---

## 4. Архитектура базы данных (Supabase)

### Таблица `public.users`

| Колонка | Тип | По умолчанию | Описание |
|---|---|---|---|
| `id` | UUID | gen_random_uuid() PK | Уникальный ID пользователя |
| `email` | TEXT | NOT NULL UNIQUE | Email из Google OAuth |
| `name` | TEXT | NULL | Имя из Google |
| `avatar_url` | TEXT | NULL | URL аватара из Google (колонка `avatar_url`, НЕ `image`!) |
| `credits` | INTEGER | 3 | Баланс кредитов |
| `created_at` | TIMESTAMPTZ | NOW() | Дата создания |

> ⚠️ Исторический баг: колонка называется `avatar_url`, а не `image`. В NextAuth у `user` поле называется `user.image` — маппинг делается вручную в `lib/auth.ts`.

### Таблица `public.projects`

SQL для создания (если нет):
```sql
CREATE TABLE public.projects (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL,
  title       TEXT,
  brief       JSONB,
  archetype   JSONB,
  hypotheses  JSONB,
  banners     JSONB,
  status      TEXT        DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

| Колонка | Тип | Описание |
|---|---|---|
| `id` | UUID PK | Уникальный ID проекта |
| `user_id` | UUID | Владелец (FK → users.id, но без формального constraint) |
| `title` | TEXT | Название проекта (из brief.product) |
| `brief` | JSONB | Весь объект Brief (product, price, audience, goal, utp, offer, platforms, context, visualMode, imageUrls, imageLink) |
| `archetype` | JSONB | `{ id: string }` — выбранный архетип |
| `hypotheses` | JSONB | Массив NewHypothesis (idea, visual, headline, cta, hook) |
| `banners` | JSONB | Массив BannerGroup (hypothesisIndex, hypothesisTitle, banners[]) |
| `status` | TEXT | `draft` → `brief` → `archetype` → `hypotheses` → `completed` |
| `created_at` | TIMESTAMPTZ | Дата создания |
| `updated_at` | TIMESTAMPTZ | Дата последнего обновления |

### Supabase Storage

| Bucket | Доступ | Описание |
|---|---|---|
| `product-photos` | Публичный | Фото продуктов, загруженные пользователями (JPG/PNG/WEBP, max 10MB) |

---

## 5. Авторизация и сессия

### Схема работы NextAuth

1. Пользователь нажимает «Войти» → `signIn('google', { callbackUrl: '/dashboard' })`
2. Google OAuth → redirect обратно
3. **`signIn` callback** (`lib/auth.ts`):
   - Проверяет: есть ли пользователь в `public.users` по `email`
   - Если нет → создаёт запись (`credits: 3`, `avatar_url: user.image`)
   - Если есть → пропускает
4. **`session` callback** (`lib/auth.ts`):
   - При каждом обращении к сессии читает `id` и `credits` из `public.users`
   - Добавляет в `session.user.id` и `session.user.credits`
5. Клиент получает сессию через `useSession()` с полями `id`, `credits`, `name`, `email`, `image`

### Auth в API routes

**Критично**: использовать `getToken({ req, secret })` из `next-auth/jwt`, а НЕ `getServerSession()`.
`getServerSession` ненадёжно работает в App Router route handlers.

Паттерн `resolveUserId` (используется во всех project routes):
```ts
const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
if (!token?.email) return null;
const { data } = await supabaseAdmin.from('users').select('id').eq('email', token.email).maybeSingle();
return data?.id ?? null;
```

### TypeScript расширение сессии

В `lib/auth.ts` (или `types/next-auth.d.ts` если нужно) сессия дополнена:
- `session.user.id: string`
- `session.user.credits: number`

---

## 6. Флоу пользователя (шаг за шагом)

### Новый пользователь
1. `/` → redirect на `/landing`
2. Нажимает «Войти» / «Запустить идею» → Google OAuth
3. После auth → redirect на `/dashboard`
4. В БД создаётся запись users с `credits: 3`

### Создание проекта (`NewProject.tsx`)

**Шаг 1 — Бриф**:
- Поля: Продукт, Цена, Аудитория, Цель, УТП, Оффер (с AI-генерацией), Платформы, Контекст
- **Главный визуал** (3 режима):
  - 🤖 «Сгенерировать AI» — визуал генерирует NanoBanana без исходника
  - 📸 «Загрузить фото» — drag & drop, до 5 файлов, JPG/PNG/WEBP, max 10MB → `POST /api/upload-photo` → Supabase Storage → публичный URL
  - 🔗 «Вставить ссылку» — URL поля для готового изображения
- При нажатии «Далее»:
  - Создаётся проект: `POST /api/projects` → возвращает `id`
  - `id` сохраняется в `localStorage['archetype_draft_project']` и в state `projectIdRef`
  - Переход к шагу 2

**Шаг 2 — Архетип**:
- AI анализирует бриф: `POST /api/analyze` action=`suggest-archetype`
- Показывает топ-3 архетипа с процентом совпадения
- Пользователь выбирает (или AI выбирает автоматически)
- При «Далее»: `PATCH /api/projects/[id]` с `{ archetype: { id }, status: 'archetype' }`

**Шаг 3 — Гипотезы**:
- AI генерирует 5 гипотез: `POST /api/analyze` action=`generate-hypotheses`
- Пользователь выбирает 1–3 гипотезы
- При «Далее»: `PATCH /api/projects/[id]` с `{ hypotheses, archetype, status: 'hypotheses' }`

**Шаг 4 — Баннеры**:
- Предварительная проверка кредитов: `GET /api/check-credits`
- Если credits = 0 → модальное окно «Нет кредитов», генерация не запускается
- Для каждой выбранной гипотезы × 3 формата (Feed 1:1, Stories 9:16, Banner 16:9):
  - `POST /api/generate-banner` с `isFirstBanner: true` только для первого запроса
  - Возвращает `taskId`
  - Поллинг: `GET /api/banner-status?taskId=` каждые 5 секунд, max 20 попыток
  - При готовности → `imageUrl` отображается в UI
- Когда все баннеры готовы → `PATCH /api/projects/[id]` с `{ banners, status: 'completed' }`

### Возврат к незавершённому проекту

При заходе на `/dashboard` → NewProject монтируется и:
1. Проверяет `localStorage['archetype_draft_project']`
2. Если есть → показывает модалку «Продолжить / Начать заново»
3. «Продолжить»: `GET /api/projects/[id]` → восстанавливает brief/archetype/hypotheses/banners, переходит на нужный шаг
4. «Начать заново»: очищает localStorage

### История проектов (`HistoryPage.tsx`)

- `GET /api/projects` — список проектов текущего пользователя (сортировка: updated_at DESC)
- Карточки: превью баннера (первый imageUrl), статус, название, дата, архетип-чип, счётчик баннеров
- «Продолжить →» (не completed) или «Открыть» (completed) → записывает id в localStorage → переходит в NewProject

---

## 7. Генерация баннеров (технические детали)

### `POST /api/generate-banner`

**Порядок операций** (ВАЖНО — нельзя менять):
1. Проверка `NANO_BANANA_API_KEY`
2. `getToken` — авторизация (без email → 401)
3. Lookup пользователя в `users` по email (нет в БД → создать с credits: 3)
4. `if (credits <= 0)` → 403 `NO_CREDITS` — до любых AI вызовов
5. `if (isFirstBanner)` → `spendCredit(userId)` — списание только за первый в пакете
6. Claude Opus: генерация текста баннера (headline, offer, cta) согласно `textRules` архетипа
7. `buildImagePrompt()` → финальный промт для NanoBanana
8. `POST nanobananaapi.ai/api/v1/nanobanana/generate-pro` → возвращает `taskId`

### Поллинг `GET /api/banner-status?taskId=`

- `GET nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=`
- `ready = successFlag === 1 && resultImageUrl`
- imageUrl берётся из: `data.response.resultImageUrl` или `data.result_urls[0]`

### Форматы баннеров

| Key | Label | Width | Height | Ratio |
|---|---|---|---|---|
| `feed` | Feed | 1080 | 1080 | 1:1 |
| `stories` | Stories | 1080 | 1920 | 9:16 |
| `banner` | Banner | 1280 | 720 | 16:9 |

### Кредитная система

- Новый пользователь получает 3 кредита при регистрации
- 1 кредит = 1 пакет (все форматы для всех гипотез за раз)
- Списание: `isFirstBanner: true` только у первого из всех параллельных запросов
- Предпроверка на клиенте: `GET /api/check-credits` перед стартом генерации

---

## 8. Интеграции

### Google OAuth

- Провайдер: `next-auth/providers/google`
- Client ID/Secret: Google Cloud Console → Credentials → OAuth 2.0
- Authorized redirect URI: `https://archetype-os-tau.vercel.app/api/auth/callback/google`
- Локально: `http://localhost:3000/api/auth/callback/google`

### Supabase

- Клиент: `supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)` — только server-side
- Таблицы: `users`, `projects`
- Storage bucket: `product-photos` (публичный)
- RLS: отключён (используем service_role key, проверяем ownership вручную через `user_id`)

### Anthropic Claude (claude-opus-4-6)

Используется в двух местах:

1. **`/api/analyze`** — 4 action-а:
   - `suggest-archetype`: анализирует бриф → топ-3 архетипа + positioning
   - `generate-hypotheses`: 5 гипотез строго под выбранный архетип
   - `generate-offer`: 2 оффера по бриф
   - (default): полный анализ (legacy для ArchetypeAnalyzer)

2. **`/api/generate-banner`** — генерация текстов для баннера:
   - Зависит от `textRules` архетипа: `level` (minimal/medium/full), `style`, `includeOffer`, `includeCta`
   - Возвращает JSON `{ headline, offer, cta }`

### NanoBanana API

- Endpoint генерации: `POST https://api.nanobananaapi.ai/api/v1/nanobanana/generate-pro`
- Endpoint статуса: `GET https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=`
- Payload: `{ prompt, resolution: '2K', aspectRatio, imageUrls? }`
- Таймаут Vercel для route: 120 секунд
- Поллинг: клиент опрашивает каждые 5с, max 20 попыток (100 секунд суммарно)

---

## 9. Исправленные баги

| Баг | Симптом | Причина | Исправление |
|---|---|---|---|
| **avatar_url vs image** | Аватар не сохранялся в БД | Колонка в Supabase — `avatar_url`, но в NextAuth `user.image` | В `lib/auth.ts` signIn callback: `avatar_url: user.image ?? null` |
| **getServerSession в route handlers** | Сессия не работала в API routes | `getServerSession` ненадёжен в App Router | Заменить на `getToken({ req, secret })` во всех API routes |
| **Кредиты проверялись после NanoBanana** | Можно было генерировать с 0 кредитами | `if (isFirstBanner)` блок включал проверку И списание | Вынести проверку кредитов до любых AI вызовов, списание оставить внутри isFirstBanner |
| **`const` внутри объекта** | Синтаксическая ошибка TypeScript | `briefImageUrls` была объявлена между `headers:` и `body:` внутри fetch options | Перенести объявление переменной до `try` блока |
| **Projects не сохранялись** | Проекты не появлялись в Supabase | `getServerSession` возвращал null в POST /api/projects | Заменить на `resolveUserId` с `getToken` + lookup по email |

---

## 10. CSS и дизайн-система

### Переменные

```css
--background: #0A0A0A        /* Основной фон */
--foreground: #ededed        /* Основной текст */
--accent: #C8FF00            /* Акцент (кислотно-зелёный) */
--accent-hover: #b3e600      /* Акцент при hover */
--accent-muted: rgba(200,255,0,0.1)
--border: rgba(255,255,255,0.08)
--text-muted: rgba(255,255,255,0.5)
--sidebar-width: 200px
--font-display: Unbounded (заголовки)
--font-body: DM Sans / Inter (текст)
```

### Компоненты (globals.css)

- `.glass-card` — полупрозрачная карточка с blur
- `.btn-primary` — кислотно-зелёная кнопка
- `.btn-secondary` — белая/прозрачная
- `.btn-outline` — кнопка с рамкой
- `.input-field` — инпут с акцентным focus
- `.skeleton-shimmer` — анимация загрузки
- `.banner-fade-in` — появление баннера

---

## 11. Известные проблемы

1. **DashboardPage — хардкод данных**
   - «Метрики» и «Последние проекты» используют захардкоженные данные
   - Нужно подключить реальные данные из Supabase

2. **AnalyticsPage — хардкод**
   - CTR-данные полностью фиктивные
   - Нет реальной аналитики кликов/показов

3. **SettingsPage — Google API Key не используется**
   - UI для сохранения ключа в localStorage есть, но ключ нигде не подключён к генерации
   - `lib/gemini.ts` существует, но Gemini не интегрирован в основной флоу

4. **Нет управления кредитами**
   - Нет способа пополнить баланс (нет Stripe/оплаты)
   - Нет страницы для admin-пополнения

5. **Projects не связаны с users через FK**
   - В Supabase нет формального FK constraint на `projects.user_id → users.id`
   - Ownership проверяется вручную через `.eq('user_id', userId)` в каждом route

6. **Нет пагинации в HistoryPage**
   - `GET /api/projects` возвращает ВСЕ проекты без limit/offset
   - При большом количестве — производительность упадёт

7. **Нет удаления проектов**
   - В HistoryPage нет кнопки удаления проекта
   - Нет `DELETE /api/projects/[id]` endpoint

8. **Polling у баннеров — нет cancellation**
   - Если пользователь уходит со страницы во время генерации, `setInterval` продолжает работать
   - Нужен `clearInterval` в useEffect cleanup

9. **banner-status — отладочный debug в ответе**
   - `GET /api/banner-status` возвращает `debug: statusData` в ответе
   - Нужно убрать перед production-запуском

10. **ArchetypeAnalyzer и BannerGenerator — legacy**
    - Компоненты существуют, но не используются в основном флоу
    - Могут быть удалены

---

## 12. Бэклог (что нужно сделать)

### Высокий приоритет

- [ ] **Реальные данные в DashboardPage** — подключить `GET /api/projects` для «Последних проектов», реальные кредиты из сессии
- [ ] **Удаление проектов** — кнопка в HistoryPage + `DELETE /api/projects/[id]`
- [ ] **Пагинация / infinite scroll** в HistoryPage
- [ ] **Система пополнения кредитов** — Stripe или ручное через Supabase

### Средний приоритет

- [ ] **Просмотр готового проекта** — полноэкранный просмотр баннеров с возможностью скачать
- [ ] **Скачивание баннеров** — кнопка download для каждого баннера
- [ ] **Реальная аналитика** — трекинг созданных проектов/баннеров на реальных данных
- [ ] **Cleanup polling** — `clearTimeout` при unmount в NewProject.tsx

### Низкий приоритет

- [ ] **Удалить legacy компоненты** — ArchetypeAnalyzer.tsx, BannerGenerator.tsx
- [ ] **Очистить SettingsPage** — убрать Google API Key если Gemini не планируется
- [ ] **Убрать `debug` из banner-status ответа**
- [ ] **FK constraint** в Supabase: `projects.user_id → users.id`
- [ ] **RLS политики** в Supabase как альтернатива ручным ownership-проверкам

---

## 13. Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev
# → http://localhost:3000
```

Файл `.env.local` (создать в корне, не коммитить):
```
NEXTAUTH_SECRET=<любая-строка-32+-символа>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<из Google Cloud Console>
GOOGLE_CLIENT_SECRET=<из Google Cloud Console>
SUPABASE_URL=<из Supabase Settings → API>
SUPABASE_SECRET_KEY=<service_role key из Supabase>
ANTHROPIC_API_KEY=<из console.anthropic.com>
NANO_BANANA_API_KEY=<из NanoBanana дашборда>
```

## 14. Деплой

```bash
# Деплой в продакшн
npx vercel --prod --yes

# Или через git push (если настроен автодеплой)
git add . && git commit -m "message" && git push origin main
```

Vercel автоматически подтягивает env vars из Project Settings.

---

## 15. Важные паттерны и соглашения

### Server-side auth (ВСЕГДА использовать этот паттерн)
```ts
import { getToken } from 'next-auth/jwt';
const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// затем lookup в Supabase по email
```

### Проект — projectIdRef vs projectId state
В NewProject.tsx используются оба:
- `projectIdRef` (useRef) — для немедленного доступа в async callbacks без stale closure
- `projectId` (useState) — для рендера

### Auto-save (fire-and-forget)
```ts
const patchProject = (data: ProjectPayload) => {
  if (!projectIdRef.current) return;
  fetch(`/api/projects/${projectIdRef.current}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }); // намеренно без await — не блокируем UI
};
```

### localStorage ключ для resume
```ts
const LS_KEY = 'archetype_draft_project';
// Значение: { id: string, title: string }
```

### Статусы проекта
```
draft → brief → archetype → hypotheses → completed
```
- `draft`: только создан (нет данных)
- `brief`: шаг 1 заполнен
- `archetype`: шаг 2 выбран
- `hypotheses`: шаг 3 выбраны
- `completed`: баннеры сгенерированы
