import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Trash2, Loader2, Play, AudioLines } from 'lucide-react';

interface VoiceRecorderProps {
  value: string | null;
  onChange: (base64: string | null) => void;
  accentColor?: 'emerald' | 'neutral';
}

export default function VoiceRecorder({ value, onChange, accentColor = 'neutral' }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accentClasses = {
    emerald: {
      btn: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
      active: 'bg-red-500 text-white border-red-500',
    },
    neutral: {
      btn: 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700',
      active: 'bg-red-500 text-white border-red-500',
    },
  };
  const c = accentClasses[accentColor];

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
          onChange(reader.result as string);
          setIsProcessing(false);
        };
        reader.onerror = () => {
          setError('Ses kaydı işlenemedi');
          setIsProcessing(false);
        };
        reader.readAsDataURL(blob);
        cleanupStream();
      };

      recorder.start();
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch {
      setError('Mikrofon erişimi reddedildi veya kullanılamıyor');
    }
  }, [onChange, cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const deleteRecording = () => {
    onChange(null);
    setRecordTime(0);
  };

  useEffect(() => {
    return () => cleanupStream();
  }, [cleanupStream]);

  return (
    <div className="space-y-2">
      <label className="text-neutral-400 text-xs font-medium block">Ses kaydı (isteğe bağlı)</label>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Existing recording playback */}
      {value && !isRecording && !isProcessing && (
        <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-neutral-300 text-xs font-medium">
            <AudioLines size={14} className="text-neutral-400" />
            Ses kaydı mevcut
          </div>
          <audio controls src={value} className="w-full h-10" />
          <div className="flex gap-2">
            <button
              onClick={startRecording}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border ${c.btn} text-xs font-medium transition-colors`}
            >
              <Mic size={14} />
              Yeniden kaydet
            </button>
            <button
              onClick={deleteRecording}
              className="px-3 py-2 rounded-lg bg-neutral-800 text-red-400 hover:bg-red-500/10 border border-neutral-700 text-xs font-medium transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-red-400 text-sm font-mono font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
            {formatTime(recordTime)}
          </div>
          <div className="flex items-center gap-1 h-8">
            {[10, 22, 30, 16, 26, 12, 20, 14, 24, 10, 18, 28].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-red-400"
                style={{
                  height: `${h}px`,
                  animation: `wave 0.8s ease-in-out ${i * 0.06}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-xs font-bold"
          >
            <Square size={14} fill="white" />
            Kaydı Durdur
          </button>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-4 flex items-center justify-center gap-2 text-neutral-400 text-xs">
          <Loader2 size={16} className="animate-spin" />
          Ses kaydı işleniyor...
        </div>
      )}

      {/* No recording — show record button */}
      {!value && !isRecording && !isProcessing && (
        <button
          onClick={startRecording}
          className={`w-full flex items-center justify-center gap-2 rounded-xl border border-dashed ${c.btn} px-3.5 py-2.5 text-sm transition-colors`}
        >
          <Mic size={16} />
          Ses kaydet
        </button>
      )}
    </div>
  );
}
