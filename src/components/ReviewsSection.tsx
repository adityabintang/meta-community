import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { translations } from "@/i18n/translations";

const reviews = [
  { name: "Rina Pratiwi", role: "Frontend Developer", text: "Meta Community benar-benar mengubah cara saya belajar coding. Komunitasnya sangat suportif dan selalu siap membantu. Event-eventnya juga sangat berkualitas!", rating: 5 },
  { name: "Budi Santoso", role: "UI/UX Designer", text: "Sebagai non-coder, saya awalnya ragu untuk bergabung. Tapi ternyata Meta Community sangat terbuka dan inklusif. Sekarang saya banyak berkolaborasi dengan developer!", rating: 5 },
  { name: "Ahmad Fauzi", role: "Mahasiswa IT", text: "Dari pemula yang tidak tahu apa-apa, sekarang saya sudah bisa membangun project sendiri berkat sharing knowledge dari anggota Meta Community. Sangat recommended!", rating: 5 },
  { name: "Siti Nurhaliza", role: "Project Manager", text: "Networking di Meta Community luar biasa. Saya sudah menemukan banyak partner kolaborasi untuk berbagai project. Komunitas yang sangat profesional namun tetap hangat.", rating: 5 },
];

const ReviewCard = ({ review }: { review: (typeof reviews)[0] }) => (
  <div className="p-8 rounded-2xl bg-card shadow-card border border-border/50 relative shrink-0 w-[360px]">
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
  </div>
);

const ReviewsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();

  const row1 = [...reviews, ...reviews, ...reviews, ...reviews];
  const row2 = [...reviews.slice(2), ...reviews.slice(0, 2), ...reviews.slice(2), ...reviews.slice(0, 2), ...reviews.slice(2), ...reviews.slice(0, 2), ...reviews.slice(2), ...reviews.slice(0, 2)];

  return (
    <section id="news" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden" ref={ref}>
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-[hsl(var(--background)/0.8)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-[hsl(var(--background)/0.8)] to-transparent z-10 pointer-events-none" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            {t(translations.reviews.badge)}
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t(translations.reviews.title1)} <span className="text-accent">{t(translations.reviews.titleAccent)}</span> {t(translations.reviews.title2)}
          </h2>
        </motion.div>
      </div>

      <div className="overflow-hidden mb-6">
        <div className="flex gap-6 animate-marquee hover:[animation-play-state:paused] w-max">
          {row1.map((review, i) => (
            <ReviewCard key={`r1-${i}`} review={review} />
          ))}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="flex gap-6 animate-marquee-reverse hover:[animation-play-state:paused] w-max">
          {row2.map((review, i) => (
            <ReviewCard key={`r2-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
