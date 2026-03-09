## Plan: Simplify Footer & Running Text (Marquee) untuk Logo Meta Products & Reviews

### 1. Komponen LogoMarquee (baru)

Buat komponen `src/components/LogoMarquee.tsx` yang menampilkan logo-logo produk Meta (WhatsApp, Instagram, Facebook, Threads, Manus) dalam infinite scrolling marquee horizontal. Logo akan menggunakan ikon dari lucide-react dan/atau SVG sederhana. Animasi menggunakan CSS `@keyframes marquee` untuk pergerakan seamless tanpa jeda.

- Duplikasi array logo 2x agar animasi loop tanpa gap
- Tampilkan nama produk di bawah/samping ikon
- Letakkan di antara MetaToolsSection dan ReviewsSection di Index.tsx

### 2. Reviews Section Jadi Marquee

Ubah `ReviewsSection.tsx` dari layout grid 2 kolom menjadi horizontal running text (marquee):

- Card review berjalan horizontal secara terus-menerus
- Dua baris marquee: baris pertama ke kiri, baris kedua ke kanan (untuk variasi visual)
- Tetap pertahankan heading/title section di atas
- Hapus parallax scroll yang ada, ganti dengan CSS marquee animation

### 3. CSS Marquee Animation

Tambahkan keyframes di `tailwind.config.ts`:

- `marquee`: translateX(0) → translateX(-50%) untuk scroll kiri
- `marquee-reverse`: translateX(-50%) → translateX(0) untuk scroll kanan
- Durasi ~30-40 detik, linear, infinite
- Pause on hover via `hover:animation-play-state: paused`

### Perubahan File

- **Buat**: `src/components/LogoMarquee.tsx`
- **Edit**: `src/components/ReviewsSection.tsx` — ubah ke marquee layout
- **Edit**: `src/pages/Index.tsx` — tambahkan LogoMarquee
- **Edit**: `tailwind.config.ts` — tambahkan keyframes marquee

### 4. Ubah footer menjadi layout sederhana satu baris dengan:

- Copyright text di kiri (atau tengah)
- Link "Kebijakan Privasi" dan "Syarat Layanan" di kanan (atau samping)
- Hapus grid 3 kolom, navigasi, logo, dan deskripsi

### Perubahan File

- **Edit**: `src/components/Footer.tsx` — simplify ke satu baris: copyright + dua link legal