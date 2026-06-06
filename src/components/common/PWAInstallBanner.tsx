import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X, Download, Smartphone, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isPWAInstallable,
  isAppInstalled,
  hasUserDismissedInstall,
  markInstallDismissed,
  markAppInstalled,
  getInstallInstructions,
  getPlatformName,
  getInstallBenefits,
  detectPlatform,
  detectBrowser
} from '@/lib/pwaUtils';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Ne pas afficher si déjà installé
    if (isAppInstalled()) {
      return;
    }

    // Ne pas afficher si l'utilisateur a refusé récemment
    if (hasUserDismissedInstall()) {
      return;
    }

    // Ne pas afficher si le navigateur ne supporte pas PWA
    if (!isPWAInstallable()) {
      return;
    }

    // Écouter l'événement beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Attendre 3 secondes avant d'afficher la bannière
      setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Pour iOS Safari, afficher après 5 secondes
    const platform = detectPlatform();
    const browser = detectBrowser();
    
    if (platform === 'ios' && browser === 'safari') {
      setTimeout(() => {
        setShowBanner(true);
      }, 5000);
    }

    // Écouter l'événement d'installation réussie
    const handleAppInstalled = () => {
      console.log('PWA installée avec succès');
      setShowBanner(false);
      markAppInstalled();
      toast.success('Application installée avec succès !', {
        description: 'Vous pouvez maintenant accéder à Campus en Ligne depuis votre écran d\'accueil'
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
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
        setShowBanner(false);
        markAppInstalled();
        toast.success('Installation en cours...', {
          description: 'L\'application sera bientôt disponible sur votre écran d\'accueil'
        });
      } else {
        console.log('Utilisateur a refusé l\'installation');
        markInstallDismissed();
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

  const handleDismiss = () => {
    setShowBanner(false);
    markInstallDismissed();
    toast.info('Bannière masquée', {
      description: 'Vous pourrez installer l\'application plus tard depuis les paramètres'
    });
  };

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  if (!showBanner) {
    return null;
  }

  const instructions = getInstallInstructions();
  const benefits = getInstallBenefits();
  const platformName = getPlatformName();

  return (
    <>
      {/* Bannière d'installation */}
      <Card
        className={cn(
          'fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50',
          'shadow-2xl border-2 border-primary/20 animate-in slide-in-from-bottom-5 duration-500'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icône */}
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg shrink-0">
              <Download className="h-6 w-6 text-white" />
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-sm mb-1">
                    Installer Campus en Ligne
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Accédez rapidement à vos cours depuis votre écran d'accueil
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Badges des avantages */}
              <div className="flex flex-wrap gap-1 mb-3">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Smartphone className="h-3 w-3" />
                  Hors ligne
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Rapide
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {platformName}
                </Badge>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  size="sm"
                  className="flex-1 gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isInstalling ? 'Installation...' : 'Installer'}
                </Button>
                <Button
                  onClick={handleShowInstructions}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  Guide
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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