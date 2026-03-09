import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const KebijakanPrivasi = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-8">Kebijakan Privasi</h1>
        <p className="text-sm text-muted-foreground mb-8">Terakhir diperbarui: 1 Maret 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/80">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">1. Informasi yang Kami Kumpulkan</h2>
            <p>Kami mengumpulkan informasi yang Anda berikan secara langsung saat mendaftar sebagai anggota Meta Community, termasuk nama, alamat email, dan informasi profil lainnya.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">2. Penggunaan Informasi</h2>
            <p>Informasi yang kami kumpulkan digunakan untuk menyediakan, memelihara, dan meningkatkan layanan komunitas kami, serta untuk berkomunikasi dengan Anda mengenai event, pembaruan, dan informasi terkait komunitas.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">3. Perlindungan Data</h2>
            <p>Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi informasi pribadi Anda dari akses, penggunaan, atau pengungkapan yang tidak sah.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">4. Berbagi Informasi</h2>
            <p>Kami tidak menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga. Informasi hanya dibagikan sesuai kebutuhan untuk menjalankan layanan komunitas.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">5. Hubungi Kami</h2>
            <p>Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, silakan hubungi kami melalui kanal resmi Meta Community.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default KebijakanPrivasi;
