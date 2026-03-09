import { motion, useScroll, useTransform } from "framer-motion";
import { Users, Calendar, Sparkles } from "lucide-react";
import { useRef } from "react";

const stats = [
  { icon: Users, value: "160+", label: "Member Aktif" },
  { icon: Calendar, value: "2+", label: "Event Terselenggara" },
  { icon: Sparkles, value: "∞", label: "Peluang Kolaborasi" },
];

const HeroSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const bgY1 = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const bgY2 = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const bgY3 = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const statsY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section id="home" ref={ref} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Parallax background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <motion.div style={{ y: bgY1 }} className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/8 blur-3xl animate-float" />
        <motion.div style={{ y: bgY2 }} className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/8 blur-3xl animate-float" />
        <motion.div style={{ y: bgY3 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/3 blur-[100px]" />
      </div>

      <motion.div style={{ y: textY, opacity }} className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium tracking-wider uppercase mb-6">
              Komunitas Terbuka untuk Semua
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-display font-bold leading-tight tracking-tight mb-6"
          >
            Berkolaborasi &{" "}
            <span className="text-accent">Bertumbuh</span>{" "}
            Bersama
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Meta Community adalah komunitas yang sangat terbuka untuk seluruh pesertanya untuk saling berkolaborasi dan sharing knowledge bersama.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
          >
            <a href="#product" className="px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Jelajahi Sekarang
            </a>
            <a href="#event" className="px-8 py-3.5 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors">
              Lihat Event
            </a>
          </motion.div>

          {/* Stats with separate parallax speed */}
          <motion.div
            style={{ y: statsY }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                className="flex flex-col items-center gap-2 p-6 rounded-xl bg-card shadow-card"
              >
                <stat.icon className="w-5 h-5 text-accent" />
                <span className="text-3xl font-display font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
