// Utilitaires pour le stockage hors ligne avec IndexedDB

const DB_NAME = 'CampusOfflineDB';
const DB_VERSION = 1;

// Noms des stores
export const STORES = {
  COURSES: 'courses',
  ENROLLMENTS: 'enrollments',
  REMINDERS: 'reminders',
  GROUPS: 'groups',
  NOTIFICATIONS: 'notifications',
  PENDING_OPERATIONS: 'pendingOperations',
  CACHED_DATA: 'cachedData'
};

// Ouvrir la base de données
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Erreur lors de l\'ouverture de la base de données:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Créer les object stores s'ils n'existent pas
      if (!db.objectStoreNames.contains(STORES.COURSES)) {
        const coursesStore = db.createObjectStore(STORES.COURSES, { keyPath: 'id' });
        coursesStore.createIndex('user_id', 'user_id', { unique: false });
        coursesStore.createIndex('day_of_week', 'day_of_week', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.ENROLLMENTS)) {
        const enrollmentsStore = db.createObjectStore(STORES.ENROLLMENTS, { keyPath: 'id' });
        enrollmentsStore.createIndex('student_id', 'student_id', { unique: false });
        enrollmentsStore.createIndex('course_id', 'course_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.REMINDERS)) {
        const remindersStore = db.createObjectStore(STORES.REMINDERS, { keyPath: 'id' });
        remindersStore.createIndex('user_id', 'user_id', { unique: false });
        remindersStore.createIndex('course_id', 'course_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.GROUPS)) {
        db.createObjectStore(STORES.GROUPS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notificationsStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
        notificationsStore.createIndex('user_id', 'user_id', { unique: false });
        notificationsStore.createIndex('is_read', 'is_read', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
        db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cachedStore = db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
        cachedStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      console.log('Base de données initialisée avec succès');
    };
  });
}

// Sauvegarder des données dans un store
export async function saveToStore<T>(storeName: string, data: T | T[]): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  const items = Array.isArray(data) ? data : [data];

  return new Promise((resolve, reject) => {
    items.forEach((item) => {
      store.put(item);
    });

    transaction.oncomplete = () => {
      console.log(`Données sauvegardées dans ${storeName}:`, items.length, 'élément(s)');
      resolve();
    };

    transaction.onerror = () => {
      console.error(`Erreur lors de la sauvegarde dans ${storeName}:`, transaction.error);
      reject(transaction.error);
    };
  });
}

// Récupérer toutes les données d'un store
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  const transaction = db.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      console.error(`Erreur lors de la récupération depuis ${storeName}:`, request.error);
      reject(request.error);
    };
  });
}

// Récupérer un élément par ID
export async function getFromStore<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB();
  const transaction = db.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as T);
    };

    request.onerror = () => {
      console.error(`Erreur lors de la récupération de l'élément ${id} depuis ${storeName}:`, request.error);
      reject(request.error);
    };
  });
}

// Récupérer des éléments par index
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: string | number
): Promise<T[]> {
  const db = await openDB();
  const transaction = db.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);
  const index = store.index(indexName);

  return new Promise((resolve, reject) => {
    const request = index.getAll(value);

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      console.error(`Erreur lors de la récupération par index ${indexName}:`, request.error);
      reject(request.error);
    };
  });
}

// Supprimer un élément
export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log(`Élément ${id} supprimé de ${storeName}`);
      resolve();
    };

    request.onerror = () => {
      console.error(`Erreur lors de la suppression de ${id} depuis ${storeName}:`, request.error);
      reject(request.error);
    };
  });
}

// Vider un store
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.clear();

    request.onsuccess = () => {
      console.log(`Store ${storeName} vidé`);
      resolve();
    };

    request.onerror = () => {
      console.error(`Erreur lors du vidage de ${storeName}:`, request.error);
      reject(request.error);
    };
  });
}

// Ajouter une opération en attente
export async function addPendingOperation(operation: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}): Promise<void> {
  await saveToStore(STORES.PENDING_OPERATIONS, operation);
}

// Récupérer les opérations en attente
export async function getPendingOperations(): Promise<any[]> {
  return getAllFromStore(STORES.PENDING_OPERATIONS);
}

// Supprimer une opération en attente
export async function deletePendingOperation(id: number): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([STORES.PENDING_OPERATIONS], 'readwrite');
  const store = transaction.objectStore(STORES.PENDING_OPERATIONS);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Sauvegarder des données avec timestamp
export async function cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
  const cachedItem = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl
  };
  await saveToStore(STORES.CACHED_DATA, cachedItem);
}

// Récupérer des données en cache
export async function getCachedData<T>(key: string): Promise<T | null> {
  const item = await getFromStore<{ key: string; data: T; timestamp: number; expiresAt: number }>(
    STORES.CACHED_DATA,
    key
  );

  if (!item) {
    return null;
  }

  // Vérifier si les données ont expiré
  if (Date.now() > item.expiresAt) {
    await deleteFromStore(STORES.CACHED_DATA, key);
    return null;
  }

  return item.data;
}

// Nettoyer les données expirées
export async function cleanExpiredCache(): Promise<void> {
  const allCached = await getAllFromStore<{ key: string; expiresAt: number }>(STORES.CACHED_DATA);
  const now = Date.now();

  for (const item of allCached) {
    if (now > item.expiresAt) {
      await deleteFromStore(STORES.CACHED_DATA, item.key);
    }
  }

  console.log('Cache nettoyé');
}