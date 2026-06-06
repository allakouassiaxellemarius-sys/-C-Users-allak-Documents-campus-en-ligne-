import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  BellOff,
  BookOpen,
  FileText,
  Megaphone,
  Clock,
  Users,
  GraduationCap,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isUserSubscribed,
  sendTestNotification,
  getNotificationPreferences,
  updateNotificationPreference
} from '@/lib/pushNotifications';

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const categories: NotificationCategory[] = [
  {
    id: 'courses',
    label: 'Cours',
    description: 'Notifications sur vos cours et emploi du temps',
    icon: <BookOpen className="h-4 w-4" />
  },
  {
    id: 'assignments',
    label: 'Devoirs',
    description: 'Alertes pour les nouveaux devoirs et échéances',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: 'announcements',
    label: 'Annonces',
    description: 'Annonces importantes de l\'administration',
    icon: <Megaphone className="h-4 w-4" />
  },
  {
    id: 'reminders',
    label: 'Rappels',
    description: 'Rappels de cours et événements',
    icon: <Clock className="h-4 w-4" />
  },
  {
    id: 'groups',
    label: 'Groupes',
    description: 'Messages et activités dans vos groupes d\'étude',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'grades',
    label: 'Notes',
    description: 'Notifications de nouvelles notes',
    icon: <GraduationCap className="h-4 w-4" />
  },
  {
    id: 'system',
    label: 'Système',
    description: 'Mises à jour et informations système',
    icon: <Settings className="h-4 w-4" />
  }
];

export function NotificationPreferences() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    setIsLoading(true);
    try {
      const supported = isPushNotificationSupported();
      setIsSupported(supported);

      if (supported) {
        const perm = getNotificationPermission();
        setPermission(perm);

        const subscribed = await isUserSubscribed();
        setIsSubscribed(subscribed);

        const prefs = await getNotificationPreferences();
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const subscription = await subscribeToPushNotifications();
      
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
        toast.success('Notifications activées', {
          description: 'Vous recevrez maintenant des notifications push'
        });
      } else {
        toast.error('Impossible d\'activer les notifications', {
          description: 'Vérifiez les permissions de votre navigateur'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation:', error);
      toast.error('Erreur lors de l\'activation des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      
      if (success) {
        setIsSubscribed(false);
        toast.success('Notifications désactivées', {
          description: 'Vous ne recevrez plus de notifications push'
        });
      } else {
        toast.error('Impossible de désactiver les notifications');
      }
    } catch (error) {
      console.error('Erreur lors de la désactivation:', error);
      toast.error('Erreur lors de la désactivation des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCategory = async (categoryId: string, enabled: boolean) => {
    try {
      await updateNotificationPreference(categoryId, enabled);
      setPreferences(prev => ({ ...prev, [categoryId]: enabled }));
      
      toast.success('Préférence mise à jour', {
        description: `Notifications ${enabled ? 'activées' : 'désactivées'} pour ${categories.find(c => c.id === categoryId)?.label}`
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la préférence');
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      await sendTestNotification();
      toast.success('Notification de test envoyée', {
        description: 'Vous devriez la recevoir dans quelques secondes'
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du test:', error);
      toast.error('Erreur lors de l\'envoi de la notification de test');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications non supportées
          </CardTitle>
          <CardDescription>
            Votre navigateur ne supporte pas les notifications push
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Pour recevoir des notifications, utilisez un navigateur moderne comme Chrome, Edge, Firefox ou Safari.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statut des notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications Push
              </CardTitle>
              <CardDescription>
                Recevez des alertes en temps réel sur votre appareil
              </CardDescription>
            </div>
            <Badge variant={isSubscribed ? 'default' : 'secondary'}>
              {isSubscribed ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Activées
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Désactivées
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* État de la permission */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">État des notifications</p>
              <p className="text-xs text-muted-foreground">
                {permission === 'granted' && 'Autorisées par le navigateur'}
                {permission === 'denied' && 'Bloquées par le navigateur'}
                {permission === 'default' && 'Permission non demandée'}
              </p>
            </div>
            <Badge variant={permission === 'granted' ? 'default' : 'destructive'}>
              {permission === 'granted' ? 'Autorisé' : permission === 'denied' ? 'Bloqué' : 'En attente'}
            </Badge>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2">
            {!isSubscribed ? (
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading || permission === 'denied'}
                className="flex-1"
              >
                <Bell className="h-4 w-4 mr-2" />
                Activer les notifications
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleDisableNotifications}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Désactiver
                </Button>
                <Button
                  onClick={handleSendTest}
                  variant="secondary"
                  disabled={isSendingTest}
                >
                  {isSendingTest ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Tester
                </Button>
              </>
            )}
          </div>

          {permission === 'denied' && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                Les notifications sont bloquées. Veuillez autoriser les notifications dans les paramètres de votre navigateur.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Préférences par catégorie */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Préférences de notification</CardTitle>
            <CardDescription>
              Choisissez les types de notifications que vous souhaitez recevoir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={category.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                        {category.icon}
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={category.id} className="text-sm font-medium cursor-pointer">
                          {category.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={category.id}
                      checked={preferences[category.id] ?? true}
                      onCheckedChange={(checked) => handleToggleCategory(category.id, checked)}
                    />
                  </div>
                  {index < categories.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}