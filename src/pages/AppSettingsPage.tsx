import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Smartphone, 
  CheckCircle, 
  Info,
  Wifi,
  WifiOff,
  HardDrive,
  Trash2,
  RefreshCw,
  Store
} from 'lucide-react';
import { toast } from 'sonner';
import {
  isPWAInstallable,
  isAppInstalled,
  getPlatformName,
  getInstallBenefits,
  detectPlatform,
  detectBrowser
} from '@/lib/pwaUtils';
import { StoresBadges } from '@/components/common/StoresBadges';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AppSettingsPage() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheSize, setCacheSize] = useState<string>('Calcul...');
  const [swStatus, setSwStatus] = useState<'active' | 'installing' | 'waiting' | 'none'>('none');

  useEffect(() => {
    // Vérifier si l'app est installée
    setIsInstalled(isAppInstalled());
    setCanInstall(isPWAInstallable());

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
      toast.success('Application installée avec succès !');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Écouter les changements de connexion
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors ligne activé');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier le statut du service worker
    checkServiceWorkerStatus();

    // Estimer la taille du cache
    estimateCacheSize();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    };
  }, []);

  const checkServiceWorkerStatus = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        if (registration.active) {
          setSwStatus('active');
        } else if (registration.installing) {
          setSwStatus('installing');
        } else if (registration.waiting) {
          setSwStatus('waiting');
        }
      }
    }
  };

  const estimateCacheSize = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2);
        setCacheSize(`${usedMB} MB / ${quotaMB} MB`);
      } catch (error) {
        setCacheSize('Non disponible');
      }
    } else {
      setCacheSize('Non supporté');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.error('Installation non disponible', {
        description: 'Utilisez le menu de votre navigateur pour installer l\'application'
      });
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        toast.success('Installation en cours...', {
          description: 'L\'application sera bientôt disponible'
        });
      } else {
        toast.info('Installation annulée');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error);
      toast.error('Erreur lors de l\'installation');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        toast.success('Cache vidé avec succès');
        estimateCacheSize();
        
        // Recharger la page
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('Erreur lors du vidage du cache:', error);
        toast.error('Erreur lors du vidage du cache');
      }
    }
  };

  const handleUpdateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          toast.success('Service Worker mis à jour');
          checkServiceWorkerStatus();
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        toast.error('Erreur lors de la mise à jour');
      }
    }
  };

  const platform = detectPlatform();
  const browser = detectBrowser();
  const platformName = getPlatformName();
  const benefits = getInstallBenefits();

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Paramètres de l'Application</h1>
        <p className="text-muted-foreground">
          Gérez l'installation et les fonctionnalités hors ligne
        </p>
      </div>

      {/* Installation PWA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Installation de l'Application
              </CardTitle>
              <CardDescription>
                Installez Campus en Ligne sur votre appareil
              </CardDescription>
            </div>
            {isInstalled && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Installée
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statut */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm mb-1">
                {isInstalled 
                  ? 'Application installée' 
                  : canInstall 
                    ? 'Installation disponible' 
                    : 'Installation non disponible'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isInstalled 
                  ? 'L\'application est installée sur votre appareil et accessible depuis l\'écran d\'accueil'
                  : canInstall 
                    ? 'Vous pouvez installer l\'application pour un accès rapide et des fonctionnalités hors ligne'
                    : `Installation non supportée sur ${platformName} (${browser})`}
              </p>
            </div>
          </div>

          {/* Informations système */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Plateforme</p>
              <p className="font-medium text-sm">{platformName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Navigateur</p>
              <p className="font-medium text-sm capitalize">{browser}</p>
            </div>
          </div>

          {/* Avantages */}
          {!isInstalled && (
            <div className="space-y-2">
              <p className="font-medium text-sm">Avantages de l'installation :</p>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bouton d'installation */}
          {!isInstalled && canInstall && (
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full gap-2"
              size="lg"
            >
              <Download className="h-4 w-4" />
              {isInstalling ? 'Installation en cours...' : 'Installer l\'application'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Statut de connexion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            État de la Connexion
          </CardTitle>
          <CardDescription>
            Statut de votre connexion Internet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="font-medium text-sm">En ligne</p>
                    <p className="text-xs text-muted-foreground">
                      Toutes les fonctionnalités sont disponibles
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-medium text-sm">Hors ligne</p>
                    <p className="text-xs text-muted-foreground">
                      Mode hors ligne activé, données en cache disponibles
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestion du cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Stockage et Cache
          </CardTitle>
          <CardDescription>
            Gérez les données en cache de l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Taille du cache */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-sm mb-1">Espace utilisé</p>
              <p className="text-xs text-muted-foreground">
                Données en cache pour le mode hors ligne
              </p>
            </div>
            <Badge variant="secondary">{cacheSize}</Badge>
          </div>

          {/* Service Worker */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-sm mb-1">Service Worker</p>
              <p className="text-xs text-muted-foreground">
                Gère le mode hors ligne et les mises à jour
              </p>
            </div>
            <Badge 
              variant={swStatus === 'active' ? 'default' : 'secondary'}
            >
              {swStatus === 'active' ? 'Actif' : 
               swStatus === 'installing' ? 'Installation' :
               swStatus === 'waiting' ? 'En attente' : 'Inactif'}
            </Badge>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleUpdateServiceWorker}
              variant="outline"
              className="flex-1 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Mettre à jour
            </Button>
            <Button
              onClick={handleClearCache}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Vider le cache
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Vider le cache supprimera toutes les données hors ligne et rechargera l'application
          </p>
        </CardContent>
      </Card>

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            À propos du Mode Hors Ligne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Mode hors ligne :</strong> L'application utilise un Service Worker pour mettre en cache les ressources et permettre une utilisation sans connexion Internet.
          </p>
          <p>
            <strong>Synchronisation :</strong> Lorsque vous êtes hors ligne, vos actions sont enregistrées localement et synchronisées automatiquement dès que la connexion est rétablie.
          </p>
          <p>
            <strong>Mises à jour :</strong> L'application vérifie automatiquement les mises à jour et vous notifie lorsqu'une nouvelle version est disponible.
          </p>
        </CardContent>
      </Card>

      {/* Télécharger sur les stores */}
      <StoresBadgesSection />
    </div>
  );
}

function StoresBadgesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Télécharger l'Application
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Retrouvez Campus en Ligne sur les stores officiels pour une expérience native.
        </p>
      </CardHeader>
      <CardContent>
        <StoresBadges size="lg" className="justify-start" />
      </CardContent>
    </Card>
  );
}