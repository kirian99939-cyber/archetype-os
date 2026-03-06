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
  created_at: string;
  updated_at: string;
}
