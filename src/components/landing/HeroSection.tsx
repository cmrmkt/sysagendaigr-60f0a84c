import { Button } from "@/components/ui/button";
import { MousePointer2 } from "lucide-react";
import { Link } from "react-router-dom";
const HeroSection = () => {
  return (
    <section className="relative py-10 md:py-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container relative z-10 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Headline */}
          <h1 className="text-[1.6rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight whitespace-nowrap">
            <span className="text-foreground">Sistema de Agenda Online</span>
            <br />
            <span className="text-primary">Para sua Igreja</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium">
            Com envio de lembretes pelo WhatsApp
          </p>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Gerencie eventos, ministérios e tarefas com facilidade.{" "}
            <span className="text-foreground font-semibold">Lembretes automáticos mantêm todos os líderes informados</span>{" "}
            — tudo num só lugar, pronto para usar em minutos.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="h-auto py-2 px-8 shadow-lg hover:shadow-xl transition-all flex flex-col items-center leading-tight"
              onClick={() => {
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span className="text-lg flex items-center">
                Comece Agora
                <MousePointer2 className="ml-2 w-5 h-5" />
              </span>
              <span className="text-sm font-normal opacity-90 -mt-3">7 dias Grátis</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 px-8 text-lg"
              asChild
            >
              <Link to="/login">
                Já tenho conta
              </Link>
            </Button>
          </div>
          {/* Trust badges */}
          <div className="pt-6 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span> Sem cartão de crédito
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span> Configuração em minutos
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span> Suporte via WhatsApp
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
