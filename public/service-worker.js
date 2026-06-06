// Service Worker pour le mode hors ligne de Campus en Ligne
const CACHE_VERSION = 'v2';
const CACHE_NAME = `campus-en-ligne-${CACHE_VERSION}`;
const API_CACHE_NAME = `campus-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Ressources à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Erreur lors de la mise en cache:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation en cours...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers d'autres domaines (sauf Supabase)
  if (url.origin !== self.location.origin && !url.origin.includes('supabase')) {
    return;
  }

  // Stratégie pour les API Supabase
  if (url.origin.includes('supabase')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
    return;
  }

  // Stratégie pour les ressources statiques (sauf HTML)
  if (isStaticAsset(url.pathname) && !url.pathname.endsWith('.html')) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    return;
  }

  // Stratégie par défaut: Network First
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

// Stratégie Cache First (pour les ressources statiques)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[Service Worker] Réponse depuis le cache:', request.url);
      return cachedResponse;
    }

    console.log('[Service Worker] Récupération depuis le réseau:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Erreur Cache First:', error);
    return caches.match(OFFLINE_URL);
  }
}

// Stratégie Network First (pour les API et contenu dynamique)
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('[Service Worker] Tentative réseau:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Réseau indisponible, utilisation du cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    // Si c'est une navigation, retourner la page offline
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }

    // Sinon, retourner une réponse d'erreur
    return new Response(
      JSON.stringify({ error: 'Hors ligne', offline: true }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      }
    );
  }
}

// Vérifier si c'est une ressource statique
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.ico'];
  const isRootHtml = pathname === '/' || pathname === '/index.html';
  return staticExtensions.some(ext => pathname.endsWith(ext)) && !isRootHtml;
}

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Événement de synchronisation:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Fonction de synchronisation des données
async function syncData() {
  try {
    console.log('[Service Worker] Synchronisation des données en cours...');
    
    // Récupérer les opérations en attente depuis IndexedDB
    const db = await openDatabase();
    const pendingOps = await getPendingOperations(db);
    
    if (pendingOps.length === 0) {
      console.log('[Service Worker] Aucune opération en attente');
      return;
    }

    console.log(`[Service Worker] ${pendingOps.length} opération(s) en attente`);
    
    // Envoyer les opérations au serveur
    for (const op of pendingOps) {
      try {
        await fetch(op.url, {
          method: op.method,
          headers: op.headers,
          body: op.body
        });
        
        // Supprimer l'opération réussie
        await deleteOperation(db, op.id);
        console.log('[Service Worker] Opération synchronisée:', op.id);
      } catch (error) {
        console.error('[Service Worker] Erreur lors de la synchronisation:', error);
      }
    }
    
    console.log('[Service Worker] Synchronisation terminée');
  } catch (error) {
    console.error('[Service Worker] Erreur lors de la synchronisation:', error);
    throw error;
  }
}

// Ouvrir la base de données IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CampusOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingOperations')) {
        db.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Récupérer les opérations en attente
function getPendingOperations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingOperations'], 'readonly');
    const store = transaction.objectStore('pendingOperations');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Supprimer une opération
function deleteOperation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(urls);
    });
  }
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notification push reçue');
  
  let notificationData = {
    title: 'Campus en Ligne',
    body: 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/dashboard' }
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('[Service Worker] Erreur lors du parsing de la notification:', error);
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/favicon.png',
    badge: notificationData.badge || '/favicon.png',
    image: notificationData.image,
    data: notificationData.data || { url: '/dashboard' },
    actions: notificationData.actions || [],
    vibrate: notificationData.vibrate || [200, 100, 200],
    requireInteraction: notificationData.requireInteraction || false,
    tag: notificationData.tag || 'campus-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Clic sur notification:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Vérifier si une fenêtre est déjà ouverte
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Gestion de la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification fermée:', event.notification.tag);
});