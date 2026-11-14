import { useState } from 'react';
import { PenLine, X, Loader2, Check } from 'lucide-react';
import { supabase, type Note, type NoteCategory } from '@/lib/supabase';
import ReminderField from './ReminderField';

interface EditModalProps {
  note: Note;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditModal({ note, onClose, onSaved }: EditModalProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState<NoteCategory>(note.category);
  const [remindAt, setRemindAt] = useState<string | null>(note.remind_at);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({
        title: title.trim(),
        content: content.trim(),
        category,
        remind_at: remindAt,
      })
      .eq('id', note.id);
    setSaving(false);
    if (!error) {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-700 flex items-center justify-center">
              <PenLine size={18} className="text-neutral-200" />
            </div>
            <h2 className="text-neutral-100 font-semibold text-base">Notu Düzenle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm focus:outline-none focus:border-neutral-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-neutral-400 text-xs font-medium mb-1.5 block">İçerik</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm focus:outline-none focus:border-neutral-500 transition-colors resize-none"
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
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <ReminderField value={remindAt} onChange={setRemindAt} accentColor="emerald" />
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-100 text-neutral-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
