import { motion, useScroll, useTransform } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { MessageCircle, Camera, AtSign, BarChart3, Code2, Briefcase } from "lucide-react";

const tools = [
  {
    icon: MessageCircle,
    title: "WhatsApp API",
    description: "Integrasi messaging untuk bisnis — kirim notifikasi, customer support, dan automasi percakapan.",
    gradient: "from-[hsl(142_70%_45%)] to-[hsl(152_60%_55%)]",
    iconBg: "bg-[hsl(142_70%_45%/0.15)]",
    iconColor: "text-[hsl(142_70%_45%)]",
  },
  {
    icon: Camera,
    title: "Instagram API",
    description: "Kelola konten, analitik engagement, dan integrasi feed langsung ke platform Anda.",
    gradient: "from-[hsl(330_70%_55%)] to-[hsl(25_90%_55%)]",
    iconBg: "bg-[hsl(330_70%_55%/0.15)]",
    iconColor: "text-[hsl(330_70%_55%)]",
  },
  {
    icon: AtSign,
    title: "Threads API",
    description: "Bangun koneksi sosial dan distribusi konten melalui platform Threads terbaru dari Meta.",
    gradient: "from-[hsl(220_80%_55%)] to-[hsl(260_70%_60%)]",
    iconBg: "bg-[hsl(220_80%_55%/0.15)]",
    iconColor: "text-[hsl(220_80%_55%)]",
  },
  {
    icon: BarChart3,
    title: "Meta Ads",
    description: "Platform advertising terdepan — targeting presisi, analitik mendalam, dan ROI terukur.",
    gradient: "from-[hsl(200_60%_50%)] to-[hsl(215_70%_55%)]",
    iconBg: "bg-[hsl(200_60%_50%/0.15)]",
    iconColor: "text-accent",
  },
  {
    icon: Code2,
    title: "Meta Developer",
    description: "Akses SDK, dokumentasi, dan developer tools untuk membangun di ekosistem Meta.",
    gradient: "from-[hsl(250_60%_55%)] to-[hsl(280_60%_55%)]",
    iconBg: "bg-[hsl(250_60%_55%/0.15)]",
    iconColor: "text-[hsl(250_60%_55%)]",
  },
  {
    icon: Briefcase,
    title: "Meta Business Suite",
    description: "Kelola semua akun bisnis Meta Anda dalam satu dashboard — posting, inbox, dan insights.",
    gradient: "from-[hsl(215_60%_50%)] to-[hsl(200_60%_55%)]",
    iconBg: "bg-[hsl(215_60%_50%/0.15)]",
    iconColor: "text-[hsl(215_60%_50%)]",
  },
];

const MetaToolsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const bgOrbY1 = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const bgOrbY2 = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["8%", "-4%"]);

  return (
    <section className="py-24 md:py-32 relative overflow-hidden" ref={ref}>
      {/* Parallax background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-accent/5 via-transparent to-accent/5" />
        <motion.div style={{ y: bgOrbY1 }} className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-accent/8 blur-3xl" />
        <motion.div style={{ y: bgOrbY2 }} className="absolute bottom-1/3 -left-32 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium tracking-wider uppercase mb-4">
            Tools & Ekosistem
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Ekosistem <span className="text-accent">Meta</span> Platform
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pelajari dan kuasai berbagai tools serta API dari ekosistem Meta bersama komunitas.
          </p>
        </motion.div>

        <motion.div style={{ y: gridY }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative p-6 rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tool.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className={`w-12 h-12 rounded-xl ${tool.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">{tool.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MetaToolsSection;
