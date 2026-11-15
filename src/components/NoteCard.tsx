import { useState } from 'react';
import { Trash2, ImageIcon, Mic, PenLine, Check, Bell, Pencil, ImageOff, Volume2, ZoomIn } from 'lucide-react';
import { CATEGORY_COLORS, SOURCE_LABELS, formatReminder, type Note } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import Lightbox from './Lightbox';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onEdit: (note: Note) => void;
}

function SourceIcon({ source }: { source: Note['source'] }) {
  if (source === 'photo') return <ImageIcon size={12} />;
  if (source === 'voice') return <Mic size={12} />;
  return <PenLine size={12} />;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHr < 24) return `${diffHr} sa önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NoteCard({ note, onDelete, onEdit }: NoteCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const colors = CATEGORY_COLORS[note.category];
  const hasReminder = !!note.remind_at;
  const reminderText = hasReminder ? formatReminder(note.remind_at!) : '';
  const isOverdue = hasReminder && new Date(note.remind_at!).getTime() < Date.now();

  const handleDelete = async () => {
    const { error } = await supabase.from('notes').delete().eq('id', note.id);
    if (!error) {
      onDelete(note.id);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl border ${colors.border} bg-neutral-900/60 backdrop-blur-sm p-4 transition-all duration-300 hover:bg-neutral-900/90 hover:border-neutral-700`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.text} px-2.5 py-0.5 text-xs font-medium border ${colors.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {note.category}
            </span>
            <span className="inline-flex items-center gap-1 text-neutral-500 text-xs">
              <SourceIcon source={note.source} />
              {SOURCE_LABELS[note.source]}
            </span>
          </div>
          <h3 className="text-neutral-100 font-semibold text-sm leading-snug mb-1 truncate">
            {note.title}
          </h3>
          <p className="text-neutral-400 text-sm leading-relaxed line-clamp-3">
            {note.content}
          </p>
          {note.image_url && !imgError && (
            <div className="mt-3 rounded-lg overflow-hidden border border-neutral-800 relative group/img cursor-pointer" onClick={() => setShowLightbox(true)}>
              <img
                src={note.image_url}
                alt={note.title}
                className="w-full h-40 object-cover transition-transform duration-300 group-hover/img:scale-105"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ZoomIn size={20} className="text-white" />
                </div>
              </div>
            </div>
          )}
          {note.image_url && imgError && (
            <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-800/50 flex items-center gap-2 p-3 text-neutral-500 text-xs">
              <ImageOff size={16} className="text-neutral-600" />
              Fotoğraf yüklenemedi
            </div>
          )}

          {/* Reminder badge */}
          {hasReminder && (
            <div
              className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                isOverdue
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <Bell size={13} className={isOverdue ? 'animate-pulse' : ''} />
              {reminderText}
            </div>
          )}

          <p className="text-neutral-600 text-xs mt-3">{formatDate(note.created_at)}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
            aria-label="Notu düzenle"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setConfirming(!confirming)}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Notu sil"
          >
            {confirming ? <Check size={16} /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>

      {/* Audio player */}
      {note.audio_url && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-800/50 border border-neutral-700/50 px-3 py-2">
          <Volume2 size={16} className="text-neutral-400 shrink-0" />
          <audio controls src={note.audio_url} className="w-full h-8" />
        </div>
      )}

      {confirming && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-neutral-400">Silinsin mi?</span>
          <button
            onClick={handleDelete}
            className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium"
          >
            Evet, sil
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-2.5 py-1 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Vazgeç
          </button>
        </div>
      )}

      {showLightbox && note.image_url && (
        <Lightbox src={note.image_url} alt={note.title} onClose={() => setShowLightbox(false)} />
      )}
    </div>
  );
}
