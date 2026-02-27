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
