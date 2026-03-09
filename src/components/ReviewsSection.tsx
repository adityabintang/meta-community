import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "Rina Pratiwi",
    role: "Frontend Developer",
    text: "Meta Community benar-benar mengubah cara saya belajar coding. Komunitasnya sangat suportif dan selalu siap membantu. Event-eventnya juga sangat berkualitas!",
    rating: 5,
  },
  {
    name: "Budi Santoso",
    role: "UI/UX Designer",
    text: "Sebagai non-coder, saya awalnya ragu untuk bergabung. Tapi ternyata Meta Community sangat terbuka dan inklusif. Sekarang saya banyak berkolaborasi dengan developer!",
    rating: 5,
  },
  {
    name: "Ahmad Fauzi",
    role: "Mahasiswa IT",
    text: "Dari pemula yang tidak tahu apa-apa, sekarang saya sudah bisa membangun project sendiri berkat sharing knowledge dari anggota Meta Community. Sangat recommended!",
    rating: 5,
  },
  {
    name: "Siti Nurhaliza",
    role: "Project Manager",
    text: "Networking di Meta Community luar biasa. Saya sudah menemukan banyak partner kolaborasi untuk berbagai project. Komunitas yang sangat profesional namun tetap hangat.",
    rating: 5,
  },
];

const ReviewsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const leftColY = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const rightColY = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <section id="news" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            Testimoni
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Apa Kata <span className="text-accent">Member</span> Kami
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Left column - parallax up */}
          <motion.div style={{ y: leftColY }} className="flex flex-col gap-6">
            {reviews.slice(0, 2).map((review, i) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-card shadow-card border border-border/50 relative"
              >
                <Quote className="absolute top-6 right-6 w-8 h-8 text-accent/15" />
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed mb-6">"{review.text}"</p>
                <div>
                  <p className="font-display font-semibold text-foreground">{review.name}</p>
                  <p className="text-sm text-muted-foreground">{review.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right column - parallax down */}
          <motion.div style={{ y: rightColY }} className="flex flex-col gap-6">
            {reviews.slice(2).map((review, i) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: (i + 2) * 0.1 }}
                className="p-8 rounded-2xl bg-card shadow-card border border-border/50 relative"
              >
                <Quote className="absolute top-6 right-6 w-8 h-8 text-accent/15" />
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed mb-6">"{review.text}"</p>
                <div>
                  <p className="font-display font-semibold text-foreground">{review.name}</p>
                  <p className="text-sm text-muted-foreground">{review.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
