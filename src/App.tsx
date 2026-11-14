import { useState, useEffect, useCallback } from 'react';
import {
  Search, Camera, Mic, PenLine, NotebookPen, Loader2, Inbox, X,
  ChevronLeft, Bell, BookOpen, Code, CheckSquare, FileText,
} from 'lucide-react';
import {
  supabase, CATEGORIES, CATEGORY_COLORS, CATEGORY_META,
  type Note, type NoteCategory,
} from '@/lib/supabase';
import NoteCard from '@/components/NoteCard';
import PhotoModal from '@/components/PhotoModal';
import VoiceModal from '@/components/VoiceModal';
import ManualNoteModal from '@/components/ManualNoteModal';
import EditModal from '@/components/EditModal';
import ReminderPopup from '@/components/ReminderPopup';
import { useReminders } from '@/hooks/useReminders';

const CATEGORY_ICONS: Record<NoteCategory, typeof BookOpen> = {
  Ders: BookOpen,
  Teknik: Code,
  Görevler: CheckSquare,
  Genel: FileText,
};

type View = 'folders' | 'category';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('folders');
  const [activeCategory, setActiveCategory] = useState<NoteCategory | null>(null);
  const [search, setSearch] = useState('');
  const [showPhoto, setShowPhoto] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const { activeReminders, dismissReminder, permission, requestPermission } = useReminders(notes);

  const fetchNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotes(data as Note[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
  };

  const openCategory = (cat: NoteCategory) => {
    setActiveCategory(cat);
    setView('category');
    setSearch('');
  };

  const goToFolders = () => {
    setView('folders');
    setActiveCategory(null);
    setSearch('');
  };

  // Notes for the active category view (with search)
  const categoryNotes = activeCategory
    ? notes.filter((n) => {
        const matchesCat = n.category === activeCategory;
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
    : [];

  // Search across all notes from folder view
  const globalSearchResults = search.trim()
    ? notes.filter((n) => {
        const q = search.trim().toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q)
        );
      })
    : [];

  const getCategoryCount = (cat: NoteCategory) =>
    notes.filter((n) => n.category === cat).length;

  const getReminderCount = (cat: NoteCategory) =>
    notes.filter((n) => n.category === cat && n.remind_at).length;

  const renderFolders = () => {
    if (search.trim() && globalSearchResults.length > 0) {
      return (
        <div className="space-y-3">
          <p className="text-neutral-500 text-xs px-1">
            {globalSearchResults.length} sonuç bulundu
          </p>
          {globalSearchResults.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
        </div>
      );
    }

    if (search.trim() && globalSearchResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
            <Inbox size={28} className="text-neutral-600" />
          </div>
          <p className="text-neutral-300 font-medium text-sm">Sonuç bulunamadı</p>
          <p className="text-neutral-500 text-xs mt-1">Aramanı değiştirip tekrar dene.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const colors = CATEGORY_COLORS[cat];
          const count = getCategoryCount(cat);
          const reminderCount = getReminderCount(cat);
          return (
            <button
              key={cat}
              onClick={() => openCategory(cat)}
              className={`w-full group relative overflow-hidden rounded-2xl border ${colors.border} bg-neutral-900/60 backdrop-blur-sm p-4 text-left transition-all duration-300 hover:bg-neutral-900/90 hover:scale-[1.01] active:scale-[0.99]`}
            >
              <div className="flex items-center gap-4">
                {/* Folder icon */}
                <div className={`w-14 h-14 shrink-0 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                  <Icon size={24} className={colors.text} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-neutral-100 font-semibold text-base">#{cat}</h3>
                    {reminderCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5 text-xs font-medium border border-amber-500/30">
                        <Bell size={11} />
                        {reminderCount}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-500 text-xs mt-0.5 truncate">
                    {CATEGORY_META[cat].description}
                  </p>
                </div>

                {/* Count badge */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-2xl font-bold ${colors.text}`}>{count}</span>
                  <span className="text-neutral-600 text-xs">not</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderCategoryView = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={28} className="text-neutral-600 animate-spin" />
          <p className="text-neutral-500 text-sm mt-3">Notlar yükleniyor...</p>
        </div>
      );
    }

    if (categoryNotes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
            <Inbox size={28} className="text-neutral-600" />
          </div>
          <p className="text-neutral-300 font-medium text-sm">
            {search ? 'Sonuç bulunamadı' : 'Bu klasörde not yok'}
          </p>
          <p className="text-neutral-500 text-xs mt-1 max-w-xs">
            {search
              ? 'Aramanı değiştirip tekrar dene.'
              : 'Aşağıdaki butonlarla bu kategoriye not ekleyebilirsin.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {categoryNotes.map((note) => (
          <NoteCard key={note.id} note={note} onDelete={handleDelete} onEdit={handleEdit} />
        ))}
      </div>
    );
  };

  const headerTitle = view === 'folders' ? 'Anlık Akıl Defteri' : `#${activeCategory}`;
  const headerSubtitle = view === 'folders'
    ? 'Fikirlerini anında yakala'
    : CATEGORY_META[activeCategory!].description;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      {/* Reminder popups */}
      <ReminderPopup
        reminders={activeReminders}
        onDismiss={dismissReminder}
        permission={permission}
        onRequestPermission={requestPermission}
      />

      {/* Ambient glow background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      {/* Main container */}
      <div className="relative mx-auto max-w-2xl px-4 pb-40">
        {/* Header */}
        <header className="pt-6 pb-4 sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl -mx-4 px-4">
          <div className="flex items-center gap-3 mb-4">
            {view === 'category' && (
              <button
                onClick={goToFolders}
                className="p-2 -ml-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
                aria-label="Klasörlere dön"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg border ${
              view === 'category' && activeCategory
                ? `${CATEGORY_COLORS[activeCategory].bg} ${CATEGORY_COLORS[activeCategory].border}`
                : 'bg-gradient-to-br from-neutral-800 to-neutral-900 border-neutral-700'
            }`}>
              {view === 'category' && activeCategory ? (
                (() => {
                  const Icon = CATEGORY_ICONS[activeCategory];
                  return <Icon size={22} className={CATEGORY_COLORS[activeCategory].text} />;
                })()
              ) : (
                <NotebookPen size={22} className="text-neutral-200" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-neutral-100 truncate">{headerTitle}</h1>
              <p className="text-xs text-neutral-500 truncate">{headerSubtitle}</p>
            </div>
            {view === 'folders' && (
              <div className="shrink-0 text-right">
                <span className="text-2xl font-bold text-neutral-200">{notes.length}</span>
                <p className="text-neutral-600 text-xs">toplam</p>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={view === 'folders' ? 'Tüm notlarda ara...' : 'Bu klasörde ara...'}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-11 pr-10 py-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="mt-2">
          {loading && view === 'folders' ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={28} className="text-neutral-600 animate-spin" />
              <p className="text-neutral-500 text-sm mt-3">Klasörler yükleniyor...</p>
            </div>
          ) : view === 'folders' ? (
            renderFolders()
          ) : (
            renderCategoryView()
          )}
        </main>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 pb-safe">
        <div className="bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent pt-8 pb-4 px-4">
          <div className="mx-auto max-w-2xl">
            <div className="flex gap-3 items-center">
              <button
                onClick={() => setShowPhoto(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98] transition-all text-sm font-semibold shadow-lg shadow-blue-500/20"
              >
                <Camera size={20} />
                <span className="hidden xs:inline">Fotoğraf Ekle</span>
                <span className="xs:hidden">Foto</span>
              </button>
              <button
                onClick={() => setShowVoice(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 text-neutral-900 hover:bg-amber-400 active:scale-[0.98] transition-all text-sm font-bold shadow-lg shadow-amber-500/20"
              >
                <Mic size={20} />
                <span className="hidden xs:inline">Sesli Not</span>
                <span className="xs:hidden">Ses</span>
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="w-14 h-[52px] shrink-0 flex items-center justify-center rounded-2xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:scale-[0.98] transition-all border border-neutral-700"
                aria-label="El ile not ekle"
              >
                <PenLine size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPhoto && <PhotoModal onClose={() => setShowPhoto(false)} onSaved={fetchNotes} />}
{showVoice && <VoiceModal onClose={() => setShowVoice(false)} onSaved={fetchNotes} />}
      {showManual && <ManualNoteModal onClose={() => setShowManual(false)} onSaved={fetchNotes} />}
      {editingNote && (
        <EditModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSaved={() => {
            fetchNotes();
            setEditingNote(null);
          }}
        />
      )}
    </div>
  );
}
