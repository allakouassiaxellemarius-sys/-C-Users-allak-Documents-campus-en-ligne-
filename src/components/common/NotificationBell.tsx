import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Trash2, Info, Settings, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Notification, NotificationSettings } from '@/types/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function NotificationBell() {
  const { user, profile, updateProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    browser_notifications: true,
    in_app_notifications: true,
    email_notifications: false
  });

  useEffect(() => {
    if (!user) return;

    loadNotifications();

    if (profile?.notification_settings) {
      setSettings(profile.notification_settings);
    }

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.notifications.list(user.id);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Erreur lors du marquage comme lu');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await api.notifications.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      toast.error('Erreur lors du marquage de toutes les notifications');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.notifications.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      loadNotifications();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await updateProfile({ notification_settings: settings });
      toast.success('Paramètres mis à jour');
      setIsSettingsOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des paramètres');
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 group">
            <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-destructive rounded-full border-2 border-background animate-pulse" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <DropdownMenuLabel className="p-4 flex items-center justify-between">
            <span className="font-bold">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 hover:bg-primary/5 text-primary"
                onClick={() => {
                  handleMarkAllAsRead();
                  setIsOpen(false);
                }}
              >
                <Check className="mr-1 h-3 w-3" /> Tout marquer comme lu
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="m-0" />
          <ScrollArea className="h-80">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground opacity-50">
                <BellOff className="h-10 w-10 mb-2" />
                <p className="text-sm">Aucune notification pour le moment.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer relative ${
                      !notification.is_read ? 'bg-primary/5 border-l-2 border-primary' : ''
                    }`}
                    onClick={() => {
                      if (!notification.is_read) handleMarkAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className={`mt-1 p-1.5 rounded-full ${
                      notification.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' : 
                      notification.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500' :
                      notification.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500'
                    }`}>
                      {notification.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                       notification.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                       notification.type === 'error' ? <XCircle className="h-3.5 w-3.5" /> :
                       <Info className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className={`text-sm font-semibold leading-none ${!notification.is_read ? 'text-primary' : 'text-foreground'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                      onClick={(e) => handleDelete(notification.id, e)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem 
            className="p-2 justify-center text-xs text-muted-foreground cursor-pointer hover:bg-muted" 
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="mr-2 h-3 w-3" /> Paramètres de notification
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Paramètres de notification
            </DialogTitle>
            <DialogDescription>
              Gérez vos préférences de réception pour les notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Notifications du navigateur</Label>
                <p className="text-sm text-muted-foreground">
                  Recevez des alertes système pour les rappels de cours.
                </p>
              </div>
              <Switch 
                checked={settings.browser_notifications} 
                onCheckedChange={(checked) => setSettings({ ...settings, browser_notifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Notifications intégrées</Label>
                <p className="text-sm text-muted-foreground">
                  Affichez les notifications dans la cloche.
                </p>
              </div>
              <Switch 
                checked={settings.in_app_notifications} 
                onCheckedChange={(checked) => setSettings({ ...settings, in_app_notifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base text-muted-foreground">Notifications par email</Label>
                <p className="text-sm text-muted-foreground italic">
                  Bientôt disponible.
                </p>
              </div>
              <Switch disabled checked={false} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveSettings}>Enregistrer les modifications</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}