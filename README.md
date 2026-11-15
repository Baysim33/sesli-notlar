# 🎙️ Anlık Akıl Defteri (Sesli Notlar)

Modern, hızlı ve mobil öncelikli sesli, fotoğraflı ve kategorize not alma ve hatırlatıcı web uygulaması.

Fikirlerinizi unutmadan anında sese dökün, fotoğrafını çekin veya yazın; belirlediğiniz zamanlarda akıllı hatırlatıcı bildirimleriyle hiçbir şeyi kaçırmayın.

---

## 🌟 Öne Çıkan Özellikler

- 🎙️ **Ses Kaydı & Konuşmayı Metne Dönüştürme (Speech-to-Text)**:
  - Konuşmanızı anında metne çevirerek not oluşturma (Web Speech API).
  - İsterseniz doğrudan ses kaydını (Audio) not kartı olarak saklama ve dahili ses çalar ile tekrar dinleme.
- 📸 **Fotoğraflı Notlar & OCR**:
  - Kameradan doğrudan fotoğraf çekme veya galeriden resim yükleme.
  - Akıllı içerik simülasyonu ve görsel ekleme desteği.
- 📝 **Manuel Not & Kategori Yönetimi**:
  - `Ders`, `Teknik`, `Görevler`, `Genel` etiketleri ve renk kodlaması ile düzenli arşivleme.
  - Arama ve filtreleme çubuğu ile notlar arasında anında arama.
- ⏰ **Akıllı Hatırlatıcılar & Bildirim Sistemi**:
  - Notlarınıza tarih ve saatli hatırlatıcı ekleme.
  - Süresi geldiğinde tarayıcı/mobil bildirimleri ve sesli uyarı popup'ı.
- 📱 **Mobil Uygulama Uyumlu (PWA Desteği)**:
  - Responsive, dark-mode odaklı native uygulama görünümü.
  - Android ve iOS cihazlara tek tıkla uygulama (PWA) olarak yüklenebilir.
- ☁️ **Bulut Veri Tabanı (Supabase)**:
  - Notlarınız güvenle Supabase PostgreSQL üzerinde saklanır.

---

## 📱 Bu Projeyi Telefonda Uygulama Olarak Nasıl Kullanırsınız?

Bu proje modern bir **Progressive Web App (PWA)** olarak yapılandırılmıştır. Telefonunuzda gerçek bir mobil uygulama gibi kullanmak için iki mükemmel yolunuz vardır:

### 🚀 Yöntem 1: PWA Olarak Ana Ekrana Yükleme (En Kolay ve Önerilen Yol)

Mikrofon izinlerinin ve hatırlatıcı bildirimlerinin telefonda sorunsuz çalışması için sitenin **HTTPS** üzerinden çalışması gerekir.

1. **Projeyi Ücretsiz Yayına Alın (Vercel veya Netlify):**
   - GitHub deponuzu [Vercel](https://vercel.com) veya [Netlify](https://netlify.com)'a bağlayın.
   - Environment Variables (Ortam Değişkenleri) kısmına `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerinizi ekleyin.
   - "Deploy" butonuna basın. Size özel `https://uygulamaniz.vercel.app` bağlantısı oluşacaktır.

2. **Telefona Yükleme:**
   - **Android (Chrome):**
     1. Chrome tarayıcısından oluşturduğunuz site adresini açın.
     2. Sağ üstteki **üç nokta (⋮)** menüsüne dokunun.
     3. **"Uygulamayı Yükle"** veya **"Ana Ekrana Ekle"** seçeneğini seçin.
     4. Artık uygulama ana ekranınızda bağımsız bir mobil uygulama olarak yer alacaktır.
   - **iOS / iPhone (Safari):**
     1. Safari tarayıcısından site adresini açın.
     2. Ekranın alt ortasındaki **Paylaş** (kare içinden yukarı ok çıkan simge) butonuna dokunun.
     3. Aşağı kaydırıp **"Ana Ekrana Ekle"** (+ simgesi) seçeneğine dokunun.
     4. Sağ üstten "Ekle" deyin. Uygulama tıpkı App Store'dan inmiş gibi ana ekranınızda açılacaktır.

---

### 📦 Yöntem 2: Android APK Dosyası Haline Getirme (Capacitor ile)

Eğer doğrudan `.apk` dosyası üretip telefonunuza kurmak isterseniz:

1. Proje dizininde Capacitor paketlerini kurun:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Akıl Defteri" "com.akildefteri.app" --web-dir dist
   ```
2. Projeyi derleyin ve Android platformunu ekleyin:
   ```bash
   npm run build
   npx cap add android
   ```
3. Android projesini Android Studio'da açıp APK oluşturun:
   ```bash
   npx cap open android
   ```
   Android Studio içinden **Build > Build Bundle(s) / APK(s) > Build APK(s)** adımıyla APK dosyanızı alıp telefonunuza yükleyebilirsiniz.

---

## 🛠️ Yerel Geliştirme (Localhost Kurulumu)

Projeyi kendi bilgisayarınızda çalıştırmak için:

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Ortam değişkenlerini ayarlayın:**
   `.env.example` dosyasını `.env` olarak kopyalayın ve Supabase bilgilerinizi girin:
   ```bash
   cp .env.example .env
   ```
   İçerik:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Geliştirme sunucusunu başlatın:**
   ```bash
   npm run dev
   ```

4. **Derleme (Production Build):**
   ```bash
   npm run build
   ```

---

## 🗄️ Supabase Veritabanı Kurulumu

1. [Supabase](https://supabase.com) üzerinde ücretsiz bir hesap açıp yeni bir proje oluşturun.
2. Sol menüden **SQL Editor** sekmesine gidin.
3. `supabase/migrations/20261114175612_create_notes_table.sql` dosyasının içeriğini yapıştırıp **Run** butonuna basın.
4. `supabase/migrations/20261114180755_add_remind_at_column.sql` dosyasının içeriğini yapıştırıp **Run** butonuna basın.
5. **Project Settings > API** bölümünden URL ve `anon` `public` anahtarınızı kopyalayıp `.env` dosyanıza veya Vercel panelinize ekleyin.

---

## 📂 Proje Yapısı

```text
├── public/                 # PWA manifest ve uygulama ikonları
│   ├── icon.svg
│   └── manifest.json
├── src/
│   ├── components/         # Modallar ve Kart bileşenleri
│   │   ├── EditModal.tsx
│   │   ├── ManualNoteModal.tsx
│   │   ├── NoteCard.tsx
│   │   ├── PhotoModal.tsx
│   │   ├── ReminderField.tsx
│   │   ├── ReminderPopup.tsx
│   │   └── VoiceModal.tsx
│   ├── hooks/              # Hatırlatıcı bildirim hook'u
│   │   └── useReminders.ts
│   ├── lib/                # Supabase istemcisi ve tip tanımları
│   │   └── supabase.ts
│   ├── App.tsx             # Ana uygulama arayüzü
│   ├── main.tsx
│   └── index.css
├── supabase/               # SQL veri tabanı şemaları
│   └── migrations/
├── index.html              # Mobil uyumlu HTML ve meta etiketleri
├── package.json
└── vite.config.ts
```

---

## 📄 Lisans

Bu proje MIT lisansı ile lisanslanmıştır.
