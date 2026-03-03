# Archetype OS — Архитектура проекта

> Живой документ. Обновляется при каждом значимом изменении проекта.
> Последнее обновление: 03.03.2026

---

## 📌 Что такое Archetype OS

Инструмент для перформанс-маркетологов и таргетологов. Помогает быстро подобрать рекламный архетип под продукт, сгенерировать гипотезы и баннеры для тестирования.

**Целевая аудитория:** таргетологи, перформанс-маркетологи, небольшие агентства, малый бизнес (Россия, СНГ).

**Ценность:** от брифа до готового баннера за 5 минут вместо нескольких часов.

---

## 🏗️ Продуктовые блоки

### Блок 1 — Бриф
**Что делает:** собирает информацию о продукте перед генерацией.

**Поля:**
- Название продукта
- Описание продукта
- Целевая аудитория
- Платформа (VK, Instagram, TikTok и др.)
- Цель рекламы (трафик, лиды, продажи)
- Бюджет / сегмент (эконом / средний / премиум)

**Статус:** ✅ Работает  
**Файл:** `components/NewProject.tsx` (шаг 1)

---

### Блок 2 — Подбор архетипа
**Что делает:** анализирует бриф через Claude API и рекомендует подходящий архетип из 26 вариантов. Также можно выбрать архетип вручную.

**27 архетипов:**
Мем, Трендовый, Эстетический, Кринжовый, WOW-архетип, Кислотный, Жиза, Премиум, Ностальгический, Сюжетный, Соцдоказательство, Шок/провокация, Научный, ASMR/Мягкий, Геймификация, AI-Сюрреализм, Культурный код, Гиперболизация, Синематический, Котоархетип, Экологичный, Милота, POV, Ассоциация с персоной, Чем хуже тем лучше, Соблазн, Чёрный ящик

**Статус:** ✅ Работает  
**Файлы:**
- `components/NewProject.tsx` (шаг 2, UI)
- `app/api/analyze/route.ts` (Claude API)
- `lib/archetypes.ts` (единая база архетипов)

---

### Блок 3 — Гипотезы
**Что делает:** Claude генерирует 3-5 рекламных гипотез под выбранный архетип и бриф.

**Формат гипотезы:**
- Заголовок
- Описание концепции
- Ожидаемый эффект

**Статус:** ✅ Работает  
**Файл:** `components/NewProject.tsx` (шаг 3)

---

### Блок 4 — Генерация баннеров
**Что делает:** генерирует баннеры в 6 форматах на основе выбранных гипотез.

**6 форматов:**
- 1080x1080 — Лента квадрат
- 1080x1350 — Лента вертикальный
- 1080x1920 — Stories / Клипы
- 1920x1080 — Горизонтальный
- 1080x607 — Пост широкий
- 240x400 — РСЯ баннер

**Как работает:**
1. `POST /api/generate-banner` → Claude (текст баннера) → NanoBanana generate-pro → `taskId`
2. Браузер делает polling `GET /api/banner-status?taskId=xxx` каждые 5 секунд (MAX_POLL=40)
3. Когда `successFlag === 1` → показывает картинку из `data.response.resultImageUrl`

**Статус:** ✅ Работает
**Файлы:**
- `hooks/useBannerGeneration.ts` (фронт: запуск + polling)
- `app/api/generate-banner/route.ts` (Claude текст + NanoBanana изображение)
- `app/api/banner-status/route.ts` (polling через NanoBanana record-info)
- `components/ProjectWorkspace.tsx` (отображение баннеров в проекте)
- `components/NewProject.tsx` (шаг 4, UI визарда)

**Известные проблемы:**
- Картинки хранятся на серверах реселлера временно — нужно скачивать

---

### Блок 5 — История генераций
**Что делает:** показывает список всех созданных проектов с результатами.

**Статус:** ✅ Работает (реальные данные из Supabase)
**Файл:** `components/HistoryPage.tsx`

---

### Блок 6 — Аналитика
**Что делает:** показывает CTR по архетипам, статистику генераций, AI-инсайты.

**Статус:** 🟡 Мок-данные (UI готов)  
**Файл:** `components/AnalyticsPage.tsx`  
**Приоритет:** низкий (нужны реальные данные)

---

### Блок 7 — Настройки
**Что делает:** управление API ключами, профиль, предпочтения.

**Статус:** 🟡 Частично работает  
**Файл:** `components/SettingsPage.tsx`

---

## ⚙️ Технические блоки

### API интеграции

| Сервис | Модель | Для чего | Ключ | Лимиты |
|--------|--------|----------|------|---------|
| Anthropic Claude | claude-opus-4-6 | Анализ брифа, гипотезы, текст баннеров | `ANTHROPIC_API_KEY` | По токенам |
| NanoBanana API | nano-banana-pro (Gemini 3 Pro Image) | Генерация баннеров | `NANO_BANANA_API_KEY` | По кредитам |
| Google Gemini | — | Не используется (заменён NanoBanana) | `GOOGLE_API_KEY` | — |

---

### База архетипов
**Файл:** `lib/archetypes.ts`
Единый источник правды для 27 архетипов. Содержит: `id`, `label`, `icon`, `audience`, `categories`, `formula`, `risk`, `tags`, `platforms`, `textRules`.

**Визуальные стили:** `archetypeVisualMap` в `app/api/generate-banner/route.ts`
**Negative prompts:** `archetypeNegativePrompts` в `app/api/generate-banner/route.ts`

При добавлении нового архетипа — обновить `lib/archetypes.ts` + `archetypeVisualMap` + `archetypeNegativePrompts` (если нужен).

---

### Переменные окружения

```env
ANTHROPIC_API_KEY=sk-ant-...       # Claude API
NANO_BANANA_API_KEY=...            # NanoBanana Pro API
GOOGLE_API_KEY=AIza...             # Google (не используется)
```

Хранятся в:
- Локально: `.env.local` (не в Git)
- Продакшн: Vercel → Settings → Environment Variables

---

## 🗂️ Структура файлов

```
archetype-os/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts          # Claude API — анализ брифа
│   │   ├── generate-banner/route.ts  # NanoBanana — запуск генерации
│   │   └── banner-status/route.ts    # NanoBanana — polling статуса
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Корневой компонент, рендерит sidebar + страницы
├── components/
│   ├── NewProject.tsx                # 4-шаговый флоу (Бриф → Архетип → Гипотезы → Баннеры)
│   ├── ArchetypesPage.tsx            # Библиотека всех 26 архетипов
│   ├── DashboardPage.tsx             # Панель управления со статистикой
│   ├── HistoryPage.tsx               # История генераций (заглушка)
│   ├── AnalyticsPage.tsx             # Аналитика (мок)
│   ├── SettingsPage.tsx              # Настройки
│   ├── ArchetypeAnalyzer.tsx         # Компонент анализа
│   └── BannerGenerator.tsx           # Компонент генератора
├── lib/
│   ├── archetypes.ts                 # База 26 архетипов (единый источник)
│   ├── anthropic.ts                  # Клиент Anthropic
│   └── gemini.ts                     # Клиент Gemini (не используется)
├── vercel.json                       # Настройки деплоя (maxDuration 60s)
├── ARCHITECTURE.md                   # Этот файл
└── .env.example                      # Шаблон переменных окружения
```

---

## 🚀 Деплой

**Продакшн:** https://archetype-os-tau.vercel.app  
**Репозиторий:** https://github.com/kirian99939-cyber/archetype-os  

**Процесс деплоя:**
```bash
git add .
git commit -m "feat/fix/refactor: описание изменений"
git push
# Vercel автоматически деплоит из ветки main
```

**Конвенция коммитов:**
- `feat:` — новая функция
- `fix:` — исправление бага
- `refactor:` — улучшение кода без изменения функционала
- `docs:` — обновление документации
- `chore:` — служебные изменения (зависимости, конфиги)

---

## Pipeline генерации баннеров (КРИТИЧНО)

> Эти файлы — самая хрупкая часть системы. Менять ТОЛЬКО после тестирования на /test

**Файлы (в порядке вызова):**
1. `hooks/useBannerGeneration.ts` — фронт: запуск + polling (MAX_POLL=40, INTERVAL=5000ms)
2. `app/api/generate-banner/route.ts` — Claude текст + NanoBanana изображение
3. `app/api/banner-status/route.ts` — polling через NanoBanana record-info
4. `components/ProjectWorkspace.tsx` — отображение баннеров

**Поток:**
```
Фронт → POST /api/generate-banner → Claude (текст) → NanoBanana generate-pro (taskId)
Фронт → GET /api/banner-status?taskId=xxx (каждые 5 сек, до 40 раз)
         → NanoBanana record-info → successFlag === 1 → imageUrl → фронт
```

---

## NanoBanana API (ресселер nanobananaapi.ai)

**Документация:** https://docs.nanobananaapi.ai/

**Endpoints:**
- `POST /api/v1/nanobanana/generate-pro` — создание задачи → `{ data: { taskId } }`
- `GET /api/v1/nanobanana/record-info?taskId=xxx` — статус задачи

**record-info ответ:**
- `successFlag`: 0 = генерируется, 1 = готово, 2 = ошибка создания, 3 = ошибка генерации
- Когда готово: `data.response.resultImageUrl` — URL картинки
- Генерация занимает 15-60 секунд

**Callback (альтернатива polling, пока НЕ используется в проде):**
- `callBackUrl` передаётся в generate-pro
- NanoBanana шлёт POST с `data.info.resultImageUrl` (ДРУГОЙ формат чем record-info!)
- Docs: https://docs.nanobananaapi.ai/nanobanana-api/generate-image-pro-callbacks
- Endpoint готов: `/api/nanobanana-callback` + таблица `banner_tasks` в Supabase

---

## Тестовая страница /test

Прямая генерация через NanoBanana без основного pipeline.
Используй для диагностики:
- `/test` работает, основной flow нет → проблема в нашем коде
- `/test` не работает → проблема в NanoBanana API или ключе

**Файлы:**
- `app/test/page.tsx` — UI
- `app/api/test-generate/route.ts` — API (generate-pro + polling record-info в одном запросе)

---

## Система кредитов (v1.7)

- 10 кредитов = 1 баннер (1 формат)
- Кредиты списываются ПОСЛЕ успешной генерации (не до)
- При ошибке генерации кредиты НЕ списываются
- 100 бесплатных кредитов при регистрации
- Пополнение через Prodamus
- Оптимистичный lock: `UPDATE SET credits = credits - 10 WHERE credits = текущее_значение`

---

## Supabase таблицы

**Основные:**
- `users` — пользователи + кредиты (100 при регистрации)
- `projects` — проекты с архетипами, гипотезами, баннерами (JSONB)

**Дополнительные:**
- `banner_tasks` — callback от NanoBanana (task_id PK, status, image_url) — готово, но не в проде
- `trends` — автообновление трендов для архетипа "trend"

---

## v1.7 изменения (2 марта 2026)

- [x] Кредиты: 10 за баннер, списание после генерации
- [x] Editable brief в workspace
- [x] Admin banner gallery
- [x] Admin analytics dashboard с графиками
- [x] force-dynamic на всех API routes
- [x] Тестовая страница /test для NanoBanana
- [x] Callback endpoint для NanoBanana (готов, не в проде)
- [x] Rewrite banner text prompt — строгие лимиты слов

---

## 📋 Бэклог задач

### 🔴 Высокий приоритет
- [ ] Постоянное хранилище баннеров (временные URL от NanoBanana)
- [ ] Интеграция callback для надёжной доставки баннеров

### 🟡 Средний приоритет
- [ ] Аналитика на реальных данных
- [ ] Кастомные архетипы пользователя
- [ ] Rate limiting на API routes

### 🟢 Низкий приоритет
- [ ] Экспорт в PDF / ZIP
- [ ] Ребрендинг в Creatika (метаданные, тексты)

---

## 📝 Как вести документацию

1. **При каждом изменении блока** — обновлять статус в этом файле
2. **При добавлении нового блока** — создавать раздел по шаблону выше
3. **Коммитить вместе с кодом** — `docs: обновить ARCHITECTURE.md`
4. **Известные проблемы** — фиксировать сразу, не держать в голове
