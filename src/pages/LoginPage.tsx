import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground">Meta Community</h1>
          </Link>
          <p className="text-muted-foreground text-sm">Masuk untuk bergabung dengan komunitas</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <button
            onClick={() => {}}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Dengan masuk, kamu menyetujui{" "}
              <Link to="/syarat-layanan" className="text-accent hover:underline">Syarat Layanan</Link>
              {" "}dan{" "}
              <Link to="/kebijakan-privasi" className="text-accent hover:underline">Kebijakan Privasi</Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Kembali ke beranda
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
