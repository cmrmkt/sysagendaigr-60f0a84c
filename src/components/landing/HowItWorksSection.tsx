import { MessageCircle, Smartphone, Gift, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Smartphone,
    title: "Faça seu cadastro",
    description: "Cadastre sua igreja diretamente no sistema em poucos minutos. É rápido, fácil e sem burocracia."
  },
  {
    icon: Gift,
    title: "Experimente por 7 dias",
    description: "Acesse todas as funcionalidades gratuitamente. Configure ministérios, eventos e tarefas no seu ritmo."
  },
  {
    icon: MessageCircle,
    title: "Conheça o sistema",
    description: "Explore a agenda, quadros Kanban, lembretes automáticos e tudo que o AgendaIGR oferece."
  },
  {
    icon: CreditCard,
    title: "Ative seu plano",
    description: "Após os 7 dias, solicite a ativação do seu plano e continue usando todas as funcionalidades."
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-12 md:py-20 bg-muted/30 border-t border-border/40">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-lg text-muted-foreground">
            Comece a usar o AgendaIGR em 4 passos simples
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector line (hidden on mobile and last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-border" />
                )}
                
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Step number & icon */}
                  <div className="relative">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center mt-12">
          <p className="text-lg text-muted-foreground mb-4">
            Experimente todas as funcionalidades por <span className="text-primary font-semibold">7 dias grátis</span>. Faça seu cadastro agora mesmo!
          </p>
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg shadow-lg"
            onClick={() => {
              document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Escolha seu Plano
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
