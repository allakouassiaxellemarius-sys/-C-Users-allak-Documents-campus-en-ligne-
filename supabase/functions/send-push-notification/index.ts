import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userId?: string;
  userIds?: string[];
  category?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer le payload
    const payload: NotificationPayload = await req.json();
    const { userId, userIds, category, title, body, icon, badge, image, data, actions } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Le titre et le corps sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Déterminer les utilisateurs cibles
    let targetUserIds: string[] = [];
    
    if (userId) {
      targetUserIds = [userId];
    } else if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      // Si aucun utilisateur spécifié, envoyer à tous les utilisateurs abonnés
      const { data: allUsers, error: usersError } = await supabaseClient
        .from('push_subscriptions')
        .select('user_id')
        .limit(1000);

      if (usersError) {
        throw usersError;
      }

      targetUserIds = [...new Set(allUsers?.map(u => u.user_id) || [])];
    }

    // Récupérer les abonnements des utilisateurs cibles
    let query = supabaseClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    const { data: subscriptions, error: subsError } = await query;

    if (subsError) {
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun abonnement trouvé', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer par catégorie si spécifiée
    let filteredSubscriptions = subscriptions;
    if (category) {
      const { data: preferences, error: prefsError } = await supabaseClient
        .from('notification_preferences')
        .select('user_id')
        .eq('category', category)
        .eq('enabled', true)
        .in('user_id', targetUserIds);

      if (prefsError) {
        console.error('Erreur lors de la récupération des préférences:', prefsError);
      } else {
        const enabledUserIds = new Set(preferences?.map(p => p.user_id) || []);
        filteredSubscriptions = subscriptions.filter(sub => enabledUserIds.has(sub.user_id));
      }
    }

    // Récupérer les clés VAPID depuis les secrets
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@campus-en-ligne.fr';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Les clés VAPID ne sont pas configurées');
    }

    // Préparer le payload de notification
    const notificationPayload = {
      title,
      body,
      icon: icon || '/favicon.png',
      badge: badge || '/favicon.png',
      image,
      data: {
        url: data?.url || '/dashboard',
        timestamp: new Date().toISOString(),
        ...data
      },
      actions: actions || [],
      requireInteraction: false,
      vibrate: [200, 100, 200]
    };

    // Envoyer les notifications
    const results = await Promise.allSettled(
      filteredSubscriptions.map(async (subscription) => {
        try {
          // Importer web-push dynamiquement
          const webpush = await import('https://esm.sh/web-push@3.6.6');
          
          // Configurer VAPID
          webpush.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
          );

          // Créer l'objet de souscription
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key
            }
          };

          // Envoyer la notification
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload)
          );

          return { success: true, userId: subscription.user_id };
        } catch (error) {
          console.error(`Erreur pour l'utilisateur ${subscription.user_id}:`, error);
          
          // Si l'abonnement est invalide (410 Gone), le supprimer
          if (error.statusCode === 410) {
            await supabaseClient
              .from('push_subscriptions')
              .delete()
              .eq('id', subscription.id);
          }
          
          return { success: false, userId: subscription.user_id, error: error.message };
        }
      })
    );

    // Compter les succès et échecs
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    return new Response(
      JSON.stringify({
        message: 'Notifications envoyées',
        sent: successful,
        failed,
        total: filteredSubscriptions.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});