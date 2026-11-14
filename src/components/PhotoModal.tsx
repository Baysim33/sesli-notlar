import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { supabase, type NoteCategory } from '@/lib/supabase';
import ReminderField from './ReminderField';

interface PhotoModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type Phase = 'upload' | 'preview' | 'analyzing' | 'result';

const AI_SIMULATION_STEPS = [
  'Görüntü taranıyor...',
  'Metinler tanınıyor (OCR)...',
  'İçerik analiz ediliyor...',
  'Kategori belirleniyor...',
  'Not hazırlanıyor...',
];

const SAMPLE_RESULTS = [
  {
    title: 'Beyaz Tahta Notu — Ders Planı',
    content: 'Yarınki sunum için slayt sırası: 1) Giriş, 2) Literatür, 3) Yöntem, 4) Bulgular, 5) Sonuç. Sunum süresi 15 dk. Görselleri ekle.',
    category: 'Ders' as NoteCategory,
  },
  {
    title: 'Teknik Diyagram — API Akışı',
    content: 'Client → API Gateway → Auth Service → Database. Rate limit: 100 req/dk. Cache layer Redis üzerinde 5 dk TTL ile çalışıyor.',
    category: 'Teknik' as NoteCategory,
  },
  {
    title: 'Görev Listesi — Market',
    content: 'Süt, ekmek, yumurta, zeytin, peynir, çay, domates, biber. Haftalık alışveriş listesi olarak kaydedildi.',
    category: 'Görevler' as NoteCategory,
  },
];

export default function PhotoModal({ onClose, onSaved }: PhotoModalProps) {
  const [phase, setPhase] = useState<Phase>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [result, setResult] = useState<typeof SAMPLE_RESULTS[0] | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingCategory, setEditingCategory] = useState<NoteCategory>('Genel');
  const [editingRemindAt, setEditingRemindAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      setPhase('preview');
    };
    reader.onerror = () => {
      const fallbackUrl = URL.createObjectURL(file);
      setPreviewUrl(fallbackUrl);
      setPhase('preview');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const startAnalysis = () => {
    setPhase('analyzing');
    setAnalyzingStep(0);

    AI_SIMULATION_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setAnalyzingStep(i);
      }, i * 700);
    });

    setTimeout(() => {
      const sample = SAMPLE_RESULTS[Math.floor(Math.random() * SAMPLE_RESULTS.length)];
      setResult(sample);
      setEditingTitle(sample.title);
      setEditingContent(sample.content);
      setEditingCategory(sample.category);
      setEditingRemindAt(sample.category === 'Görevler' ? (() => {
        const d = new Date();
        d.setHours(d.getHours() + 2, 0, 0, 0);
        return d.toISOString();
      })() : null);
      setPhase('result');
    }, AI_SIMULATION_STEPS.length * 700 + 500);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('notes').insert({
      title: editingTitle,
      content: editingContent,
      category: editingCategory,
      image_url: previewUrl,
      remind_at: editingRemindAt,
      source: 'photo',
    });
    setSaving(false);
    if (!error) {
      onSaved();
      onClose();
    }
  };

  const useSamplePhoto = () => {
    setPreviewUrl('https://images.pexels.com/photos/261909/pexels-photo-261909.jpeg?auto=compress&cs=tinysrgb&w=600');
    setPhase('preview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Camera size={18} className="text-blue-400" />
            </div>
            <h2 className="text-neutral-100 font-semibold text-base">Fotoğraf ile Not</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* Phase: Upload */}
          {phase === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-neutral-700 rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors hover:border-neutral-600 hover:bg-neutral-800/30"
              >
                <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center">
                  <Upload size={24} className="text-neutral-400" />
                </div>
                <div className="text-center">
                  <p className="text-neutral-200 font-medium text-sm">Dosya seç veya sürükle</p>
                  <p className="text-neutral-500 text-xs mt-1">JPG, PNG — yapay zeka analiz edecek</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-neutral-600 text-xs">veya</span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>
              <button
                onClick={useSamplePhoto}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-sm font-medium"
              >
                <ImageIcon size={16} />
                Örnek fotoğraf kullan
              </button>
            </div>
          )}

          {/* Phase: Preview */}
          {phase === 'preview' && previewUrl && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-neutral-800">
                <img src={previewUrl} alt="Önizleme" className="w-full max-h-72 object-cover" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setPhase('upload');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-sm font-medium"
                >
                  Değiştir
                </button>
                <button
                  onClick={startAnalysis}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-semibold"
                >
                  <Sparkles size={16} />
                  Yapay Zeka ile Analiz Et
                </button>
              </div>
            </div>
          )}

          {/* Phase: Analyzing */}
          {phase === 'analyzing' && previewUrl && (
            <div className="space-y-5">
              <div className="rounded-2xl overflow-hidden border border-neutral-800 relative">
                <img src={previewUrl} alt="Analiz" className="w-full max-h-48 object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                  </div>
                </div>
                {/* Scanning line effect */}
                <div className="absolute inset-x-0 h-0.5 bg-blue-400/70 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-scan" />
              </div>
              <div className="space-y-2.5">
                {AI_SIMULATION_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                      i < analyzingStep ? 'text-neutral-300' : i === analyzingStep ? 'text-blue-400' : 'text-neutral-600'
                    }`}
                  >
                    {i < analyzingStep ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : i === analyzingStep ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-neutral-700" />
                    )}
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase: Result */}
          {phase === 'result' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <Check size={18} />
                Analiz tamamlandı! Notu düzenleyip kaydedebilirsin.
              </div>
              {previewUrl && (
                <div className="rounded-xl overflow-hidden border border-neutral-800">
                  <img src={previewUrl} alt="Kaynak" className="w-full h-24 object-cover" />
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Başlık</label>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">İçerik</label>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={4}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-100 text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Kategori</label>
                  <div className="flex gap-2">
                    {(['Ders', 'Teknik', 'Görevler', 'Genel'] as NoteCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setEditingCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          editingCategory === cat
                            ? 'bg-blue-500 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <ReminderField value={editingRemindAt} onChange={setEditingRemindAt} accentColor="blue" />
              <button
                onClick={handleSave}
                disabled={saving || !editingTitle.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
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
