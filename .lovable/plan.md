

## Plan: Banner Images untuk Event Cards + Fix Header Navigation di Event Page

### Masalah yang ditemukan

1. **Header navigation**: Menu items seperti Home (#home), Product (#product), News (#news) menggunakan anchor links (`#home`, `#product`) yang hanya bekerja di halaman Index. Di halaman `/event`, anchor links ini tidak navigate ke mana-mana karena section tersebut tidak ada di EventPage.

2. **Tombol Back to Home**: Tidak diperlukan di halaman Event karena header sudah ada navigasi.

3. **Banner/poster event**: Saat ini event card hanya menampilkan gradient warna. Perlu ditambahkan gambar banner.

### Perubahan File

#### 1. `src/components/Header.tsx`
- Deteksi lokasi saat ini menggunakan `useLocation()` (sudah di-import)
- Jika bukan di halaman `/` (home), ubah anchor links (`#home`, `#product`, `#news`) menjadi navigasi ke `/#home`, `/#product`, `/#news` menggunakan `Link` dari react-router
- Logo link juga harus navigate ke `/` bukan `#home` saat di halaman lain
- Join button juga perlu link ke `/` saat bukan di homepage

#### 2. `src/pages/EventPage.tsx`
- Hapus tombol "Back to Home" (baris 42-55)
- Tambahkan field `image` pada setiap event card banner — menggunakan placeholder image dari URL (misalnya via picsum/unsplash placeholder atau emoji/icon-based illustration)
- Ganti gradient-only banner dengan gambar + gradient overlay

#### 3. `src/i18n/translations.ts`
- Tambahkan field `image` ke setiap event item dengan URL gambar placeholder yang relevan (menggunakan public placeholder images)

### Detail Teknis

**Header fix**: Cek `location.pathname !== "/"`, jika true maka semua anchor href diganti ke `/${href}` dan render sebagai `Link` ke `/${anchor}`.

**Event banner images**: Gunakan gambar dari `https://images.unsplash.com` yang relevan dengan topik event (web dev, design, marketing, hackathon, WhatsApp). Overlay gradient tetap dipertahankan di atas gambar agar badge dan text tetap readable.

