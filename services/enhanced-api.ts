// Enhanced API service with offline support and authentication
interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

interface AuthState {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
}

class EnhancedApiService {
  private config: ApiConfig;
  private auth: AuthState;
  private offlineQueue: any[] = [];

  constructor() {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
      timeout: 10000,
      retries: 3
    };
    
    this.auth = {
      token: localStorage.getItem('authToken'),
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      isAuthenticated: !!localStorage.getItem('authToken')
    };

    // Listen for online/offline events
    window.addEventListener('online', () => this.processOfflineQueue());
    window.addEventListener('offline', () => console.log('📱 API: Working offline'));
  }

  // Authentication methods
  async login(username: string, password: string) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (response.token) {
        this.auth.token = response.token;
        this.auth.user = response.user;
        this.auth.isAuthenticated = true;
        
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        console.log('✅ Login successful');
        return response;
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.auth.isAuthenticated) {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.warn('Logout request failed, clearing local auth anyway');
    } finally {
      this.auth.token = null;
      this.auth.user = null;
      this.auth.isAuthenticated = false;
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      console.log('👋 Logged out');
    }
  }

  // Generic HTTP request method with offline support
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.auth.token) {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout)
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Handle authentication errors
      if (response.status === 401) {
        console.warn('🔐 Authentication expired, logging out');
        await this.logout();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      
      // Check if served from cache
      if (response.headers.get('X-Served-By') === 'sw-cache') {
        console.log('💾 Data served from cache (offline mode)');
      }
      
      return data;
    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error);
      
      // Handle offline scenario for mutation requests
      if (!navigator.onLine && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
        return this.handleOfflineRequest(endpoint, options);
      }
      
      throw error;
    }
  }

  // Handle offline requests by queuing them
  private async handleOfflineRequest(endpoint: string, options: RequestInit) {
    const offlineRequest = {
      id: Date.now().toString(),
      endpoint,
      options,
      timestamp: new Date().toISOString()
    };

    this.offlineQueue.push(offlineRequest);
    localStorage.setItem('apiOfflineQueue', JSON.stringify(this.offlineQueue));

    console.log('📝 Request queued for offline processing:', endpoint);

    // Return optimistic response
    return {
      success: true,
      offline: true,
      message: 'Request will be processed when connection is restored',
      requestId: offlineRequest.id
    };
  }

  // Process offline queue when connection is restored
  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) {
      const saved = localStorage.getItem('apiOfflineQueue');
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
      }
    }

    if (this.offlineQueue.length === 0) return;

    console.log('🔄 Processing offline queue:', this.offlineQueue.length, 'requests');

    const processed = [];
    for (const request of this.offlineQueue) {
      try {
        await this.request(request.endpoint, request.options);
        processed.push(request);
        console.log('✅ Offline request processed:', request.endpoint);
      } catch (error) {
        console.error('❌ Failed to process offline request:', request.endpoint, error);
      }
    }

    // Remove processed requests
    this.offlineQueue = this.offlineQueue.filter(req => !processed.includes(req));
    localStorage.setItem('apiOfflineQueue', JSON.stringify(this.offlineQueue));

    if (processed.length > 0 && window.showToast) {
      window.showToast(`${processed.length} offline changes synchronized!`, 'success');
    }
  }

  // Products API
  async getProducts() {
    return this.request('/products');
  }

  async createProduct(productData: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  async updateProductStock(id: string, quantity: number, operation = 'set') {
    return this.request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, operation })
    });
  }

  // Clients API
  async getClients() {
    return this.request('/clients');
  }

  async createClient(clientData: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  }

  // Deliveries API (mobile optimized)
  async getDeliveries(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/deliveries?${params.toString()}`);
  }

  async createDelivery(deliveryData: any) {
    return this.request('/deliveries', {
      method: 'POST',
      body: JSON.stringify(deliveryData)
    });
  }

  async updateDeliveryStatus(id: string, status: string) {
    return this.request(`/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async addDeliveryReturns(id: string, returns: any[]) {
    return this.request(`/deliveries/${id}/returns`, {
      method: 'POST',
      body: JSON.stringify({ returns })
    });
  }

  async addDeliveryPayment(id: string, paymentData: any) {
    return this.request(`/deliveries/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // Production API
  async getProductionBatches() {
    return this.request('/production');
  }

  async createProductionBatch(batchData: any) {
    return this.request('/production', {
      method: 'POST',
      body: JSON.stringify(batchData)
    });
  }

  async updateBatchStatus(id: string, status: string) {
    return this.request(`/production/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ batch_status: status })
    });
  }

  // Materials API
  async getMaterials() {
    return this.request('/materials');
  }

  async createMaterial(materialData: any) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify(materialData)
    });
  }

  async updateMaterialStock(id: string, quantity: number, operation = 'set') {
    return this.request(`/materials/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, operation })
    });
  }

  // Purchases API
  async getPurchases() {
    return this.request('/purchases');
  }

  async createPurchase(purchaseData: any) {
    return this.request('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });
  }

  // Reports API
  async getReportsSummary(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/reports/summary?${params.toString()}`);
  }

  // Sync API for offline support
  async getSyncChanges(since: string) {
    return this.request(`/sync/changes?since_timestamp=${since}`);
  }

  async uploadOfflineChanges(changes: any[]) {
    return this.request('/sync/upload', {
      method: 'POST',
      body: JSON.stringify({ changes })
    });
  }

  // Utility methods
  isAuthenticated() {
    return this.auth.isAuthenticated;
  }

  getCurrentUser() {
    return this.auth.user;
  }

  getAuthToken() {
    return this.auth.token;
  }

  // Backward compatibility with existing localStorage API
  // These methods will gradually be replaced with the new HTTP API calls
  
  // Legacy methods that fall back to localStorage if API fails
  async getProductsLegacy() {
    try {
      return await this.getProducts();
    } catch (error) {
      console.warn('API failed, falling back to localStorage');
      return JSON.parse(localStorage.getItem('products') || '[]');
    }
  }

  async getClientsLegacy() {
    try {
      return await this.getClients();
    } catch (error) {
      console.warn('API failed, falling back to localStorage');
      return JSON.parse(localStorage.getItem('clients') || '[]');
    }
  }

  async getDeliveriesLegacy() {
    try {
      return await this.getDeliveries();
    } catch (error) {
      console.warn('API failed, falling back to localStorage');
      return JSON.parse(localStorage.getItem('deliveries') || '[]');
    }
  }

  async getProductionLegacy() {
    try {
      return await this.getProductionBatches();
    } catch (error) {
      console.warn('API failed, falling back to localStorage');
      return JSON.parse(localStorage.getItem('productionBatches') || '[]');
    }
  }

  async getMaterialsLegacy() {
    try {
      return await this.getMaterials();
    } catch (error) {
      console.warn('API failed, falling back to localStorage');
      return JSON.parse(localStorage.getItem('materials') || '[]');
    }
  }

  async getPurchasesLegacy() {
    try {
      return await this.getPurchases();
    } catch (error) {
      console.warn('API failed, falling back to localStorage');
      return JSON.parse(localStorage.getItem('purchases') || '[]');
    }
  }
}

// Create singleton instance
export const enhancedApi = new EnhancedApiService();

// Export for global access (for PWA features)
window.enhancedApi = enhancedApi;