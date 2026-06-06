import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  isPWAInstallable,
  isAppInstalled,
  getInstallInstructions,
  getPlatformName,
  getInstallBenefits
} from '@/lib/pwaUtils';
import {
  trackInstallButtonView,
  trackInstallButtonClick,
  trackInstallCompleted,
  trackPWAInstallEvent
} from '@/lib/pwaTracking';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  source?: 'landing_page' | 'header' | 'sidebar' | 'banner' | 'settings';
}

export function InstallButton({
  variant = 'default',
  size = 'default',
  className,
  showIcon = true,
  fullWidth = false,
  children,
  source = 'landing_page'
}: InstallButtonProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est installée
    const installed = isAppInstalled();
    setIsInstalled(installed);
    setCanInstall(isPWAInstallable());

    // Tracker si déjà installé
    if (installed) {
      trackPWAInstallEvent({
        event_type: 'already_installed',
        install_source: source,
      });
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Écouter l'événement d'installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      toast.success('Application installée avec succès !', {
        description: 'Vous pouvez maintenant accéder à Campus en Ligne depuis votre écran d\'accueil'
      });
      
      // Tracker l'installation complétée
      trackInstallCompleted(source);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [source]);

  // Tracker la vue du bouton (une seule fois)
  useEffect(() => {
    if (!isInstalled && canInstall && !hasTrackedView) {
      trackInstallButtonView(source);
      setHasTrackedView(true);
    }
  }, [isInstalled, canInstall, hasTrackedView, source]);

  const handleInstall = async () => {
    // Tracker le clic
    trackInstallButtonClick(source);

    if (!deferredPrompt) {
      // Pas de prompt natif disponible, afficher les instructions manuelles
      setShowInstructions(true);
      return;
    }

    setIsInstalling(true);

    try {
      // Afficher le prompt d'installation natif
      await deferredPrompt.prompt();
      
      // Attendre le choix de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Utilisateur a accepté l\'installation');
        setIsInstalled(true);
        setCanInstall(false);
        toast.success('Installation en cours...', {
          description: 'L\'application sera bientôt disponible sur votre écran d\'accueil'
        });
        
        // Tracker l'acceptation
        trackPWAInstallEvent({
          event_type: 'install_accepted',
          install_source: source,
        });
      } else {
        console.log('Utilisateur a refusé l\'installation');
        toast.info('Installation annulée', {
          description: 'Vous pouvez installer l\'application plus tard'
        });
        
        // Tracker le refus
        trackPWAInstallEvent({
          event_type: 'install_rejected',
          install_source: source,
        });
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error);
      toast.error('Erreur lors de l\'installation', {
        description: 'Veuillez réessayer ou installer manuellement'
      });
    } finally {
      setIsInstalling(false);
    }
  };

  // Ne pas afficher le bouton si déjà installé
  if (isInstalled) {
    return null;
  }

  // Ne pas afficher si l'installation n'est pas possible
  if (!canInstall && !isPWAInstallable()) {
    return null;
  }

  const instructions = getInstallInstructions();
  const benefits = getInstallBenefits();
  const platformName = getPlatformName();

  return (
    <>
      <Button
        onClick={handleInstall}
        disabled={isInstalling}
        variant={variant}
        size={size}
        className={cn(fullWidth && 'w-full', className)}
      >
        {showIcon && <Download className="h-4 w-4 mr-2" />}
        {children || (isInstalling ? 'Installation...' : 'Installer l\'application')}
      </Button>

      {/* Modal d'instructions */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl">{instructions.icon}</div>
              <div>
                <DialogTitle className="text-xl">
                  {instructions.title}
                </DialogTitle>
                <DialogDescription>
                  Suivez ces étapes pour installer l'application
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Étapes d'installation */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Étapes d'installation</h4>
              <ol className="space-y-3">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground flex-1 pt-0.5">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Avantages */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Pourquoi installer ?</h4>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Note */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Astuce :</strong> Une fois installée, l'application fonctionnera même sans connexion Internet grâce au mode hors ligne.
              </p>
            </div>

            {/* Bouton de fermeture */}
            <Button
              onClick={() => setShowInstructions(false)}
              className="w-full"
            >
              J'ai compris
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}