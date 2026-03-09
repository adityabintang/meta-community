

## Plan: Halaman Login UI + Redirect Tombol Bergabung di Header

### Perubahan

#### 1. `src/pages/LoginPage.tsx` (baru)
- Halaman login dengan desain clean, konsisten dengan tema situs
- Tombol "Sign in with Google" dengan ikon Google SVG
- Branding Meta Community, layout centered & responsive
- Dark mode support

#### 2. `src/App.tsx`
- Tambah route `/login` untuk LoginPage

#### 3. `src/components/Header.tsx`
- Ubah tombol "Bergabung" (desktop & mobile) dari `<a href="https://chat.whatsapp.com/...">` menjadi `<Link to="/login">`

**HeroSection tidak diubah** — tombol "Bergabung Komunitas Sekarang" tetap mengarah ke WhatsApp group.

