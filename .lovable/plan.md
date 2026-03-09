

## Plan: Link tombol "Bergabung Komunitas Sekarang" ke WhatsApp Group

### Perubahan

**`src/components/HeroSection.tsx`**
- Ubah `<a href="#product">` pada tombol CTA pertama menjadi `<a href="https://chat.whatsapp.com/FWjeqZuUleW4s9wg4FnqXS" target="_blank" rel="noopener noreferrer">`

**`src/components/Header.tsx`**
- Ubah link tombol "Join" di header (desktop & mobile) ke URL WhatsApp yang sama dengan `target="_blank"`

