export interface BrandMeta {
  mission?: string;
  pains?: string;
  platforms?: string[];
  competitors?: string[];
  differentiator?: string;
  visual_style?: string;
  key_messages?: string;
  forbidden?: string;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  colors: string[];
  audience: string | null;
  utp: string | null;
  tone_of_voice: string | null;
  context: string | null;
  meta: BrandMeta | null;
  created_at: string;
  updated_at: string;
}
