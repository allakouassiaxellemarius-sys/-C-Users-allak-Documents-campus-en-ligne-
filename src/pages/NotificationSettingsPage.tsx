import { NotificationPreferences } from '@/components/common/NotificationPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          Paramètres de notification
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos préférences de notification et recevez des alertes en temps réel
        </p>
      </div>

      <NotificationPreferences />

      {/* Informations supplémentaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">À propos des notifications</CardTitle>
          <CardDescription>
            Comment fonctionnent les notifications push
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <span className="font-bold text-primary">•</span>
            <p>
              Les notifications push vous permettent de recevoir des alertes en temps réel, même lorsque l'application est fermée
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-primary">•</span>
            <p>
              Vous pouvez personnaliser les types de notifications que vous souhaitez recevoir
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-primary">•</span>
            <p>
              Les notifications fonctionnent sur ordinateur et mobile avec les navigateurs modernes
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-primary">•</span>
            <p>
              Vous pouvez désactiver les notifications à tout moment depuis cette page
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}