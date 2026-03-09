import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Apa itu Meta Community?",
    answer: "Meta Community adalah komunitas terbuka yang menyatukan berbagai kalangan — dari coders hingga non-coders, pemula hingga profesional — untuk saling berkolaborasi, sharing knowledge, dan bertumbuh bersama dalam ekosistem teknologi.",
  },
  {
    question: "Siapa saja yang bisa bergabung?",
    answer: "Semua orang! Meta Community terbuka untuk seluruh kalangan tanpa batasan latar belakang. Baik Anda seorang developer, designer, project manager, mahasiswa, atau bahkan baru memulai di dunia teknologi — Anda sangat disambut di sini.",
  },
  {
    question: "Apakah ada biaya untuk bergabung?",
    answer: "Tidak, bergabung dengan Meta Community sepenuhnya gratis. Kami percaya bahwa akses terhadap komunitas dan pengetahuan harus terbuka untuk semua orang.",
  },
  {
    question: "Event apa saja yang diselenggarakan?",
    answer: "Meta Community menyelenggarakan berbagai event seperti Tech Talk, Workshop, Hackathon, dan sesi mentoring. Event-event ini mencakup topik mulai dari Web Development, UI/UX Design, hingga tools dan API dari ekosistem Meta.",
  },
  {
    question: "Bagaimana cara berkolaborasi di Meta Community?",
    answer: "Anda bisa berkolaborasi melalui berbagai channel — bergabung dalam project bersama, berdiskusi di forum komunitas, mengikuti workshop, atau bahkan mengajukan ide event Anda sendiri. Semua member didorong untuk aktif berkontribusi.",
  },
  {
    question: "Apakah Meta Community terkait dengan perusahaan Meta (Facebook)?",
    answer: "Meta Community adalah komunitas independen yang fokus pada pembelajaran dan kolaborasi seputar teknologi, termasuk tools dan API dari ekosistem Meta Platform seperti WhatsApp API, Instagram API, dan Meta Ads.",
  },
];

const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            FAQ
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Pertanyaan <span className="text-accent">Umum</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Temukan jawaban untuk pertanyaan yang sering diajukan tentang Meta Community.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl bg-card border border-border/50 shadow-card px-6 data-[state=open]:shadow-card-hover transition-shadow"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
