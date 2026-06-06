// Utilitaires pour la détection de plateforme et compatibilité PWA

export type Platform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
export type Browser = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'samsung' | 'unknown';

// Détecter la plateforme
export function detectPlatform(): Platform {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  if (/win/.test(platform)) {
    return 'windows';
  }
  
  if (/mac/.test(platform)) {
    return 'macos';
  }
  
  if (/linux/.test(platform)) {
    return 'linux';
  }
  
  return 'unknown';
}

// Détecter le navigateur
export function detectBrowser(): Browser {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/edg/.test(userAgent)) {
    return 'edge';
  }
  
  if (/opr|opera/.test(userAgent)) {
    return 'opera';
  }
  
  if (/chrome/.test(userAgent) && !/edg/.test(userAgent)) {
    if (/samsungbrowser/.test(userAgent)) {
      return 'samsung';
    }
    return 'chrome';
  }
  
  if (/firefox/.test(userAgent)) {
    return 'firefox';
  }
  
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
    return 'safari';
  }
  
  return 'unknown';
}

// Vérifier si l'application est déjà installée
export function isAppInstalled(): boolean {
  // Vérifier si l'app est en mode standalone (installée)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Vérifier pour iOS
  if ((navigator as any).standalone === true) {
    return true;
  }
  
  return false;
}

// Vérifier si le navigateur supporte l'installation PWA
export function isPWAInstallable(): boolean {
  const platform = detectPlatform();
  const browser = detectBrowser();
  
  // Chrome, Edge, Opera sur Android/Windows/macOS/Linux
  if (['chrome', 'edge', 'opera', 'samsung'].includes(browser)) {
    return true;
  }
  
  // Safari sur iOS (installation manuelle)
  if (platform === 'ios' && browser === 'safari') {
    return true;
  }
  
  return false;
}

// Obtenir les instructions d'installation selon la plateforme
export function getInstallInstructions(): {
  title: string;
  steps: string[];
  icon: string;
} {
  const platform = detectPlatform();
  const browser = detectBrowser();
  
  // iOS Safari
  if (platform === 'ios' && browser === 'safari') {
    return {
      title: 'Installation sur iOS',
      steps: [
        'Appuyez sur le bouton Partager (icône carrée avec flèche vers le haut) en bas de l\'écran',
        'Faites défiler et appuyez sur "Sur l\'écran d\'accueil"',
        'Personnalisez le nom si vous le souhaitez',
        'Appuyez sur "Ajouter" en haut à droite'
      ],
      icon: '📱'
    };
  }
  
  // Android Chrome/Samsung
  if (platform === 'android' && ['chrome', 'samsung', 'edge'].includes(browser)) {
    return {
      title: 'Installation sur Android',
      steps: [
        'Appuyez sur le menu (trois points) en haut à droite',
        'Sélectionnez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil"',
        'Confirmez l\'installation',
        'L\'application apparaîtra sur votre écran d\'accueil'
      ],
      icon: '📱'
    };
  }
  
  // Desktop Chrome/Edge
  if (['windows', 'macos', 'linux'].includes(platform) && ['chrome', 'edge'].includes(browser)) {
    return {
      title: 'Installation sur ordinateur',
      steps: [
        'Cliquez sur l\'icône d\'installation dans la barre d\'adresse (à droite)',
        'Ou cliquez sur le menu (trois points) puis "Installer Campus en Ligne"',
        'Confirmez l\'installation',
        'L\'application s\'ouvrira dans sa propre fenêtre'
      ],
      icon: '💻'
    };
  }
  
  // Fallback générique
  return {
    title: 'Installation de l\'application',
    steps: [
      'Recherchez l\'option "Installer" ou "Ajouter à l\'écran d\'accueil" dans le menu de votre navigateur',
      'Suivez les instructions à l\'écran',
      'L\'application sera accessible depuis votre écran d\'accueil ou menu d\'applications'
    ],
    icon: '📲'
  };
}

// Obtenir le nom de la plateforme pour l'affichage
export function getPlatformName(): string {
  const platform = detectPlatform();
  const browser = detectBrowser();
  
  const platformNames: Record<Platform, string> = {
    ios: 'iOS',
    android: 'Android',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    unknown: 'votre appareil'
  };
  
  const browserNames: Record<Browser, string> = {
    chrome: 'Chrome',
    firefox: 'Firefox',
    safari: 'Safari',
    edge: 'Edge',
    opera: 'Opera',
    samsung: 'Samsung Internet',
    unknown: ''
  };
  
  const platformName = platformNames[platform];
  const browserName = browserNames[browser];
  
  if (browserName && browserName !== '') {
    return `${platformName} (${browserName})`;
  }
  
  return platformName;
}

// Vérifier si l'utilisateur a déjà refusé l'installation
export function hasUserDismissedInstall(): boolean {
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (!dismissed) return false;
  
  const dismissedDate = new Date(dismissed);
  const now = new Date();
  const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Réafficher après 7 jours
  return daysSinceDismissed < 7;
}

// Marquer l'installation comme refusée
export function markInstallDismissed(): void {
  localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
}

// Marquer l'application comme installée
export function markAppInstalled(): void {
  localStorage.setItem('pwa-installed', 'true');
}

// Vérifier si l'utilisateur a déjà installé l'app
export function hasUserInstalledApp(): boolean {
  return localStorage.getItem('pwa-installed') === 'true';
}

// Obtenir les avantages de l'installation
export function getInstallBenefits(): string[] {
  return [
    'Accès rapide depuis votre écran d\'accueil',
    'Fonctionne hors ligne avec synchronisation automatique',
    'Notifications push pour ne rien manquer',
    'Expérience plein écran sans barre d\'adresse',
    'Lancement instantané comme une application native',
    'Moins de consommation de données'
  ];
}