import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useIsMobile } from '@/hooks/use-mobile';
import { detectBrowser } from '@/utils/browserDetection';

const InstallBanner = () => {
  const { canInstall, isInstalled, isDismissed, promptInstall, dismiss, isIOSSafari } = useInstallPrompt();
  const isMobile = useIsMobile();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Only show on mobile, when not installed and not dismissed
  if (isInstalled || isDismissed || !isMobile) return null;

  const browser = detectBrowser();

  // iOS Safari: show manual instructions
  if (browser.isIOS) {
    if (!showIOSGuide) {
      const dismissedAt = localStorage.getItem('pwa-install-dismissed');
      if (dismissedAt) {
        const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return null;
      }
    }

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-card border-t border-border shadow-lg animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {!showIOSGuide ? (
              <>
                <p className="text-sm font-medium text-foreground">Instalar Agendaigr</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adicione à tela inicial para acesso rápido
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="default" onClick={() => setShowIOSGuide(true)} className="h-8 text-xs">
                    Como instalar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs">
                    Agora não
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Como instalar no iOS</p>
                <ol className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li className="flex items-center gap-1">
                    1. Toque no ícone <Share className="h-3 w-3 inline" /> <strong>Compartilhar</strong>
                  </li>
                  <li>2. Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                  <li>3. Toque em <strong>"Adicionar"</strong></li>
                </ol>
                <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs mt-2">
                  Entendi
                </Button>
              </>
            )}
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Android/Chrome: use native prompt
  if (!canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-card border-t border-border shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Instalar Agendaigr</p>
          <p className="text-xs text-muted-foreground">Acesso rápido pela tela inicial</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={promptInstall} className="h-8 text-xs">
            Instalar
          </Button>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
