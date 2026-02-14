import { useMemo, useState } from "react";
import { 
  Lock, 
  Settings, 
  ChevronRight, 
  RefreshCw, 
  Bell, 
  ChevronDown,
  Smartphone,
  Monitor,
  ExternalLink
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { detectBrowser, getBrowserDisplayName, type BrowserInfo } from "@/utils/browserDetection";

interface InstructionStep {
  icon: React.ReactNode;
  text: string;
}

interface BrowserInstructions {
  title: string;
  steps: InstructionStep[];
}

function getChromeDesktopInstructions(): BrowserInstructions {
  return {
    title: "Chrome no Desktop",
    steps: [
      { icon: <Lock className="h-4 w-4" />, text: "Clique no ícone de cadeado 🔒 na barra de endereço" },
      { icon: <Settings className="h-4 w-4" />, text: 'Clique em "Configurações do site"' },
      { icon: <Bell className="h-4 w-4" />, text: 'Encontre "Notificações" e mude de "Bloquear" para "Permitir"' },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Recarregue a página (F5 ou Ctrl+R)" },
    ],
  };
}

function getChromeMobileInstructions(): BrowserInstructions {
  return {
    title: "Chrome no Celular",
    steps: [
      { icon: <Settings className="h-4 w-4" />, text: "Toque nos três pontos (⋮) e vá em Configurações" },
      { icon: <ChevronRight className="h-4 w-4" />, text: 'Toque em "Configurações do site"' },
      { icon: <Bell className="h-4 w-4" />, text: 'Toque em "Notificações"' },
      { icon: <ChevronRight className="h-4 w-4" />, text: "Encontre este site e permita as notificações" },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Volte e recarregue a página" },
    ],
  };
}

function getFirefoxDesktopInstructions(): BrowserInstructions {
  return {
    title: "Firefox no Desktop",
    steps: [
      { icon: <Lock className="h-4 w-4" />, text: "Clique no ícone de cadeado 🔒 na barra de endereço" },
      { icon: <ChevronRight className="h-4 w-4" />, text: 'Clique em "Conexão segura"' },
      { icon: <Settings className="h-4 w-4" />, text: 'Clique em "Mais informações"' },
      { icon: <Bell className="h-4 w-4" />, text: 'Na aba "Permissões", encontre "Enviar notificações" e clique em "Permitir"' },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Recarregue a página" },
    ],
  };
}

function getFirefoxMobileInstructions(): BrowserInstructions {
  return {
    title: "Firefox no Celular",
    steps: [
      { icon: <Settings className="h-4 w-4" />, text: "Toque nos três pontos (⋮) e vá em Configurações" },
      { icon: <Bell className="h-4 w-4" />, text: 'Procure por "Notificações" ou "Permissões do site"' },
      { icon: <ChevronRight className="h-4 w-4" />, text: "Encontre este site e permita as notificações" },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Volte e recarregue a página" },
    ],
  };
}

function getSafariIOSInstructions(): BrowserInstructions {
  return {
    title: "Safari no iPhone/iPad",
    steps: [
      { icon: <Smartphone className="h-4 w-4" />, text: "Abra o app Ajustes do dispositivo" },
      { icon: <Bell className="h-4 w-4" />, text: 'Vá para "Notificações"' },
      { icon: <ChevronRight className="h-4 w-4" />, text: 'Procure por "Agenda IGR" na lista de apps' },
      { icon: <Bell className="h-4 w-4" />, text: 'Ative "Permitir Notificações"' },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Volte ao app e recarregue" },
    ],
  };
}

function getSafariMacOSInstructions(): BrowserInstructions {
  return {
    title: "Safari no Mac",
    steps: [
      { icon: <Lock className="h-4 w-4" />, text: "Clique no ícone de cadeado 🔒 na barra de endereço" },
      { icon: <Settings className="h-4 w-4" />, text: 'Ou vá em Safari → Preferências → Sites → Notificações' },
      { icon: <Bell className="h-4 w-4" />, text: "Encontre este site e mude para \"Permitir\"" },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Recarregue a página" },
    ],
  };
}

function getEdgeDesktopInstructions(): BrowserInstructions {
  return {
    title: "Edge no Desktop",
    steps: [
      { icon: <Lock className="h-4 w-4" />, text: "Clique no ícone de cadeado 🔒 na barra de endereço" },
      { icon: <Settings className="h-4 w-4" />, text: 'Clique em "Permissões para este site"' },
      { icon: <Bell className="h-4 w-4" />, text: 'Encontre "Notificações" e mude para "Permitir"' },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Recarregue a página" },
    ],
  };
}

function getEdgeMobileInstructions(): BrowserInstructions {
  return {
    title: "Edge no Celular",
    steps: [
      { icon: <Settings className="h-4 w-4" />, text: "Toque nos três pontos (…) e vá em Configurações" },
      { icon: <ChevronRight className="h-4 w-4" />, text: 'Toque em "Permissões do site"' },
      { icon: <Bell className="h-4 w-4" />, text: 'Toque em "Notificações"' },
      { icon: <ChevronRight className="h-4 w-4" />, text: "Encontre este site e permita" },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Volte e recarregue a página" },
    ],
  };
}

function getGenericInstructions(): BrowserInstructions {
  return {
    title: "Navegador",
    steps: [
      { icon: <Lock className="h-4 w-4" />, text: "Procure o ícone de cadeado 🔒 ou configurações na barra de endereço" },
      { icon: <Settings className="h-4 w-4" />, text: 'Acesse as configurações ou permissões do site' },
      { icon: <Bell className="h-4 w-4" />, text: 'Encontre a opção de "Notificações" e mude para "Permitir"' },
      { icon: <RefreshCw className="h-4 w-4" />, text: "Recarregue a página" },
    ],
  };
}

function getInstructionsForBrowser(browser: BrowserInfo): BrowserInstructions {
  switch (browser.name) {
    case 'chrome':
      return browser.isMobile ? getChromeMobileInstructions() : getChromeDesktopInstructions();
    case 'firefox':
      return browser.isMobile ? getFirefoxMobileInstructions() : getFirefoxDesktopInstructions();
    case 'safari':
      return browser.isIOS ? getSafariIOSInstructions() : getSafariMacOSInstructions();
    case 'edge':
      return browser.isMobile ? getEdgeMobileInstructions() : getEdgeDesktopInstructions();
    default:
      return getGenericInstructions();
  }
}

export function PushNotificationInstructions() {
  const [isOpen, setIsOpen] = useState(false);
  
  const browser = useMemo(() => detectBrowser(), []);
  const browserName = useMemo(() => getBrowserDisplayName(browser), [browser]);
  const instructions = useMemo(() => getInstructionsForBrowser(browser), [browser]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between text-sm text-muted-foreground hover:text-foreground p-2 h-auto"
        >
          <span className="flex items-center gap-2">
            {browser.isMobile ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            Como desbloquear no {browserName}?
          </span>
          <ChevronDown 
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {instructions.title}
          </h4>
          
          <ol className="space-y-3">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="flex items-center gap-2 pt-0.5">
                  <span className="text-muted-foreground">{step.icon}</span>
                  <span>{step.text}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="pt-2 border-t flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReload}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar página
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="flex-1 text-muted-foreground"
            >
              <a 
                href="https://support.google.com/chrome/answer/3220216" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ajuda do navegador
              </a>
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
