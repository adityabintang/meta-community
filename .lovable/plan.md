

## Plan: Dark Mode Toggle + Meta Brand Tools Section

### 1. Dark Mode Toggle di Header
- Tambahkan tombol Sun/Moon icon di header (sebelum tombol "Bergabung")
- Toggle class `dark` pada `document.documentElement`
- Simpan preferensi di `localStorage`
- Update state `isDark` yang sudah ada di Header

### 2. Section Baru: "Tools & Ekosistem Meta"
Tambahkan section baru (antara FeaturesSection dan ReviewsSection) yang menampilkan brand tools Meta:
- **WhatsApp API** — icon MessageCircle, deskripsi integrasi messaging
- **Instagram API** — icon Camera, deskripsi konten & engagement
- **Threads API** — icon AtSign, deskripsi social networking
- **Meta Ads** — icon BarChart3, deskripsi advertising platform
- **Meta Developer** — icon Code2, deskripsi developer tools
- **Meta Business Suite** — icon Briefcase, deskripsi business management

Desain: grid cards dengan gradient accent backgrounds, hover animations, agar halaman lebih berwarna dan tidak monoton putih.

### 3. Tambah Warna & Visual Interest
- Tambahkan gradient accent strip/decoration di beberapa section (hero, features) agar tidak terlalu plain putih
- Section tools menggunakan gradient background (accent-tinted) untuk memecah monotoni

### File yang Diubah
- `src/components/Header.tsx` — tambah dark mode toggle button
- `src/components/MetaToolsSection.tsx` — buat section baru untuk brand tools
- `src/pages/Index.tsx` — import & render MetaToolsSection
- `src/components/HeroSection.tsx` — tambah subtle gradient background
- `src/components/FeaturesSection.tsx` — tambah gradient accent decoration

