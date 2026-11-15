import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, X, Loader2, Check, Square, AlertCircle, AudioLines } from 'lucide-react';
import { supabase, type NoteCategory, getUserId } from '@/lib/supabase';
import ReminderField from './ReminderField';

interface DictationModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

export default function DictationModal({ onClose, onSaved }: DictationModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Genel');
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const shouldListenRef = useRef(false);

  const SR = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  useEffect(() => {
    if (!SR) {
      setUnsupported(true);
      return;
    }

    const recognition: RecognitionLike = new SR();
    recognition.lang = 'tr-TR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += t;
        } else {
          interim += t;
        }
      }
      if (finalChunk) {
        setLiveText((prev) => (prev ? prev + ' ' + finalChunk : finalChunk));
        setContent((prev) => (prev ? prev + ' ' + finalChunk : finalChunk));
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setUnsupported(true);
        setIsListening(false);
        shouldListenRef.current = false;
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldListenRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [SR]);

  const toggleListening = useCallback(() => {
    if (unsupported || !recognitionRef.current) return;

    if (isListening) {
      shouldListenRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setInterimText('');
    } else {
      setError(null);
      shouldListenRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
        shouldListenRef.current = false;
        setError('Dikte başlatılamadı, tekrar dene');
      }
    }
  }, [isListening, unsupported]);

  const clearTranscript = () => {
    setLiveText('');
    setInterimText('');
    setContent('');
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const finalTitle = title.trim() || content.slice(0, 40) + (content.length > 40 ? '...' : '');
    const { error } = await supabase.from('notes').insert({
      title: finalTitle,
      content: content.trim(),
      category,
      remind_at: remindAt,
      source: 'manual',
      user_id: getUserId(),
    });
    setSaving(false);
    if (!error) {
      onSaved();
      onClose();
    } else {
      setError('Kayıt sırasında bir hata oluştu');
    }
  };

  const waveBars = [12, 24, 36, 20, 30, 16, 28, 14, 22, 10, 26, 18];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <AudioLines size={18} className="text-emerald-400" />
            </div>
            <h2 className="text-neutral-100 font-semibold text-base">Sesli Dikte</h2>
          </div>
          <button
            onClick={() => {
              shouldListenRef.current = false;
              if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { /* ignore */ }
              }
              onClose();
            }}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-xs">
              {error}
            </div>
          )}

          {unsupported && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              Tarayıcı sesli dikte desteklemiyor. Notu el ile yazabilirsin.
            </div>
          )}

          {/* Dictation area */}
          <div className="rounded-2xl bg-neutral-800/60 border border-neutral-700 p-4 min-h-[160px] max-h-48 overflow-y-auto">
            {liveText || interimText ? (
              <p className="text-neutral-200 text-sm leading-relaxed">
                {liveText}
                {interimText && <span className="text-neutral-500">{interimText}</span>}
              </p>
            ) : (
              <p className="text-neutral-600 text-xs">
                {unsupported
                  ? 'Dikte desteklenmiyor. Aşağıdan notunu el ile yaz.'
                  : 'Dikte butonuna bas ve konuşmaya başla. Metin burada belirecek...'}
              </p>
            )}
          </div>

          {/* Mic button + status */}
          <div className="flex flex-col items-center gap-3">
            {isListening && (
              <div className="flex items-center gap-1 h-8">
                {waveBars.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-emerald-400"
                    style={{
                      height: `${h}px`,
                      animation: `wave 0.8s ease-in-out ${i * 0.06}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            )}
            <button
              onClick={toggleListening}
              disabled={unsupported}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {isListening ? (
                <>
                  <Square size={16} fill="white" />
                  Dikteyi Durdur
                </>
              ) : (
                <>
                  <Mic size={18} />
                  Dikteyi Başlat
                </>
              )}
            </button>
            {(liveText || interimText || content) && (
              <button
                onClick={clearTranscript}
                className="text-neutral-500 hover:text-neutral-300 text-xs font-medium transition-colors"
              >
                Metni temizle
              </button>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div>
              <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Başlık</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Not başlığı (boş bırakılırsa metinden alınır)..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-neutral-400 text-xs font-medium mb-1.5 block">İçerik</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="Konuşulan metin burada görünür. İstersen düzenleyebilirsin..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Kategori</label>
              <div className="flex gap-2 flex-wrap">
                {(['Ders', 'Teknik', 'Görevler', 'Genel'] as NoteCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      category === cat
                        ? 'bg-emerald-500 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ReminderField value={remindAt} onChange={setRemindAt} accentColor="emerald" />

          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Kaydediliyor...' : 'Notu Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
