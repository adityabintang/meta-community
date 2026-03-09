import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="py-6 border-t border-border bg-card">
    <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>© {new Date().getFullYear()} Meta Community. Seluruh hak cipta dilindungi.</span>
      <div className="flex gap-6">
        <Link to="/kebijakan-privasi" className="hover:text-foreground transition-colors">Kebijakan Privasi</Link>
        <Link to="/syarat-layanan" className="hover:text-foreground transition-colors">Syarat Layanan</Link>
      </div>
    </div>
  </footer>
);

export default Footer;
