import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SyaratLayanan = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-8">Syarat Layanan</h1>
        <p className="text-sm text-muted-foreground mb-8">Terakhir diperbarui: 1 Maret 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/80">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">1. Penerimaan Syarat</h2>
            <p>Dengan bergabung dan menggunakan layanan Meta Community, Anda menyetujui untuk terikat dengan syarat dan ketentuan yang berlaku.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">2. Keanggotaan</h2>
            <p>Keanggotaan Meta Community terbuka untuk semua kalangan. Setiap anggota wajib menjaga etika dan menghormati sesama anggota komunitas.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">3. Kode Etik</h2>
            <p>Anggota diharapkan untuk bersikap profesional, menghargai perbedaan, dan tidak melakukan diskriminasi dalam bentuk apapun. Pelanggaran dapat mengakibatkan penangguhan keanggotaan.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">4. Konten dan Hak Kekayaan Intelektual</h2>
            <p>Setiap konten yang dibagikan dalam komunitas tetap menjadi hak milik pembuatnya. Dengan berbagi konten, Anda memberikan lisensi kepada Meta Community untuk menampilkan konten tersebut di platform kami.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground mb-3">5. Perubahan Syarat</h2>
            <p>Meta Community berhak mengubah syarat layanan ini sewaktu-waktu. Perubahan akan diinformasikan melalui kanal resmi komunitas.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SyaratLayanan;
