

## Plan: Halaman Login UI + Redirect Tombol Bergabung

### Perubahan

#### 1. `src/pages/LoginPage.tsx` (baru)
- Halaman login dengan desain clean, konsisten dengan tema situs
- Tombol "Sign in with Google" dengan ikon Google
- Teks sambutan dan branding Meta Community
- Layout centered, responsive

#### 2. `src/App.tsx`
- Tambah route `/login` untuk LoginPage

#### 3. `src/components/Header.tsx`
- Ubah tombol "Bergabung" (desktop & mobile) dari `<a href="https://chat.whatsapp.com/...">` menjadi `<Link to="/login">`

#### 4. `src/components/HeroSection.tsx`
- Ubah CTA "Bergabung Komunitas Sekarang" dari link WhatsApp menjadi `<Link to="/login">`

