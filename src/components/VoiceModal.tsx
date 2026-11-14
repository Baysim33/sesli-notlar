import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, X, Loader2, Check, Square, Play, Pause,
  RotateCcw, Volume2, AlertCircle, FileText, ArrowRight
} from 'lucide-react';
import { supabase, type NoteCategory } from '@/lib/supabase';
import ReminderField from './ReminderField';

interface VoiceModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type Mode = 'audio' | 'speech';
type Phase = 'idle' | 'recording' | 'preview';

// Helper to convert Blob to permanent Base64 Data URL using FileReader
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader sonucu bir metin/Base64 dönmedi'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function VoiceModal({ onClose, onSaved }: VoiceModalProps) {
  const [mode, setMode] = useState<Mode>('audio');
  const [phase, setPhase] = useState<Phase>('idle');
  const [recordTime, setRecordTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Mode States (Permanent Base64 Data URL)
  const [base64AudioUrl, setBase64AudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Speech-to-text Mode States
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Görevler');
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeechStoppedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getBestAudioMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
  };

  const handleModeChange = (newMode: Mode) => {
    if (phase === 'recording') {
      stopRecording();
    }
    setMode(newMode);
    setPhase('idle');
    setErrorMessage(null);
    setLiveTranscript('');
  };

  // START RECORDING
  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setLiveTranscript('');
    setRecordTime(0);

    // MODE 1: Ses Kaydı (MediaRecorder -> Base64)
    if (mode === 'audio') {
      setBase64AudioUrl(null);
      recordedBlobRef.current = null;
      setIsPlaying(false);
      setPlaybackTime(0);
      setAudioDuration(0);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Tarayıcınız mikrofon erişimini (MediaDevices API) desteklemiyor.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        audioChunksRef.current = [];

        const selectedMime = getBestAudioMimeType();
        const recorder = selectedMime
          ? new MediaRecorder(stream, { mimeType: selectedMime })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const finalMime = recorder.mimeType || selectedMime || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
          recordedBlobRef.current = audioBlob;

          // Convert Blob to permanent Base64 Data URL using FileReader
          try {
            const base64Data = await blobToBase64(audioBlob);
            setBase64AudioUrl(base64Data);
          } catch (err: any) {
            console.error('Base64 çevrim hatası:', err);
          }

          const durationSec = recordTime || 1;
          setAudioDuration(durationSec);

          const now = new Date();
          const timeStr = now.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          setTitle((prev) => prev.trim() || `Sesli Not — ${timeStr}`);
          setContent((prev) => prev.trim() || `🎙️ Ses kaydı (${formatTime(durationSec)})`);

          const d = new Date();
          d.setHours(d.getHours() + 2, 0, 0, 0);
          setRemindAt((prev) => prev || d.toISOString());

          setPhase('preview');

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        };

        recorder.start(100);
        setPhase('recording');

        timerRef.current = setInterval(() => {
          setRecordTime((t) => t + 1);
        }, 1000);
      } catch (err: any) {
        console.error('Mikrofon erişim hatası:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Mikrofon erişim izni verilmedi. Lütfen tarayıcınızdan mikrofon iznini etkinleştirin.');
        } else {
          setErrorMessage(`Mikrofon başlatılamadı: ${err.message || 'Bilinmeyen hata'}`);
        }
        setPhase('idle');
      }
    }

    // MODE 2: Metne Çevir (SpeechRecognition)
    if (mode === 'speech') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setErrorMessage(
          'Tarayıcınız Web Speech API ses tanıma özelliğini desteklemiyor. Aşağıdan notunuzu doğrudan yazabilir veya Ses Kaydı modunu kullanabilirsiniz.'
        );
        setPhase('preview');
        return;
      }

      try {
        isSpeechStoppedRef.current = false;
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setPhase('recording');
          timerRef.current = setInterval(() => {
            setRecordTime((t) => t + 1);
          }, 1000);
        };

        recognition.onresult = (event: any) => {
          let interimText = '';
          let finalText = '';

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalText += res[0].transcript + ' ';
            } else {
              interimText += res[0].transcript;
            }
          }

          const combined = (finalText + interimText).trim();
          setLiveTranscript(combined);
          setTranscript(combined);
          setContent(combined);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'no-speech') return;

          if (timerRef.current) clearInterval(timerRef.current);
          isSpeechStoppedRef.current = true;
          try { recognition.abort(); } catch {}

          if (event.error === 'network') {
            setErrorMessage(
              'Ses tanıma servisine yerelde ulaşılamadı (Network). Notunuzu doğrudan aşağıdaki alana yazarak kaydedebilir veya "Ses Kaydı" moduna geçebilirsiniz.'
            );
          } else {
            setErrorMessage(
              `Ses tanıma servisi kullanılamıyor (${event.error}). Notunuzu doğrudan aşağıdan yazabilirsiniz.`
            );
          }
          setPhase('preview');
        };

        recognition.onend = () => {
          if (!isSpeechStoppedRef.current && phase === 'recording') {
            try { recognition.start(); } catch {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Speech recognition exception:', err);
        if (timerRef.current) clearInterval(timerRef.current);
        setErrorMessage(
          'Ses tanıma servisine ulaşılamadı. Dilerseniz notunuzu doğrudan yazabilir veya Ses Kaydı modunu kullanabilirsiniz.'
        );
        setPhase('preview');
      }
    }
  }, [mode, phase, recordTime]);

  // STOP RECORDING
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mode === 'audio') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    if (mode === 'speech') {
      isSpeechStoppedRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const d = new Date();
      d.setHours(d.getHours() + 2, 0, 0, 0);
      setRemindAt((prev) => prev || d.toISOString());
      setTitle((prev) => prev.trim() || (liveTranscript ? liveTranscript.slice(0, 35) + '...' : 'Sesli Not'));
      setPhase('preview');
    }
  }, [mode, liveTranscript]);

  const resetRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setBase64AudioUrl(null);
    recordedBlobRef.current = null;
    setTranscript('');
    setLiveTranscript('');
    setPlaybackTime(0);
    setAudioDuration(0);
    setErrorMessage(null);
    setPhase('idle');
  };

  const togglePlayAudio = async () => {
    if (!audioPlayerRef.current) return;
    try {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        if (audioPlayerRef.current.ended || playbackTime >= (audioDuration || 1)) {
          audioPlayerRef.current.currentTime = 0;
          setPlaybackTime(0);
        }
        await audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Audio play error:', err);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setPlaybackTime(target);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = target;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let audioPayload: string | null = null;

    if (mode === 'audio') {
      if (base64AudioUrl) {
        audioPayload = base64AudioUrl;
      } else if (recordedBlobRef.current) {
        audioPayload = await blobToBase64(recordedBlobRef.current);
      }
    }

    const noteTitle = title.trim() || 'Sesli Not';
    const noteContent = content.trim() || (mode === 'audio' ? `🎙️ Ses kaydı (${formatTime(audioDuration || recordTime)})` : 'Sesli not');

    const { error } = await supabase.from('notes').insert({
      title: noteTitle,
      content: noteContent,
      category,
      image_url: audioPayload, // Kesinlikle kalıcı Base64 (Data URL)
      remind_at: remindAt,
      source: 'voice',
    });

    setSaving(false);
    if (!error) {
      onSaved();
      onClose();
    } else {
      setErrorMessage('Not kaydedilirken bir hata oluştu: ' + error.message);
    }
  };

  const waveBars = [12, 24, 36, 20, 30, 16, 28, 14, 22, 10, 26, 18];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Audio Element reading the permanent Base64 Data URL */}
        {base64AudioUrl && (
          <audio
            ref={audioPlayerRef}
            src={base64AudioUrl}
            preload="auto"
            onTimeUpdate={() => {
              if (audioPlayerRef.current) {
                setPlaybackTime(audioPlayerRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (audioPlayerRef.current) {
                const d = audioPlayerRef.current.duration;
                if (isFinite(d) && !isNaN(d) && d > 0) {
                  setAudioDuration(d);
                }
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setPlaybackTime(0);
            }}
            onPause={() => setIsPlaying(false)}
            onError={(e) => console.error('Audio playback element error:', e)}
          />
        )}

        {/* Header */}
        <div className="sticky top-0 z-10 px-5 pt-4 pb-3 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Mic size={18} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-neutral-100 font-semibold text-base">Sesli Not</h2>
                <p className="text-neutral-500 text-xs">Mod seçin ve sesinizi kaydedin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mode Selector (Tabs) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
            <button
              type="button"
              onClick={() => handleModeChange('audio')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                mode === 'audio'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Volume2 size={15} />
              <span>Ses Kaydı Olarak Sakla</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('speech')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                mode === 'speech'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <FileText size={15} />
              <span>Metne Çevir</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Error Banner with quick switch */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                <span className="flex-1">{errorMessage}</span>
              </div>
              {mode === 'speech' && (
                <button
                  type="button"
                  onClick={() => handleModeChange('audio')}
                  className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                >
                  <Volume2 size={13} />
                  Ses Kaydı Moduna Geç
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}

          {/* Phase: Idle */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center gap-5 py-7">
              <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 shadow-inner">
                {mode === 'audio' ? (
                  <Volume2 size={36} className="text-amber-400" />
                ) : (
                  <Mic size={36} className="text-amber-400" />
                )}
              </div>
              <div className="text-center max-w-xs">
                <p className="text-neutral-200 font-semibold text-base">
                  {mode === 'audio' ? 'Oynatılabilir Ses Kaydı' : 'Konuşmayı Metne Çevir'}
                </p>
                <p className="text-neutral-400 text-xs mt-1.5 leading-relaxed">
                  {mode === 'audio'
                    ? 'Mikrofondan kaydedilir, kalıcı Base64 olarak saklanır ve not kartında doğrudan dinlenebilir.'
                    : 'Konuştuğunuz Türkçe kelimeleri yazıya aktarır.'}
                </p>
              </div>
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-500 text-neutral-900 hover:bg-amber-400 transition-all text-sm font-bold shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Mic size={18} />
                Kaydı Başlat
              </button>
            </div>
          )}

          {/* Phase: Recording */}
          {phase === 'recording' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="text-amber-400 font-mono text-3xl font-bold tracking-wider">
                {formatTime(recordTime)}
              </div>
              <div className="flex items-center gap-1.5 h-12">
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

              {mode === 'speech' && liveTranscript && (
                <div className="w-full bg-neutral-800/80 border border-amber-500/30 rounded-xl p-3 text-sm text-neutral-200 text-center max-h-24 overflow-y-auto">
                  <p className="italic">"{liveTranscript}"</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                {mode === 'audio' ? 'Ses kaydediliyor...' : 'Dinleniyor, konuşabilirsiniz...'}
              </div>

              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-all text-sm font-bold shadow-lg shadow-red-500/25 active:scale-95"
              >
                <Square size={16} fill="white" />
                Kaydı Tamamla
              </button>
            </div>
          )}

          {/* Phase: Preview & Form */}
          {phase === 'preview' && (
            <div className="space-y-4">
              {/* If Audio Mode: Audio Player */}
              {mode === 'audio' && (
                <div className="rounded-2xl bg-neutral-800/90 border border-neutral-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                      <Volume2 size={16} />
                      Ses Kaydı Dinle (Base64)
                    </div>
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-amber-400 transition-colors"
                    >
                      <RotateCcw size={13} />
                      Yeniden Kaydet
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="w-11 h-11 rounded-full bg-amber-500 text-neutral-900 flex items-center justify-center hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 shrink-0"
                      aria-label={isPlaying ? 'Durdur' : 'Oynat'}
                    >
                      {isPlaying ? (
                        <Pause size={18} fill="currentColor" />
                      ) : (
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <input
                        type="range"
                        min={0}
                        max={audioDuration > 0 ? audioDuration : 1}
                        step={0.1}
                        value={playbackTime}
                        onChange={handleSeek}
                        className="w-full accent-amber-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-neutral-400 text-xs font-mono mt-1">
                        <span>{formatTime(playbackTime)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* If Speech Mode: Recognized text display */}
              {mode === 'speech' && transcript && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                      <Check size={14} /> Metne Çevrildi
                    </span>
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="text-xs text-neutral-400 hover:text-amber-400 flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> Tekrar Konuş
                    </button>
                  </div>
                  <p className="text-neutral-200 text-xs leading-relaxed">{transcript}</p>
                </div>
              )}

              {/* Note Metadata Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Not Başlığı</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Başlık girin..."
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">
                    {mode === 'speech' ? 'Not İçeriği (Düzenleyebilirsiniz)' : 'Açıklama / Not (İsteğe bağlı)'}
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={mode === 'speech' ? 'Not içeriğini buraya yazın...' : 'Ses kaydı hakkında ek notlar...'}
                    rows={3}
                    autoFocus={mode === 'speech' && !!errorMessage}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Kategori</label>
                  <div className="flex gap-2">
                    {(['Ders', 'Teknik', 'Görevler', 'Genel'] as NoteCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          category === cat
                            ? 'bg-amber-500 text-neutral-900 font-semibold'
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
                type="button"
                onClick={handleSave}
                disabled={saving || (mode === 'speech' && !content.trim())}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 text-neutral-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-lg shadow-amber-500/15"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Kaydediliyor...' : 'Notu Kaydet'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
