import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Check, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  "Ministérios ilimitados",
  "Eventos ilimitados",
  "Quadros Kanban para cada evento",
  "Mural de avisos",
  "Lembretes automáticos",
  "Notificações push",
  "Usuários ilimitados",
  "Suporte via WhatsApp"
];

const PricingSection = () => {
  return (
    <section id="pricing-section" className="py-10 md:py-16 bg-card border-t border-border/40">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            Planos e Preços
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Escolha seu plano agora
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Comece com 7 dias grátis e tenha acesso a todos os recursos. Sem cartão de crédito necessário.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Mensal */}
          <Card className="relative overflow-hidden border border-border shadow-md">
            <CardHeader className="text-center pt-6 pb-3">
              <h3 className="text-xl font-bold text-foreground mb-1">Mensal</h3>
              <p className="text-sm text-muted-foreground">Flexibilidade total</p>

              <div className="mt-3">
                <span className="text-4xl font-bold text-foreground">R$ 99</span>
                <span className="text-xl font-bold text-foreground">,90</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
            </CardHeader>

            <CardContent className="px-6 py-0">
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 p-6 pt-4">
              <Button size="default" className="w-full h-11 text-base" variant="outline" asChild>
                <Link to="/registro?plano=mensal">
                  <ArrowRight className="mr-2 w-4 h-4" />
                  Comece Grátis
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                <span className="text-primary font-medium">7 dias grátis</span> para testar
              </p>
            </CardFooter>
          </Card>

          {/* Plano Anual */}
          <Card className="relative overflow-hidden border-2 border-primary shadow-xl">
            <div className="absolute top-0 right-0">
              <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-0.5 rounded-bl-lg flex items-center gap-1">
                <Star className="w-3 h-3" />
                Melhor Valor
              </div>
            </div>

            <CardHeader className="text-center pt-6 pb-3">
              <h3 className="text-xl font-bold text-foreground mb-1">Anual</h3>
              <p className="text-sm text-muted-foreground">Economia de 17%</p>

              <div className="mt-3">
                <span className="text-4xl font-bold text-foreground">R$ 899</span>
                <span className="text-xl font-bold text-foreground">,00</span>
                <span className="text-muted-foreground text-sm">/ano</span>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                  Equivale a R$ 74,92/mês
                </p>
              </div>
            </CardHeader>

            <CardContent className="px-6 py-0">
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 p-6 pt-4">
              <Button size="default" className="w-full h-11 text-base shadow-lg" asChild>
                <Link to="/registro?plano=anual">
                  <ArrowRight className="mr-2 w-4 h-4" />
                  Comece Grátis
                </Link>
              </Button>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary font-medium">7 dias grátis</span> para testar
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sem compromisso. Cancele quando quiser.
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
