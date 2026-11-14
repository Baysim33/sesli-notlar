import { Bell, X } from 'lucide-react';
import { toDateTimeLocal, fromDateTimeLocal } from '@/lib/supabase';

interface ReminderFieldProps {
  value: string | null;
  onChange: (iso: string | null) => void;
  accentColor?: 'blue' | 'amber' | 'emerald';
}

export default function ReminderField({ value, onChange, accentColor = 'blue' }: ReminderFieldProps) {
  const accentClasses = {
    blue: { border: 'focus:border-blue-500/50', icon: 'text-blue-400', activeBg: 'bg-blue-500/10 border-blue-500/30' },
    amber: { border: 'focus:border-amber-500/50', icon: 'text-amber-400', activeBg: 'bg-amber-500/10 border-amber-500/30' },
    emerald: { border: 'focus:border-emerald-500/50', icon: 'text-emerald-400', activeBg: 'bg-emerald-500/10 border-emerald-500/30' },
  };
  const c = accentClasses[accentColor];

  return (
    <div>
      <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Hatırlatıcı (isteğe bağlı)</label>
      {value ? (
        <div className={`flex items-center gap-2 rounded-xl border ${c.activeBg} px-3.5 py-2.5`}>
          <Bell size={16} className={c.icon} />
          <input
            type="datetime-local"
            lang="tr" value={toDateTimeLocal(value)}
            onChange={(e) => onChange(fromDateTimeLocal(e.target.value))}
            className={`flex-1 bg-transparent text-neutral-100 text-sm focus:outline-none ${c.border}`}
          />
          <button
            onClick={() => onChange(null)}
            className="p-1 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            const now = new Date();
            now.setHours(now.getHours() + 1, 0, 0, 0);
            onChange(now.toISOString());
          }}
          className="w-full flex items-center gap-2 rounded-xl border border-dashed border-neutral-700 px-3.5 py-2.5 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors text-sm"
        >
          <Bell size={16} />
          Hatırlatıcı ekle
        </button>
      )}
    </div>
  );
}
