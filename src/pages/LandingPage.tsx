import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";
import { Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";

// Hook for scroll-triggered animations
const useScrollAnimation = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            entry.target.classList.remove("opacity-0", "translate-y-8");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-animate");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useAuth();
  useScrollAnimation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (role === "super_admin") {
        navigate("/super-admin/organizacoes");
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, role, isLoading, navigate]);

  // Don't show loading state - render content immediately

  return (
    <div 
      ref={scrollRef}
      className="fixed inset-0 overflow-y-auto bg-background"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-md">
        <div className="container px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <Church className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg text-foreground">AgendaIGR</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-full pb-16">
        <HeroSection />
        
        <div className="scroll-animate opacity-0 translate-y-8 transition-all duration-700">
          <FeaturesSection />
        </div>
        
        <div className="scroll-animate opacity-0 translate-y-8 transition-all duration-700">
          <PricingSection />
        </div>
        
        <div className="scroll-animate opacity-0 translate-y-8 transition-all duration-700">
          <HowItWorksSection />
        </div>
        
        <div className="scroll-animate opacity-0 translate-y-8 transition-all duration-700">
          <FAQSection />
        </div>
      </main>

      {/* Footer */}
      <Footer />
      <ScrollToTopButton scrollRef={scrollRef} />
    </div>
  );
};

export default LandingPage;
