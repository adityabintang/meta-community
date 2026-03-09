import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Code2, Handshake, GraduationCap, Globe } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Terbuka untuk Semua",
    description: "Dari coders hingga non-coders, pemula hingga expert dan professional — semua kalangan diterima di Meta Community.",
  },
  {
    icon: Handshake,
    title: "Kolaborasi Tanpa Batas",
    description: "Tempat terbaik untuk berkolaborasi, membangun proyek bersama, dan memperluas jaringan profesional Anda.",
  },
  {
    icon: Code2,
    title: "Sharing Knowledge",
    description: "Berbagi pengetahuan dan pengalaman dengan sesama anggota melalui diskusi, workshop, dan mentoring.",
  },
  {
    icon: GraduationCap,
    title: "Belajar & Berkembang",
    description: "Akses ke berbagai sumber belajar, event eksklusif, dan kesempatan untuk terus bertumbuh bersama komunitas.",
  },
];

const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="product" className="py-24 md:py-32 relative" ref={ref}>
      {/* Gradient accent decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            Kenapa Meta Community?
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Dibangun untuk <span className="text-accent">Komunitas</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Lebih dari 160 member dari semua kalangan yang tergabung dalam ekosistem Meta Community.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-8 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
