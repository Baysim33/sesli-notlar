import { useState, useEffect } from 'react';
import { Bell, X, BellRing, Volume2 } from 'lucide-react';
import type { ActiveReminder } from '@/hooks/useReminders';

interface ReminderPopupProps {
  reminders: ActiveReminder[];
  onDismiss: (noteId: string) => void;
  permission: NotificationPermission | 'unsupported';
  onRequestPermission: () => void;
}

export default function ReminderPopup({
  reminders,
  onDismiss,
  permission,
  onRequestPermission,
}: ReminderPopupProps) {
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useEffect(() => {
    if (
      permission !== 'granted' &&
      permission !== 'unsupported' &&
      reminders.length > 0
    ) {
      setShowPermissionBanner(true);
    } else {
      setShowPermissionBanner(false);
    }
  }, [permission, reminders.length]);

  // Play a short beep using Web Audio API when a new reminder pops up
  useEffect(() => {
    if (reminders.length === 0) return;

    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.45);
    } catch {
      // AudioContext not available
    }
  }, [reminders.length]);

  if (reminders.length === 0 && !showPermissionBanner) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] px-4 pt-4 pointer-events-none">
      <div className="mx-auto max-w-md space-y-2 pointer-events-auto">
        {/* Permission request banner */}
        {showPermissionBanner && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-500/40 bg-blue-500/15 backdrop-blur-xl px-4 py-3 shadow-2xl animate-slide-down">
            <BellRing size={20} className="text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-blue-300 text-sm font-medium">Bildirim izni gerekli</p>
              <p className="text-blue-400/70 text-xs mt-0.5">
                Tarayıcı bildirimlerini almak için izin ver
              </p>
            </div>
            <button
              onClick={() => {
                onRequestPermission();
                setShowPermissionBanner(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors shrink-0"
            >
              İzin Ver
            </button>
            <button
              onClick={() => setShowPermissionBanner(false)}
              className="p-1 rounded-lg text-blue-400/60 hover:text-blue-300 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Active reminder popups */}
        {reminders.map((reminder) => (
          <div
            key={reminder.note.id}
            className="rounded-2xl border border-amber-500/50 bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-amber-500/10 overflow-hidden animate-slide-down"
          >
            {/* Pulsing top bar */}
            <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 animate-pulse" />

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <BellRing size={20} className="text-amber-400 animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium mb-1">
                    <Volume2 size={12} />
                    HATIRLATICI
                  </div>
                  <p className="text-neutral-100 font-semibold text-sm leading-snug">
                    {reminder.note.title}
                  </p>
                  <p className="text-neutral-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                    {reminder.note.content}
                  </p>
                </div>

                <button
                  onClick={() => onDismiss(reminder.note.id)}
                  className="shrink-0 p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                  aria-label="Hatırlatıcıyı kapat"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onDismiss(reminder.note.id)}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-neutral-900 text-xs font-bold hover:bg-amber-400 transition-colors"
                >
                  Tamam, gördüm
                </button>
                <button
                  onClick={() => onDismiss(reminder.note.id)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 text-neutral-400 text-xs font-medium hover:bg-neutral-700 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
