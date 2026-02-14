import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "O que é o AgendaIGR?",
    answer: "O AgendaIGR é um sistema completo de gestão para igrejas. Ele permite organizar eventos, ministérios, tarefas e comunicação em um só lugar. Ideal para pastores, líderes e equipes de ministério que querem mais organização e eficiência."
  },
  {
    question: "Quantos usuários posso adicionar?",
    answer: "Você pode adicionar usuários ilimitados! Todos os líderes, pastores e membros da equipe podem ter acesso ao sistema. Cada usuário pode ter diferentes níveis de permissão (administrador, líder ou visualizador)."
  },
  {
    question: "Posso testar antes de pagar?",
    answer: "Sim! Oferecemos 7 dias de teste grátis, sem compromisso e sem necessidade de cartão de crédito. Durante esse período você tem acesso a todas as funcionalidades do sistema."
  },
  {
    question: "Como funciona o período de teste?",
    answer: "Basta fazer seu cadastro diretamente no sistema e você já terá acesso imediato. Durante os 7 dias de teste, você configura sua igreja, adiciona ministérios e explora todas as funcionalidades sem compromisso."
  },
  {
    question: "Qual é o suporte oferecido?",
    answer: "Oferecemos suporte humanizado via WhatsApp. Você pode tirar dúvidas, pedir ajuda na configuração e reportar qualquer problema diretamente com nossa equipe."
  },
  {
    question: "Como cancelo minha assinatura?",
    answer: "Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas de cancelamento. Basta entrar em contato pelo WhatsApp que processamos a solicitação imediatamente."
  },
  {
    question: "O sistema funciona no celular?",
    answer: "Sim! O AgendaIGR é totalmente responsivo e funciona perfeitamente em celulares, tablets e computadores. Além disso, você pode instalar como um aplicativo no seu celular e receber notificações push."
  },
  {
    question: "Meus dados estão seguros?",
    answer: "Absolutamente! Utilizamos criptografia de ponta e servidores seguros para proteger todos os seus dados. Fazemos backups automáticos diariamente para garantir a segurança das informações da sua igreja."
  }
];

const FAQSection = () => {
  return (
    <section className="py-10 md:py-16 bg-card border-t border-border/40">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Perguntas frequentes
          </h2>
          <p className="text-sm text-muted-foreground">
            Tire suas dúvidas sobre o AgendaIGR
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border rounded-lg px-4 shadow-sm"
              >
                <AccordionTrigger className="text-left text-sm text-foreground hover:no-underline py-3">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
