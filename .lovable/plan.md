

## Product Showcase Page

Halaman baru `/product` untuk menampilkan showcase project dari member Meta Community, mengikuti referensi screenshot dengan grid card project, tapi disesuaikan dengan tema visual yang sudah ada (glassmorphism, gradient blobs, framer-motion animations, dark/light mode).

### Struktur

**1. Update navigasi** — Header nav "Product" (`#product`) diubah menjadi route link ke `/product`.

**2. Halaman `ProductPage.tsx`** — Layout:
- Header (reuse existing)
- Hero section dengan badge, judul, dan subtitle (pola sama seperti EventPage)
- Filter bar: tab kategori (Semua, Web App, Mobile App, Landing Page, dll) + search input
- Grid 3 kolom (responsive: 1 col mobile, 2 col tablet, 3 col desktop) berisi project cards
- Footer (reuse existing)

**3. Project Card** — Setiap card menampilkan:
- Thumbnail/preview image (aspect ratio 16:9)
- Judul project
- Deskripsi singkat
- Avatar + nama member
- Badge kategori
- Tombol "Lihat Project" (link external)

**4. Translations** — Tambah key `showcase` di `translations.ts` untuk judul, subtitle, placeholder search, kategori, dan data dummy projects (ID/EN).

**5. Routing** — Tambah route `/product` di `App.tsx`.

### File yang diubah/dibuat

| File | Aksi |
|------|------|
| `src/pages/ProductPage.tsx` | Buat baru |
| `src/components/Header.tsx` | Update nav product → route link |
| `src/i18n/translations.ts` | Tambah key showcase |
| `src/App.tsx` | Tambah route `/product` |

### Data Dummy Projects

Sekitar 9-12 project dummy dengan variasi kategori (Web App, Mobile App, Landing Page, E-Commerce, Dashboard) menggunakan gambar dari Unsplash.

### Visual

- Background: gradient blobs + dot pattern (konsisten dengan login/home)
- Cards: `bg-card border border-border/50 shadow-card hover:shadow-card-hover` dengan animasi hover scale
- Framer Motion staggered entrance untuk cards
- Search bar dengan icon dan styling glassmorphism

