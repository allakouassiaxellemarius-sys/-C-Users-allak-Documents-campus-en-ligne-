import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { syncNow, getPendingCount, setupOnlineListener } from '@/lib/syncManager';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Mettre à jour le nombre d'opérations en attente
  const updatePendingCount = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  // Gérer la synchronisation manuelle
  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Impossible de synchroniser hors ligne');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncNow();
      setLastSyncTime(new Date());
      
      if (result.success > 0) {
        toast.success(`${result.success} opération(s) synchronisée(s)`);
      }
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} opération(s) en échec`);
      }
      
      await updatePendingCount();
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Mettre à jour le compteur au montage
    updatePendingCount();

    // Configurer l'écouteur de statut en ligne/hors ligne
    const cleanup = setupOnlineListener((online) => {
      setIsOnline(online);
      
      if (online) {
        toast.success('Connexion rétablie', {
          description: 'Synchronisation automatique en cours...'
        });
        updatePendingCount();
      } else {
        toast.warning('Vous êtes hors ligne', {
          description: 'Les modifications seront synchronisées plus tard'
        });
      }
    });

    // Mettre à jour le compteur toutes les 30 secondes
    const interval = setInterval(updatePendingCount, 30000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  // Ne rien afficher si tout est normal (en ligne et aucune opération en attente)
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        'fixed bottom-4 right-4 z-50 shadow-lg border-2 transition-all duration-300',
        isOnline ? 'border-primary/20' : 'border-destructive/50'
      )}
    >
      <div className="p-4 space-y-3">
        {/* Statut de connexion */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              isOnline ? 'bg-primary/10' : 'bg-destructive/10'
            )}
          >
            {isOnline ? (
              <Wifi className="h-5 w-5 text-primary" />
            ) : (
              <WifiOff className="h-5 w-5 text-destructive" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
              {isOnline && lastSyncTime && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isOnline
                ? lastSyncTime
                  ? `Dernière sync: ${lastSyncTime.toLocaleTimeString()}`
                  : 'Connecté au serveur'
                : 'Mode hors ligne activé'}
            </p>
          </div>
        </div>

        {/* Opérations en attente */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between gap-3 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                {pendingCount} opération{pendingCount > 1 ? 's' : ''} en attente
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {pendingCount}
            </Badge>
          </div>
        )}

        {/* Bouton de synchronisation */}
        {isOnline && pendingCount > 0 && (
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            size="sm"
            className="w-full gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </Button>
        )}

        {/* Message hors ligne */}
        {!isOnline && (
          <p className="text-xs text-muted-foreground text-center">
            Les données seront synchronisées automatiquement au retour en ligne
          </p>
        )}
      </div>
    </Card>
  );
}