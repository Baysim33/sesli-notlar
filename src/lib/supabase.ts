import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type NoteCategory = 'Ders' | 'Teknik' | 'Görevler' | 'Genel';
export type NoteSource = 'manual' | 'photo' | 'voice';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  image_url: string | null;
  image?: string | null;
  source: NoteSource;
  remind_at: string | null;
  created_at: string;

  // YENİ
  audio_url?: string | null;       // Base64 data URL ("data:audio/webm;base64,...")
  audio_duration?: number | null;  // saniye
}

export const CATEGORIES: NoteCategory[] = ['Ders', 'Teknik', 'Görevler', 'Genel'];

export const CATEGORY_COLORS: Record<NoteCategory, { bg: string; text: string; border: string; dot: string }> = {
  Ders: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  Teknik: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  Görevler: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
  Genel: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
  },
};

export const CATEGORY_META: Record<NoteCategory, { icon: string; description: string }> = {
  Ders: { icon: 'BookOpen', description: 'Ders notları ve çalışma planları' },
  Teknik: { icon: 'Code', description: 'Teknik notlar ve kod ipuçları' },
  Görevler: { icon: 'CheckSquare', description: 'Yapılacaklar ve hatırlatıcılar' },
  Genel: { icon: 'FileText', description: 'Genel düşünceler ve fikirler' },
};

export const SOURCE_LABELS: Record<NoteSource, string> = {
  manual: 'El ile',
  photo: 'Fotoğraf',
  voice: 'Sesli',
};

export function formatReminder(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMs < 0) {
    if (diffDay < -1) return `${Math.abs(diffDay)} gün önce geçti`;
    if (diffHr < -1) return `${Math.abs(diffHr)} saat önce geçti`;
    return 'Süresi doldu';
  }
  if (diffMin < 60) return `${diffMin} dk sonra`;
  if (diffHr < 24) return `${diffHr} saat sonra`;
  if (diffDay === 1) return 'Yarın';
  if (diffDay < 7) return `${diffDay} gün sonra`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}
