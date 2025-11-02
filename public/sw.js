// Slatko Confectionery Management - Service Worker
// Provides offline functionality and caching for mobile usage

const CACHE_NAME = 'slatko-v1.0.0';
const API_CACHE_NAME = 'slatko-api-v1.0.0';

// Files to cache for offline use
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mobile-styles.css',
  // Add other static assets here
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/products',
  '/api/clients',
  '/api/materials',
  '/api/deliveries',
  '/api/production'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old cache versions
              return cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests with cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network first, then cache
      event.respondWith(handleApiRequest(request));
    } else {
      // Static assets - Cache first, then network
      event.respondWith(handleStaticRequest(request));
    }
  } else {
    // POST, PUT, DELETE requests - Network only with offline queue
    event.respondWith(handleMutationRequest(request));
  }
});

// Handle API GET requests (read operations)
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      console.log('🌐 Service Worker: API response from network', url.pathname);
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Network failed, try cache
    console.log('📱 Service Worker: Network failed, trying cache for', url.pathname);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('💾 Service Worker: Serving from cache', url.pathname);
      
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'sw-cache');
      
      return response;
    }
    
    // No cache available, return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline - No cached data available',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'sw-offline'
        }
      }
    );
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  // Cache first strategy for static assets
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('💾 Service Worker: Static asset from cache', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('🌐 Service Worker: Static asset from network', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('❌ Service Worker: Static asset request failed', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

// Handle mutation requests (POST, PUT, DELETE)
async function handleMutationRequest(request) {
  try {
    // Try network request
    const response = await fetch(request);
    
    if (response.ok) {
      console.log('🌐 Service Worker: Mutation request successful', request.url);
      
      // Clear related API cache to force refresh
      await invalidateApiCache(request.url);
      
      return response;
    }
    
    throw new Error('Network request failed');
  } catch (error) {
    console.log('📱 Service Worker: Mutation request failed, queuing for later', request.url);
    
    // Queue request for background sync
    await queueOfflineRequest(request);
    
    // Return optimistic response
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'Request queued for when connection is restored',
        timestamp: new Date().toISOString()
      }),
      {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'sw-queue'
        }
      }
    );
  }
}

// Queue offline requests for background sync
async function queueOfflineRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  };
  
  // Store in IndexedDB or use simple array for now
  const offlineQueue = await getOfflineQueue();
  offlineQueue.push(requestData);
  await setOfflineQueue(offlineQueue);
  
  console.log('📝 Service Worker: Request queued for offline sync', requestData);
}

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-requests') {
    console.log('🔄 Service Worker: Processing offline request queue');
    event.waitUntil(processOfflineQueue());
  }
});

// Process queued offline requests
async function processOfflineQueue() {
  const offlineQueue = await getOfflineQueue();
  const processedRequests = [];
  
  for (const requestData of offlineQueue) {
    try {
      const request = new Request(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      const response = await fetch(request);
      
      if (response.ok) {
        console.log('✅ Service Worker: Offline request processed successfully', requestData.url);
        processedRequests.push(requestData);
        
        // Clear related API cache
        await invalidateApiCache(requestData.url);
        
        // Notify app about successful sync
        await notifyClientsOfSync('success', requestData);
      }
    } catch (error) {
      console.log('❌ Service Worker: Offline request still failing', requestData.url, error);
      
      // Remove old requests (older than 24 hours)
      if (Date.now() - requestData.timestamp > 24 * 60 * 60 * 1000) {
        processedRequests.push(requestData);
        await notifyClientsOfSync('expired', requestData);
      }
    }
  }
  
  // Remove processed requests from queue
  const remainingQueue = offlineQueue.filter(req => 
    !processedRequests.some(processed => 
      processed.url === req.url && processed.timestamp === req.timestamp
    )
  );
  
  await setOfflineQueue(remainingQueue);
  
  console.log(`🔄 Service Worker: Processed ${processedRequests.length} requests, ${remainingQueue.length} remaining`);
}

// Invalidate API cache for related endpoints
async function invalidateApiCache(url) {
  const cache = await caches.open(API_CACHE_NAME);
  const keys = await cache.keys();
  
  for (const request of keys) {
    const requestUrl = new URL(request.url);
    const targetUrl = new URL(url);
    
    // Invalidate if it's the same endpoint or related
    if (requestUrl.pathname.startsWith(targetUrl.pathname.split('/').slice(0, 3).join('/'))) {
      await cache.delete(request);
      console.log('🗑️ Service Worker: Invalidated cache for', request.url);
    }
  }
}

// Notify app clients about sync events
async function notifyClientsOfSync(type, requestData) {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'sync-update',
      data: { type, request: requestData }
    });
  });
}

// Simple localStorage-like functions for offline queue
// In a real app, you'd use IndexedDB for better performance
async function getOfflineQueue() {
  try {
    const data = await self.clients.matchAll()
      .then(clients => {
        if (clients.length > 0) {
          return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
              resolve(event.data || []);
            };
            clients[0].postMessage({ type: 'get-offline-queue' }, [channel.port2]);
          });
        }
        return [];
      });
    
    return data;
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
}

async function setOfflineQueue(queue) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'set-offline-queue', data: queue });
    });
  } catch (error) {
    console.error('Error setting offline queue:', error);
  }
}

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'slatko-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Slatko Notification', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  // Handle notification actions
  if (event.action) {
    // Handle specific action buttons
    console.log('Action clicked:', event.action);
  } else {
    // Open the app
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          // Focus existing window
          return clients[0].focus();
        } else {
          // Open new window
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

console.log('🎉 Service Worker: Loaded and ready for Slatko Confectionery Management!');