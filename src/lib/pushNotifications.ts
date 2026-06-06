// Utilitaires pour les notifications push Web Push API

import { supabase } from '@/db/supabase';

// Clé publique VAPID (à générer avec web-push)
// Cette clé doit correspondre à la clé privée stockée dans les secrets Supabase
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LzbOWYiZrfu5RMfd50ZABkKsiZku_Fx2ZAKVRnz0VDb-nE';

// Convertir la clé VAPID en Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Vérifier si les notifications push sont supportées
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Obtenir l'état de la permission de notification
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Demander la permission de notification
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Les notifications ne sont pas supportées');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// S'abonner aux notifications push
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    // Vérifier le support
    if (!isPushNotificationSupported()) {
      console.warn('Les notifications push ne sont pas supportées');
      return null;
    }

    // Demander la permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Permission de notification refusée');
      return null;
    }

    // Attendre que le Service Worker soit prêt
    const registration = await navigator.serviceWorker.ready;

    // Vérifier s'il existe déjà un abonnement
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Créer un nouvel abonnement
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });
      console.log('Nouvel abonnement push créé');
    } else {
      console.log('Abonnement push existant trouvé');
    }

    // Sauvegarder l'abonnement dans la base de données
    await savePushSubscription(subscription);

    return subscription;
  } catch (error) {
    console.error('Erreur lors de l\'abonnement aux notifications push:', error);
    return null;
  }
}

// Se désabonner des notifications push
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await deletePushSubscription(subscription.endpoint);
      console.log('Désabonnement réussi');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erreur lors du désabonnement:', error);
    return false;
  }
}

// Sauvegarder l'abonnement dans la base de données
async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const subscriptionJson = subscription.toJSON();
    const keys = subscriptionJson.keys;

    if (!keys || !keys.p256dh || !keys.auth) {
      throw new Error('Clés de chiffrement manquantes');
    }

    // Obtenir les informations sur l'appareil
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        device_info: deviceInfo,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (error) {
      throw error;
    }

    console.log('Abonnement sauvegardé dans la base de données');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'abonnement:', error);
    throw error;
  }
}

// Supprimer l'abonnement de la base de données
async function deletePushSubscription(endpoint: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      throw error;
    }

    console.log('Abonnement supprimé de la base de données');
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'abonnement:', error);
    throw error;
  }
}

// Obtenir l'abonnement actuel
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'abonnement:', error);
    return null;
  }
}

// Vérifier si l'utilisateur est abonné
export async function isUserSubscribed(): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  return subscription !== null;
}

// Envoyer une notification de test
export async function sendTestNotification(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: user.id,
        title: 'Notification de test',
        body: 'Ceci est une notification de test de Campus en Ligne',
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: {
          url: '/dashboard',
          type: 'test'
        }
      }
    });

    if (error) {
      throw error;
    }

    console.log('Notification de test envoyée');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de test:', error);
    throw error;
  }
}

// Obtenir les préférences de notification
export async function getNotificationPreferences(): Promise<Record<string, boolean>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('category, enabled')
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    const preferences: Record<string, boolean> = {};
    data?.forEach((pref: { category: string; enabled: boolean }) => {
      preferences[pref.category] = pref.enabled;
    });

    return preferences;
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    return {};
  }
}

// Mettre à jour une préférence de notification
export async function updateNotificationPreference(
  category: string,
  enabled: boolean
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        category,
        enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,category'
      });

    if (error) {
      throw error;
    }

    console.log(`Préférence ${category} mise à jour: ${enabled}`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la préférence:', error);
    throw error;
  }
}

// Afficher une notification locale (pour test)
export function showLocalNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (!('Notification' in window)) {
    console.warn('Les notifications ne sont pas supportées');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.png',
      badge: '/favicon.png',
      ...options
    });
  }
}