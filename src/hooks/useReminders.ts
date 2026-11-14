import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, type Note } from '@/lib/supabase';

export interface ActiveReminder {
  note: Note;
  triggeredAt: number;
}

interface UseRemindersResult {
  activeReminders: ActiveReminder[];
  dismissReminder: (noteId: string) => void;
  permission: NotificationPermission | 'unsupported';
  requestPermission: () => void;
}

const CHECK_INTERVAL = 10000;
const GRACE_PERIOD_MS = 5 * 60 * 1000;

export function useReminders(notes: Note[]): UseRemindersResult {
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const triggeredRef = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((result) => {
      setPermission(result);
    });
  }, []);

  const dismissReminder = useCallback((noteId: string) => {
    setActiveReminders((prev) => prev.filter((r) => r.note.id !== noteId));
  }, []);

  const checkReminders = useCallback(() => {
    const now = Date.now();

    for (const note of notes) {
      if (!note.remind_at) continue;

      const remindTime = new Date(note.remind_at).getTime();
      const isDue = remindTime <= now;
      const isWithinGrace = now - remindTime < GRACE_PERIOD_MS;

      if (isDue && isWithinGrace && !triggeredRef.current.has(note.id)) {
        triggeredRef.current.add(note.id);

        setActiveReminders((prev) => {
          if (prev.some((r) => r.note.id === note.id)) return prev;
          return [...prev, { note, triggeredAt: now }];
        });

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('Hatırlatıcı: ' + note.title, {
              body: note.content,
              tag: note.id,
              requireInteraction: true,
            });
          } catch {
            // notification creation can fail if tab is inactive
          }
        }
      }
    }
  }, [notes]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkReminders]);

  // Reset triggered set when notes change (e.g. after edit/delete)
  useEffect(() => {
    const validIds = new Set(notes.map((n) => n.id));
    const oldTriggered = Array.from(triggeredRef.current);
    for (const id of oldTriggered) {
      if (!validIds.has(id)) {
        triggeredRef.current.delete(id);
      }
    }
  }, [notes]);

  // Auto-dismiss reminders past the grace period
  useEffect(() => {
    if (activeReminders.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveReminders((prev) =>
        prev.filter((r) => now - r.triggeredAt < GRACE_PERIOD_MS)
      );
    }, 5000);
    return () => clearInterval(timer);
  }, [activeReminders.length]);

  return {
    activeReminders,
    dismissReminder,
    permission,
    requestPermission,
  };
}
