// Gestionnaire de synchronisation pour le mode hors ligne

import { addPendingOperation, getPendingOperations, deletePendingOperation } from './offlineStorage';

export interface PendingOperation {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount?: number;
}

const MAX_RETRIES = 3;
const SYNC_TAG = 'sync-data';

// Vérifier si le navigateur supporte la synchronisation en arrière-plan
export function isSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

// Enregistrer une synchronisation en arrière-plan
export async function registerBackgroundSync(): Promise<void> {
  if (!isSyncSupported()) {
    console.warn('La synchronisation en arrière-plan n\'est pas supportée');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(SYNC_TAG);
    console.log('Synchronisation en arrière-plan enregistrée');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la synchronisation:', error);
  }
}

// Ajouter une opération à la file d'attente
export async function queueOperation(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: any
): Promise<void> {
  const operation: PendingOperation = {
    url,
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    timestamp: Date.now(),
    retryCount: 0
  };

  await addPendingOperation(operation);
  console.log('Opération ajoutée à la file d\'attente:', operation);

  // Tenter de synchroniser immédiatement si en ligne
  if (navigator.onLine) {
    await syncNow();
  } else {
    // Sinon, enregistrer pour une synchronisation en arrière-plan
    await registerBackgroundSync();
  }
}

// Synchroniser maintenant (mode manuel)
export async function syncNow(): Promise<{ success: number; failed: number }> {
  console.log('Début de la synchronisation manuelle...');
  
  const operations = await getPendingOperations();
  let successCount = 0;
  let failedCount = 0;

  if (operations.length === 0) {
    console.log('Aucune opération en attente');
    return { success: 0, failed: 0 };
  }

  console.log(`${operations.length} opération(s) en attente de synchronisation`);

  for (const op of operations) {
    try {
      // Vérifier le nombre de tentatives
      if (op.retryCount && op.retryCount >= MAX_RETRIES) {
        console.warn(`Opération ${op.id} abandonnée après ${MAX_RETRIES} tentatives`);
        await deletePendingOperation(op.id!);
        failedCount++;
        continue;
      }

      // Sanitize headers (remove non-Latin-1 characters that would break fetch)
      const safeHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(op.headers || {})) {
        safeHeaders[key] = value.replace(/[^\x00-\xFF]/g, '');
      }

      // Tenter d'exécuter l'opération
      const response = await fetch(op.url, {
        method: op.method,
        headers: safeHeaders,
        body: op.body
      });

      if (response.ok) {
        // Succès - supprimer l'opération
        await deletePendingOperation(op.id!);
        successCount++;
        console.log(`Opération ${op.id} synchronisée avec succès`);
      } else {
        // Échec - incrémenter le compteur de tentatives
        op.retryCount = (op.retryCount || 0) + 1;
        await addPendingOperation(op);
        failedCount++;
        console.error(`Échec de l'opération ${op.id}:`, response.status, response.statusText);
      }
    } catch (error) {
      // Erreur réseau - incrémenter le compteur de tentatives
      op.retryCount = (op.retryCount || 0) + 1;
      await addPendingOperation(op);
      failedCount++;
      console.error(`Erreur lors de la synchronisation de l'opération ${op.id}:`, error);
    }
  }

  console.log(`Synchronisation terminée: ${successCount} succès, ${failedCount} échecs`);
  return { success: successCount, failed: failedCount };
}

// Obtenir le nombre d'opérations en attente
export async function getPendingCount(): Promise<number> {
  const operations = await getPendingOperations();
  return operations.length;
}

// Vider la file d'attente (à utiliser avec précaution)
export async function clearQueue(): Promise<void> {
  const operations = await getPendingOperations();
  for (const op of operations) {
    await deletePendingOperation(op.id!);
  }
  console.log('File d\'attente vidée');
}

// Écouter les changements de statut en ligne/hors ligne
export function setupOnlineListener(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => {
    console.log('Connexion rétablie');
    callback(true);
    syncNow();
  };

  const handleOffline = () => {
    console.log('Connexion perdue');
    callback(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Retourner une fonction de nettoyage
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Vérifier le statut de la connexion
export function isOnline(): boolean {
  return navigator.onLine;
}

// Attendre que la connexion soit rétablie
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}