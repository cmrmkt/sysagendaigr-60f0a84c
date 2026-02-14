import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  LayoutGrid, 
  Users, 
  Megaphone, 
  Bell, 
  Smartphone 
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agenda de Eventos",
    description: "Visualize todos os eventos da igreja em calendário mensal, semanal ou diário. Organize cultos, reuniões e atividades."
  },
  {
    icon: LayoutGrid,
    title: "Quadros Kanban",
    description: "Gerencie tarefas de cada evento com quadros visuais estilo Trello. Acompanhe o progresso de cada atividade."
  },
  {
    icon: Users,
    title: "Gestão de Ministérios",
    description: "Organize líderes e membros por ministério. Cada equipe visualiza apenas suas responsabilidades."
  },
  {
    icon: Megaphone,
    title: "Mural de Avisos",
    description: "Comunique informações importantes para toda a equipe. Avisos com cores e prioridades personalizadas."
  },
  {
    icon: Bell,
    title: "Lembretes Automáticos",
    description: "Configure lembretes para eventos e tarefas. Nunca mais esqueça uma reunião ou atividade importante."
  },
  {
    icon: Smartphone,
    title: "Notificações Push",
    description: "Receba alertas diretamente no celular. Funciona como um aplicativo, direto no navegador."
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-12 md:py-20 bg-muted/30 border-t border-border/40">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que sua igreja precisa
          </h2>
           <p className="text-lg text-muted-foreground">
            Ferramentas simples e poderosas para administração da sua igreja
           </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card"
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
