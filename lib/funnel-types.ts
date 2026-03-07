export type FunnelPlatform = 'avito' | 'marketplace' | 'instagram' | 'stories';
export type InstagramSubtype = 'product' | 'expert' | 'personal' | 'educational';

export interface PlatformConfig {
  label: string;
  emoji: string;
  description: string;
  defaultSlides: number;
  minSlides: number;
  maxSlides: number;
  format: { width: number; height: number };
  style: string;
  slideStructure: string[];
  subtypes?: Record<InstagramSubtype, { label: string; slideStructure: string[] }>;
}

export const PLATFORM_CONFIG: Record<FunnelPlatform, PlatformConfig> = {
  avito: {
    label: 'Авито',
    emoji: '🏠',
    description: 'Фотоворонка для объявления',
    defaultSlides: 6,
    minSlides: 3,
    maxSlides: 10,
    format: { width: 1080, height: 1080 },
    style: 'product-focused',
    slideStructure: [
      'Главное фото товара с ценой',
      'Товар в использовании',
      'Детали и характеристики',
      'Комплектация',
      'Социальное доказательство',
      'CTA — как купить',
    ],
  },
  marketplace: {
    label: 'Маркетплейс',
    emoji: '🛒',
    description: 'Карточка для Ozon / Wildberries',
    defaultSlides: 6,
    minSlides: 4,
    maxSlides: 8,
    format: { width: 1000, height: 1000 },
    style: 'infographic',
    slideStructure: [
      'Главное фото — белый фон, название и УТП',
      'Инфографика — ключевые характеристики',
      'Lifestyle фото',
      'Размеры / состав / детали',
      'Комплектация',
      'Ответы на частые вопросы',
    ],
  },
  instagram: {
    label: 'Instagram карусель',
    emoji: '📸',
    description: 'Карусель для ленты',
    defaultSlides: 5,
    minSlides: 3,
    maxSlides: 10,
    format: { width: 1080, height: 1080 },
    style: 'storytelling',
    slideStructure: [
      'Хук — боль',
      'Усиление боли',
      'Решение — продукт',
      'Результат',
      'CTA + оффер',
    ],
    subtypes: {
      product: {
        label: 'Продуктовая',
        slideStructure: ['Хук — боль', 'Усиление боли', 'Решение — продукт', 'Результат', 'CTA + оффер'],
      },
      expert: {
        label: 'Экспертная',
        slideStructure: ['Хук — обещание пользы', 'Пункт 1', 'Пункт 2', 'Пункт 3', 'Вывод + подписка'],
      },
      personal: {
        label: 'Личная история',
        slideStructure: ['Хук — интригующее начало', 'Проблема/ситуация', 'Поворот', 'Результат/вывод', 'CTA'],
      },
      educational: {
        label: 'Обучающая',
        slideStructure: ['Хук — что узнаешь', 'Шаг 1', 'Шаг 2', 'Шаг 3', 'Итог + сохрани'],
      },
    },
  },
  stories: {
    label: 'Сторис для таргета',
    emoji: '⚡',
    description: 'Вертикальные сторис 9:16',
    defaultSlides: 3,
    minSlides: 2,
    maxSlides: 5,
    format: { width: 1080, height: 1920 },
    style: 'bold-minimal',
    slideStructure: [
      'Хук — боль или провокация',
      'Решение — оффер',
      'CTA — действие',
    ],
  },
};
