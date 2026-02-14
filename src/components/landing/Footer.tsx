import { Church, Mail } from "lucide-react";
import whatsappIcon from "@/assets/whatsapp-logo.svg";
import { Link } from "react-router-dom";

const WHATSAPP_URL = "https://wa.me/5532999926735";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Church className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold text-foreground">AgendaIGR</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Sistema de gestão para igrejas. Organize eventos, ministérios e tarefas em um só lugar.
              </p>
            </div>
            
            {/* Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Links Úteis</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/login" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    Fazer Login
                  </Link>
                </li>
                <li>
                  <Link to="/registro" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    Começar Teste Grátis
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Contato</h4>
              <ul className="space-y-3">
                <li>
                  <a 
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <img src={whatsappIcon} alt="WhatsApp" className="w-6 h-6" />
                    <span className="text-sm">WhatsApp</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:contato@cmrsys.com.br"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    contato@cmrsys.com.br
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="pt-8 border-t border-border">
            <p className="text-center text-muted-foreground text-sm">
              © {currentYear} AgendaIGR. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
