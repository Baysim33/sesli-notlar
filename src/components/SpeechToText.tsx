import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';

interface SpeechToTextProps {
  onTranscript: (text: string) => void;
  accentColor?: 'emerald' | 'neutral' | 'blue';
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

export default function SpeechToText({ onTranscript, accentColor = 'neutral' }: SpeechToTextProps) {
  const [isListening, setIsListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);

  const accentClasses = {
    emerald: { active: 'bg-emerald-500 text-white border-emerald-500', idle: 'text-emerald-400 hover:bg-emerald-500/10' },
    neutral: { active: 'bg-neutral-200 text-neutral-900 border-neutral-200', idle: 'text-neutral-400 hover:bg-neutral-800' },
    blue: { active: 'bg-blue-500 text-white border-blue-500', idle: 'text-blue-400 hover:bg-blue-500/10' },
  };
  const c = accentClasses[accentColor];

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setUnsupported(true);
      return;
    }

    const recognition: RecognitionLike = new SR();
    recognition.lang = 'tr-TR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        }
      }
      if (finalText) {
        onTranscript(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setUnsupported(true);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    };
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (unsupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  }, [isListening, unsupported]);

  if (unsupported) {
    return (
      <div className="flex items-center gap-1.5 text-neutral-600 text-xs px-1">
        <AlertCircle size={13} />
        Tarayıcı sesli dikte desteklemiyor
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
        isListening
          ? c.active + ' animate-pulse'
          : 'bg-transparent border-neutral-700 ' + c.idle
      }`}
    >
      {isListening ? (
        <>
          <Square size={13} fill="currentColor" />
          Dikte ediyor... (kapat)
        </>
      ) : (
        <>
          <Mic size={13} />
          Sesli dikte
        </>
      )}
    </button>
  );
}
