import { useState, useEffect, useRef } from 'react';
import { Trash2, ImageIcon, Mic, PenLine, Check, Bell, Pencil, ImageOff, X, Maximize2, Play, Pause, Volume2 } from 'lucide-react';
import { CATEGORY_COLORS, SOURCE_LABELS, formatReminder, type Note } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioCardDuration, setAudioCardDuration] = useState(0);
  const audioCardRef = useRef<HTMLAudioElement | null>(null);

  const colors = CATEGORY_COLORS[note.category];
  const hasReminder = !!note.remind_at;
  const reminderText = hasReminder ? formatReminder(note.remind_at!) : '';
  const isOverdue = hasReminder && new Date(note.remind_at!).getTime() < Date.now();

  const isAudioNote =
    note.source === 'voice' &&
    !!note.image_url &&
    (note.image_url.startsWith('data:audio') ||
      note.image_url.includes('audio') ||
      note.image_url.endsWith('.webm') ||
      note.image_url.endsWith('.mp3') ||
      note.image_url.endsWith('.ogg'));

  const extractDuration = (text: string): number => {
    const match = text?.match(/\((\d+):(\d+)\)/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return 0;
  };

  const effectiveDuration =
    isFinite(audioCardDuration) && !isNaN(audioCardDuration) && audioCardDuration > 0
      ? audioCardDuration
      : extractDuration(note.content);

  const formatAudioTime = (sec: number) => {
    if (!isFinite(sec) || isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleCardAudio = async () => {
    if (!audioCardRef.current) return;
    try {
      if (isPlayingAudio) {
        audioCardRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        if (
          audioCardRef.current.ended ||
          (effectiveDuration > 0 && audioCurrentTime >= effectiveDuration)
        ) {
          audioCardRef.current.currentTime = 0;
          setAudioCurrentTime(0);
        }
        await audioCardRef.current.play();
        setIsPlayingAudio(true);
      }
    } catch (err) {
      console.error('Audio play failed:', err);
      setIsPlayingAudio(false);
    }
  };

  useEffect(() => {
    if (!previewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewOpen]);

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
          {/* Audio Player for Voice Notes */}
          {isAudioNote && note.image_url && (
            <div className="mt-3 rounded-xl bg-neutral-800/80 border border-neutral-700/80 p-3 flex flex-col gap-2">
              <audio
                ref={audioCardRef}
                src={note.image_url}
                preload="metadata"
                onTimeUpdate={() => {
                  if (audioCardRef.current) setAudioCurrentTime(audioCardRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (audioCardRef.current) {
                    const d = audioCardRef.current.duration;
                    if (isFinite(d) && !isNaN(d) && d > 0) {
                      setAudioCardDuration(d);
                    } else {
                      // WebM Chromium duration fix: seek to end then reset
                      const el = audioCardRef.current;
                      el.currentTime = 1e101;
                      el.ontimeupdate = () => {
                        el.ontimeupdate = null;
                        const computed = el.duration;
                        el.currentTime = 0;
                        if (isFinite(computed) && !isNaN(computed) && computed > 0) {
                          setAudioCardDuration(computed);
                        } else {
                          setAudioCardDuration(extractDuration(note.content));
                        }
                      };
                    }
                  }
                }}
                onEnded={() => {
                  setIsPlayingAudio(false);
                  setAudioCurrentTime(0);
                }}
                onPause={() => setIsPlayingAudio(false)}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleCardAudio}
                  className="w-9 h-9 rounded-full bg-amber-500 text-neutral-900 flex items-center justify-center hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20 shrink-0"
                  aria-label={isPlayingAudio ? 'Durdur' : 'Oynat'}
                >
                  {isPlayingAudio ? (
                    <Pause size={15} fill="currentColor" />
                  ) : (
                    <Play size={15} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-amber-400 flex items-center gap-1">
                      <Volume2 size={13} />
                      Ses Kaydı
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {formatAudioTime(audioCurrentTime)} / {formatAudioTime(effectiveDuration)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={effectiveDuration > 0 ? effectiveDuration : 1}
                    step={0.1}
                    value={audioCurrentTime}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setAudioCurrentTime(t);
                      if (audioCardRef.current) audioCardRef.current.currentTime = t;
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Photo Preview for Photo Notes */}
          {!isAudioNote && note.image_url && !imgError && (
            <div
              className="mt-3 relative group/img rounded-lg overflow-hidden border border-neutral-800 cursor-pointer"
              onClick={() => setPreviewOpen(true)}
            >
              <img
                src={note.image_url}
                alt={note.title}
                className="w-full h-40 object-cover group-hover/img:scale-[1.02] transition-transform duration-200"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-neutral-900/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-neutral-700 text-neutral-200 text-xs flex items-center gap-1.5 font-medium shadow-lg">
                  <Maximize2 size={13} />
                  Büyüt
                </div>
              </div>
            </div>
          )}
          {!isAudioNote && note.image_url && imgError && (
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

      {/* Görsel Büyütme Modalı (Lightbox) */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 px-1 text-neutral-300">
              <span className="text-sm font-semibold truncate pr-4 text-neutral-200">{note.title}</span>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-neutral-700"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950 flex items-center justify-center max-h-[82vh] w-full">
              <img
                src={note.image_url || note.image || ''}
                alt={note.title}
                className="max-h-[82vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
