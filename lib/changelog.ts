export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: {
    type: 'feature' | 'fix' | 'improvement';
    text: string;
  }[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.6.0',
    date: '2026-02-28',
    title: 'Большое обновление',
    items: [
      { type: 'feature', text: 'Новая система кредитов — 10 кредитов за действие, прозрачная стоимость' },
      { type: 'feature', text: 'Обновлённые тарифы: Старт (1 990₽), Про (6 990₽), Бизнес (12 990₽)' },
      { type: 'feature', text: '100 бесплатных кредитов при регистрации' },
      { type: 'feature', text: 'Реферальная программа — приглашай друзей, получай кредиты' },
      { type: 'feature', text: 'Проекты теперь сохраняются — можно вернуться и продолжить' },
      { type: 'feature', text: 'Workspace с вкладками для завершённых проектов' },
      { type: 'feature', text: 'Tone of Voice — выбирай стиль общения в брифе' },
      { type: 'feature', text: 'Два новых архетипа: Соблазн 🔥 и Чёрный ящик 📦' },
      { type: 'feature', text: 'Умные safe zones — текст не попадает под кнопки соцсетей' },
      { type: 'feature', text: 'AI сам решает, где использовать ваше фото' },
      { type: 'improvement', text: 'Анимированный логотип при загрузке' },
      { type: 'improvement', text: 'Весёлые надписи при генерации баннеров' },
      { type: 'improvement', text: 'Подсказки в полях УТП и Оффер' },
      { type: 'improvement', text: 'Новый SVG-логотип Креатика' },
      { type: 'fix', text: 'Текст больше не дублируется на баннерах' },
      { type: 'fix', text: 'Баннеры не дублируются при навигации назад-вперёд' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-02-28',
    title: 'Большое обновление',
    items: [
      { type: 'feature', text: 'Новая система кредитов — 10 кредитов за действие' },
      { type: 'feature', text: 'Обновлённые тарифы: Старт, Про, Бизнес' },
      { type: 'feature', text: 'Реферальная программа — приглашай друзей, получай кредиты' },
      { type: 'feature', text: 'Tone of Voice — выбирай стиль общения в брифе' },
      { type: 'feature', text: 'Два новых архетипа: Соблазн и Чёрный ящик' },
      { type: 'feature', text: 'Умные safe zones — текст не попадает под кнопки соцсетей' },
      { type: 'feature', text: 'AI сам решает, где использовать ваше фото' },
      { type: 'improvement', text: 'Анимированный логотип при загрузке' },
      { type: 'improvement', text: 'Весёлые надписи при генерации баннеров' },
      { type: 'improvement', text: 'Подсказки в полях УТП и Оффер' },
      { type: 'fix', text: 'Текст больше не дублируется на баннерах' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-02-28',
    title: 'Умные баннеры и Tone of Voice',
    items: [
      { type: 'feature', text: 'Выбор Tone of Voice в брифе — дружелюбный, профессиональный, провокационный или экспертный' },
      { type: 'feature', text: 'Умное использование фото — AI сам решает, где уместно фото спикера' },
      { type: 'improvement', text: 'Улучшенное размещение текста на баннерах — учёт слепых зон соцсетей' },
      { type: 'improvement', text: 'Подсказки для полей УТП и Оффер в брифе' },
      { type: 'fix', text: 'Исправлено дублирование текста на баннерах' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-02-27',
    title: 'Гибридные архетипы и оплата',
    items: [
      { type: 'feature', text: 'Скрещивание архетипов — 2 гибридные комбинации для уникальных гипотез' },
      { type: 'feature', text: 'Подключение системы оплаты Prodamus' },
      { type: 'feature', text: 'Рефреш отдельных баннеров (до 3 раз бесплатно)' },
      { type: 'improvement', text: '6 форматов баннеров + выбор рекламных платформ' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-02-20',
    title: 'Запуск бета-тестирования',
    items: [
      { type: 'feature', text: '4-шаговый wizard: бриф → архетип → гипотезы → баннеры' },
      { type: 'feature', text: '26 психологических архетипов с полными описаниями' },
      { type: 'feature', text: 'AI-генерация рекламных гипотез на основе архетипов' },
      { type: 'feature', text: 'Генерация баннеров через NanoBanana API' },
    ],
  },
];

// Последняя версия — для проверки, видел ли пользователь
export const LATEST_VERSION = changelog[0].version;
