// ─── Shared project types & constants ────────────────────────────────────────
// Используются в NewProject, ProjectWorkspace, useBannerGeneration и других модулях

export type VisualMode = 'ai' | 'upload' | 'link';

export interface Brief {
  product:      string;
  price:        string;
  audience:     string;
  goal:         string;
  utp:          string;
  offer:        string;
  toneOfVoice:  string;
  platforms:    string[];
  context:      string;
  visualMode:   VisualMode;
  imageUrls:    string[];
  imageLink:    string;
}

export interface BannerItem {
  key:      string;
  label:    string;
  sublabel: string;
  width:    number;
  height:   number;
  taskId:   string | null;
  imageUrl: string | null;
  loading:  boolean;
  error:    string | null;
  refreshCount:     number;
  previousVersions: string[];
}

export interface BannerGroup {
  hypothesisIndex: number;
  hypothesisTitle: string;
  banners: BannerItem[];
}

/** Полный тип проекта из БД */
export interface ProjectData {
  id:              string;
  user_id:         string;
  title:           string | null;
  status:          string | null;
  brief:           Brief | null;
  archetype:       { id: string; [key: string]: unknown } | null;
  archetypes:      { id: string; [key: string]: unknown }[] | null;
  hypotheses:      any[] | null;
  banners:         BannerGroup[] | null;
  banner_history:  any[] | null;
  selected_formats?: string[] | null;
  created_at:      string;
  updated_at:      string;
}

export const BANNER_FORMATS = [
  // Соцсети
  { key: 'feed',         label: 'Лента квадрат',      sublabel: '1080×1080',  width: 1080, height: 1080, group: 'social' },
  { key: 'feed_vertical',label: 'Лента вертикальный',  sublabel: '1080×1350',  width: 1080, height: 1350, group: 'social' },
  { key: 'stories',      label: 'Stories / Клипы',     sublabel: '1080×1920',  width: 1080, height: 1920, group: 'social' },
  // Видео и сайты
  { key: 'banner',       label: 'Горизонтальный',      sublabel: '1920×1080',  width: 1920, height: 1080, group: 'media' },
  { key: 'post_wide',    label: 'Пост широкий',        sublabel: '1080×607',   width: 1080, height: 607,  group: 'media' },
  // Рекламные сети
  { key: 'rsya_vertical', label: 'РСЯ баннер',         sublabel: '240×400',    width: 240,  height: 400,  group: 'adnetwork' },
] as const;

export type BannerFormatKey = typeof BANNER_FORMATS[number]['key'];

export const AD_PLATFORMS = [
  {
    key: 'vk',
    label: 'VK Реклама',
    icon: '📱',
    formats: ['feed', 'feed_vertical', 'stories', 'post_wide'] as BannerFormatKey[],
  },
  {
    key: 'yandex',
    label: 'Яндекс Директ',
    icon: '🔍',
    formats: ['feed', 'post_wide', 'rsya_vertical'] as BannerFormatKey[],
  },
  {
    key: 'telegram',
    label: 'Telegram Ads',
    icon: '✈️',
    formats: ['banner', 'post_wide'] as BannerFormatKey[],
  },
  {
    key: 'mytarget',
    label: 'MyTarget (ОК)',
    icon: '🎯',
    formats: ['feed', 'post_wide', 'rsya_vertical'] as BannerFormatKey[],
  },
  {
    key: 'google',
    label: 'Google Ads',
    icon: '🌐',
    formats: ['feed', 'feed_vertical', 'banner'] as BannerFormatKey[],
  },
] as const;
