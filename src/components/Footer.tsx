import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoLight from "@/assets/meta-logo-light.png";
import logoDark from "@/assets/meta-logo-dark.png";

const Footer = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="py-16 border-t border-border bg-card">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={isDark ? logoDark : logoLight} alt="Meta Community" className="h-8 w-8 object-contain" />
              <span className="font-display font-semibold text-lg text-foreground">META COMMUNITY</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Komunitas terbuka untuk semua kalangan — tempat berkolaborasi, belajar, dan bertumbuh bersama.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#home" className="hover:text-foreground transition-colors">Home</a></li>
              <li><a href="#product" className="hover:text-foreground transition-colors">Product</a></li>
              <li><a href="#news" className="hover:text-foreground transition-colors">News</a></li>
              <li><a href="#event" className="hover:text-foreground transition-colors">Event</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/kebijakan-privasi" className="hover:text-foreground transition-colors">Kebijakan Privasi</Link></li>
              <li><Link to="/syarat-layanan" className="hover:text-foreground transition-colors">Syarat Layanan</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Meta Community. Seluruh hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
