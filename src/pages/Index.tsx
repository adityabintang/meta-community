import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import MetaToolsSection from "@/components/MetaToolsSection";
import ReviewsSection from "@/components/ReviewsSection";
import EventSection from "@/components/EventSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <MetaToolsSection />
      <ReviewsSection />
      <EventSection />
      <Footer />
    </div>
  );
};

export default Index;
