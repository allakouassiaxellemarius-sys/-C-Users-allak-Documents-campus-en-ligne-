import { supabase } from '@/db/supabase';

// Types pour le tracking
export interface PWAInstallEvent {
  session_id: string;
  event_type: 'prompt_shown' | 'install_clicked' | 'install_accepted' | 'install_rejected' | 'install_completed' | 'already_installed';
  platform: string;
  browser: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  os?: string;
  screen_width?: number;
  screen_height?: number;
  install_source?: 'landing_page' | 'header' | 'sidebar' | 'banner' | 'settings';
  user_agent?: string;
  referrer?: string;
  page_url?: string;
}

export interface PWAAnalyticsEvent {
  session_id: string;
  event_name: string;
  event_category: 'page_view' | 'button_click' | 'modal_open' | 'modal_close' | 'navigation' | 'interaction';
  event_data?: Record<string, any>;
  platform: string;
  browser: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  page_url?: string;
}

export interface PWAUserJourney {
  session_id: string;
  pages_visited?: string[];
  install_button_views?: number;
  install_button_clicks?: number;
  install_completed?: boolean;
  install_completed_at?: string;
  time_to_install_seconds?: number;
  platform?: string;
  browser?: string;
  device_type?: string;
  referrer?: string;
}

// Générer ou récupérer un ID de session
export function getSessionId(): string {
  const SESSION_KEY = 'pwa_session_id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

// Détecter le type d'appareil
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Détecter le navigateur
export function getBrowserName(): string {
  const ua = navigator.userAgent;
  
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident')) return 'Internet Explorer';
  if (ua.includes('Edge')) return 'Edge Legacy';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  
  return 'Unknown';
}

// Détecter le système d'exploitation
export function getOSName(): string {
  const ua = navigator.userAgent;
  
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  
  return 'Unknown';
}

// Détecter la plateforme
export function getPlatformName(): string {
  const os = getOSName();
  const browser = getBrowserName();
  
  return `${os} - ${browser}`;
}

// Tracker un événement d'installation PWA
export async function trackPWAInstallEvent(event: Partial<PWAInstallEvent>): Promise<void> {
  try {
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();
    
    const eventData: PWAInstallEvent = {
      session_id: sessionId,
      event_type: event.event_type || 'prompt_shown',
      platform: event.platform || getPlatformName(),
      browser: event.browser || getBrowserName(),
      device_type: event.device_type || getDeviceType(),
      os: event.os || getOSName(),
      screen_width: event.screen_width || window.innerWidth,
      screen_height: event.screen_height || window.innerHeight,
      install_source: event.install_source,
      user_agent: event.user_agent || navigator.userAgent,
      referrer: event.referrer || document.referrer,
      page_url: event.page_url || window.location.href,
    };
    
    const { error } = await supabase
      .from('pwa_install_events')
      .insert({
        ...eventData,
        user_id: user?.id || null,
      });
    
    if (error) {
      console.error('Erreur lors du tracking de l\'événement d\'installation:', error);
    }
    
    // Mettre à jour le parcours utilisateur
    await updateUserJourney(sessionId, {
      platform: eventData.platform,
      browser: eventData.browser,
      device_type: eventData.device_type,
    });
  } catch (error) {
    console.error('Erreur lors du tracking PWA:', error);
  }
}

// Tracker un événement analytics général
export async function trackPWAAnalyticsEvent(event: Partial<PWAAnalyticsEvent>): Promise<void> {
  try {
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();
    
    const eventData: PWAAnalyticsEvent = {
      session_id: sessionId,
      event_name: event.event_name || 'unknown',
      event_category: event.event_category || 'interaction',
      event_data: event.event_data,
      platform: event.platform || getPlatformName(),
      browser: event.browser || getBrowserName(),
      device_type: event.device_type || getDeviceType(),
      page_url: event.page_url || window.location.href,
    };
    
    const { error } = await supabase
      .from('pwa_analytics_events')
      .insert({
        ...eventData,
        user_id: user?.id || null,
      });
    
    if (error) {
      console.error('Erreur lors du tracking de l\'événement analytics:', error);
    }
  } catch (error) {
    console.error('Erreur lors du tracking analytics:', error);
  }
}

// Mettre à jour le parcours utilisateur
export async function updateUserJourney(
  sessionId: string,
  updates: Partial<PWAUserJourney>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Vérifier si le parcours existe
    const { data: existing } = await supabase
      .from('pwa_user_journeys')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    if (existing) {
      // Mettre à jour le parcours existant
      const { error } = await supabase
        .from('pwa_user_journeys')
        .update({
          ...updates,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);
      
      if (error) {
        console.error('Erreur lors de la mise à jour du parcours:', error);
      }
    } else {
      // Créer un nouveau parcours
      const { error } = await supabase
        .from('pwa_user_journeys')
        .insert({
          session_id: sessionId,
          user_id: user?.id || null,
          ...updates,
          referrer: document.referrer,
        });
      
      if (error) {
        console.error('Erreur lors de la création du parcours:', error);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du parcours utilisateur:', error);
  }
}

// Incrémenter le compteur de vues du bouton d'installation
export async function trackInstallButtonView(source: PWAInstallEvent['install_source']): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    // Récupérer le parcours actuel
    const { data: journey } = await supabase
      .from('pwa_user_journeys')
      .select('install_button_views')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    const currentViews = journey?.install_button_views || 0;
    
    await updateUserJourney(sessionId, {
      install_button_views: currentViews + 1,
    });
    
    // Tracker l'événement
    await trackPWAInstallEvent({
      event_type: 'prompt_shown',
      install_source: source,
    });
  } catch (error) {
    console.error('Erreur lors du tracking de la vue du bouton:', error);
  }
}

// Incrémenter le compteur de clics du bouton d'installation
export async function trackInstallButtonClick(source: PWAInstallEvent['install_source']): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    // Récupérer le parcours actuel
    const { data: journey } = await supabase
      .from('pwa_user_journeys')
      .select('install_button_clicks')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    const currentClicks = journey?.install_button_clicks || 0;
    
    await updateUserJourney(sessionId, {
      install_button_clicks: currentClicks + 1,
    });
    
    // Tracker l'événement
    await trackPWAInstallEvent({
      event_type: 'install_clicked',
      install_source: source,
    });
  } catch (error) {
    console.error('Erreur lors du tracking du clic du bouton:', error);
  }
}

// Marquer l'installation comme complétée
export async function trackInstallCompleted(source: PWAInstallEvent['install_source']): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    // Récupérer le parcours actuel pour calculer le temps
    const { data: journey } = await supabase
      .from('pwa_user_journeys')
      .select('first_visit')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    const installCompletedAt = new Date();
    let timeToInstall = 0;
    
    if (journey?.first_visit) {
      const firstVisit = new Date(journey.first_visit);
      timeToInstall = Math.floor((installCompletedAt.getTime() - firstVisit.getTime()) / 1000);
    }
    
    await updateUserJourney(sessionId, {
      install_completed: true,
      install_completed_at: installCompletedAt.toISOString(),
      time_to_install_seconds: timeToInstall,
    });
    
    // Tracker l'événement
    await trackPWAInstallEvent({
      event_type: 'install_completed',
      install_source: source,
    });
    
    // Mettre à jour le résumé quotidien
    await supabase.rpc('update_pwa_analytics_summary');
  } catch (error) {
    console.error('Erreur lors du tracking de l\'installation complétée:', error);
  }
}

// Tracker une page visitée
export async function trackPageVisit(pageUrl: string): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    // Récupérer le parcours actuel
    const { data: journey } = await supabase
      .from('pwa_user_journeys')
      .select('pages_visited')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    const currentPages = journey?.pages_visited || [];
    
    // Ajouter la page si elle n'est pas déjà dans la liste
    if (!currentPages.includes(pageUrl)) {
      await updateUserJourney(sessionId, {
        pages_visited: [...currentPages, pageUrl],
      });
    }
    
    // Tracker l'événement analytics
    await trackPWAAnalyticsEvent({
      event_name: 'page_view',
      event_category: 'page_view',
      event_data: { page_url: pageUrl },
      page_url: pageUrl,
    });
  } catch (error) {
    console.error('Erreur lors du tracking de la page visitée:', error);
  }
}

// Initialiser le tracking pour une session
export function initPWATracking(): void {
  try {
    const sessionId = getSessionId();
    
    // Tracker la page actuelle
    trackPageVisit(window.location.pathname);
    
    // Écouter les changements de page (pour les SPAs)
    let lastPath = window.location.pathname;
    
    const checkPathChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        trackPageVisit(currentPath);
      }
    };
    
    // Vérifier toutes les secondes (pour les SPAs sans router events)
    setInterval(checkPathChange, 1000);
    
    // Écouter l'événement d'installation
    window.addEventListener('appinstalled', () => {
      trackInstallCompleted('banner'); // Source par défaut si non spécifié
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du tracking PWA:', error);
  }
}