import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, X, Loader2, Check, Square, AudioLines, Volume2, Trash2 } from 'lucide-react';
import { supabase, type NoteCategory, getUserId } from '@/lib/supabase';
import ReminderField from './ReminderField';

interface VoiceModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type Phase = 'idle' | 'recording' | 'processing' | 'result';

export default function VoiceModal({ onClose, onSaved }: VoiceModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [recordTime, setRecordTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Genel');
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecordTime(0);
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          setAudioUrl(reader.result as string);
          setPhase('result');
        };
        reader.onerror = () => {
          setError('Ses kaydı işlenemedi');
          setPhase('result');
        };
        reader.readAsDataURL(blob);
        cleanupStream();
      };
      recorder.start();

      setPhase('recording');
      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch {
      setError('Mikrofon erişimi reddedildi veya kullanılamıyor');
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setPhase('processing');
      mediaRecorderRef.current.stop();
    } else {
      setPhase('result');
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reRecord = () => {
    setAudioUrl(null);
    setContent('');
    setTitle('');
    setPhase('idle');
  };

  useEffect(() => {
    return () => cleanupStream();
  }, [cleanupStream]);

  const handleSave = async () => {
    if (!audioUrl || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('notes').insert({
      title: title.trim(),
      content: content.trim(),
      category,
      remind_at: remindAt,
      audio_url: audioUrl,
      source: 'voice',
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Mic size={18} className="text-amber-400" />
            </div>
            <h2 className="text-neutral-100 font-semibold text-base">Ses Kaydı</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Phase: Idle */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                <Mic size={36} className="text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-neutral-200 font-medium text-sm">Ses kaydı yap</p>
                <p className="text-neutral-500 text-xs mt-1">Mikrofonla sesini kaydet, not olarak sakla</p>
              </div>
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-500 text-neutral-900 hover:bg-amber-400 transition-colors text-sm font-bold"
              >
                <Mic size={18} />
                Kaydı Başlat
              </button>
            </div>
          )}

          {/* Phase: Recording */}
          {phase === 'recording' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="text-amber-400 font-mono text-3xl font-bold tracking-wider">
                {formatTime(recordTime)}
              </div>
              <div className="flex items-center gap-1 h-12">
                {waveBars.map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-amber-400"
                    style={{
                      height: `${h}px`,
                      animation: `wave 0.8s ease-in-out ${i * 0.06}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-amber-400/80 text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Kaydediliyor...
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-bold"
              >
                <Square size={16} fill="white" />
                Kaydı Durdur
              </button>
            </div>
          )}

          {/* Phase: Processing */}
          {phase === 'processing' && (
            <div className="flex flex-col items-center gap-5 py-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <AudioLines size={32} className="text-amber-400 animate-pulse" />
                </div>
                <div className="absolute -inset-2 rounded-full border-2 border-amber-500/20 animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-neutral-200 font-medium text-sm">Ses kaydı işleniyor...</p>
                <p className="text-neutral-500 text-xs mt-1">Lütfen bekle</p>
              </div>
              <Loader2 size={24} className="text-amber-400 animate-spin" />
            </div>
          )}

          {/* Phase: Result */}
          {phase === 'result' && (
            <div className="space-y-4">
              {audioUrl && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <Check size={18} />
                  Ses kaydı tamamlandı!
                </div>
              )}

              {/* Audio playback */}
              {audioUrl && (
                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                    <Volume2 size={14} />
                    Ses kaydı
                  </div>
                  <audio controls src={audioUrl} className="w-full h-10" />
                  <button
                    onClick={reRecord}
                    className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors"
                  >
                    <Trash2 size={13} />
                    Sil ve yeniden kaydet
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Başlık</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ses notu için başlık..."
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Not (isteğe bağlı)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={2}
                    placeholder="Ses notu hakkında kısa açıklama..."
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
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
                            ? 'bg-amber-500 text-neutral-900'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <ReminderField value={remindAt} onChange={setRemindAt} accentColor="amber" />

              <button
                onClick={handleSave}
                disabled={saving || !audioUrl || !title.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 text-neutral-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Kaydediliyor...' : 'Ses Notunu Kaydet'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
