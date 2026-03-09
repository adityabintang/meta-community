import { MessageCircle, Camera, AtSign, Facebook } from "lucide-react";

const logos = [
  { icon: MessageCircle, name: "WhatsApp", color: "text-[hsl(142_70%_45%)]" },
  { icon: Camera, name: "Instagram", color: "text-[hsl(330_70%_55%)]" },
  { icon: Facebook, name: "Facebook", color: "text-[hsl(220_70%_55%)]" },
  { icon: AtSign, name: "Threads", color: "text-foreground" },
  { icon: null, name: "Manus", color: "text-accent" },
];

const LogoItem = ({ logo }: { logo: (typeof logos)[0] }) => (
  <div className="flex items-center gap-3 px-8 shrink-0">
    {logo.icon ? (
      <logo.icon className={`w-8 h-8 ${logo.color}`} />
    ) : (
      <span className={`text-2xl font-display font-bold ${logo.color}`}>M</span>
    )}
    <span className="text-lg font-display font-medium text-muted-foreground whitespace-nowrap">
      {logo.name}
    </span>
  </div>
);

const LogoMarquee = () => {
  const doubled = [...logos, ...logos, ...logos, ...logos];

  return (
    <section className="py-12 border-y border-border/50 bg-secondary/20 overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-[hsl(var(--background))] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-[hsl(var(--background))] to-transparent z-10 pointer-events-none" />
      <div className="flex animate-marquee hover:[animation-play-state:paused] w-max">
        {doubled.map((logo, i) => (
          <LogoItem key={`${logo.name}-${i}`} logo={logo} />
        ))}
      </div>
    </section>
  );
};

export default LogoMarquee;
