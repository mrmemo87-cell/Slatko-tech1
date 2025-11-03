import { supabase, TABLES, SupabaseService } from '../config/supabase';
import type { Database } from '../config/supabase';
import type { 
  Product, 
  Client, 
  Material, 
  Delivery, 
  DeliveryItem, 
  ReturnItem, 
  Payment,
  Unit,
  MaterialUnit, 
  ProductionBatch 
} from '../types';

// Type aliases for cleaner code
type DbProduct = Database['public']['Tables']['products']['Row'];
type DbClient = Database['public']['Tables']['clients']['Row'];
type DbMaterial = Database['public']['Tables']['materials']['Row'];
type DbDelivery = Database['public']['Tables']['deliveries']['Row'];
type DbProductionBatch = Database['public']['Tables']['production_batches']['Row'];

interface AuthState {
  user: any | null;
  session: any | null;
  isAuthenticated: boolean;
}

class SupabaseApiService {
  private auth: AuthState = {
    user: null,
    session: null,
    isAuthenticated: false
  };

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    this.updateAuthState(session);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      this.updateAuthState(session);
    });
  }

  private updateAuthState(session: any) {
    this.auth.session = session;
    this.auth.user = session?.user || null;
    this.auth.isAuthenticated = !!session;
    
    if (session) {
      console.log('✅ User authenticated:', session.user.email);
    } else {
      console.log('👋 User logged out');
    }
  }

  // Authentication Methods
  async signUp(email: string, password: string, userData: any = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // User Management
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated;
  }

  getCurrentUser() {
    return this.auth.user;
  }

  getCurrentSession() {
    return this.auth.session;
  }

  // Products API
  async getProducts(): Promise<Product[]> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformProducts(data);
    });
  }

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.PRODUCTS)
        .insert([{
          name: productData.name,
          unit: productData.unit,
          stock: productData.stock || 0,
          price: productData.price,
          cost: productData.cost || 0,
          category: productData.category,
          description: productData.description,
          shelf_life_days: 7
        }])
        .select()
        .single();
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformProduct(data);
    });
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.PRODUCTS)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformProduct(data);
    });
  }

  async updateProductStock(id: string, quantity: number, operation: 'set' | 'add' | 'subtract' = 'set'): Promise<Product> {
    return SupabaseService.withErrorHandling(async () => {
      if (operation === 'set') {
        return this.updateProduct(id, { stock: quantity });
      }
      
      // For add/subtract, we need to get current stock first
      const { data: currentProduct } = await supabase
        .from(TABLES.PRODUCTS)
        .select('stock')
        .eq('id', id)
        .single();
      
      if (!currentProduct) throw new Error('Product not found');
      
      const newStock = operation === 'add' 
        ? currentProduct.stock + quantity 
        : Math.max(0, currentProduct.stock - quantity);
      
      return this.updateProduct(id, { stock: newStock });
    });
  }

  async deleteProduct(id: string): Promise<void> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.PRODUCTS)
        .delete()
        .eq('id', id);
      
      await SupabaseService.handleResponse(response);
    });
  }

  // Clients API
  async getClients(): Promise<Client[]> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.CLIENTS)
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformClients(data);
    });
  }

  async createClient(clientData: Omit<Client, 'id'>): Promise<Client> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.CLIENTS)
        .insert([{
          name: clientData.name,
          business_name: clientData.businessName,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          credit_limit: clientData.creditLimit || 0,
          payment_term_days: clientData.paymentTermDays || 30,
          current_balance: clientData.currentBalance || 0,
          risk_level: clientData.riskLevel || 'LOW',
          total_order_value: clientData.totalOrderValue || 0,
          reliability_score: clientData.reliabilityScore || 100
        }])
        .select()
        .single();
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformClient(data);
    });
  }

  async updateClient(id: string, clientData: Partial<Omit<Client, 'id'>>): Promise<Client> {
    return SupabaseService.withErrorHandling(async () => {
      const updateData: any = {};
      
      if (clientData.name !== undefined) updateData.name = clientData.name;
      if (clientData.businessName !== undefined) updateData.business_name = clientData.businessName;
      if (clientData.email !== undefined) updateData.email = clientData.email;
      if (clientData.phone !== undefined) updateData.phone = clientData.phone;
      if (clientData.address !== undefined) updateData.address = clientData.address;
      if (clientData.creditLimit !== undefined) updateData.credit_limit = clientData.creditLimit;
      if (clientData.paymentTermDays !== undefined) updateData.payment_term_days = clientData.paymentTermDays;
      if (clientData.currentBalance !== undefined) updateData.current_balance = clientData.currentBalance;
      if (clientData.riskLevel !== undefined) updateData.risk_level = clientData.riskLevel;
      if (clientData.totalOrderValue !== undefined) updateData.total_order_value = clientData.totalOrderValue;
      if (clientData.reliabilityScore !== undefined) updateData.reliability_score = clientData.reliabilityScore;
      
      updateData.updated_at = new Date().toISOString();

      const response = await supabase
        .from(TABLES.CLIENTS)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformClient(data);
    });
  }

  async deleteClient(id: string): Promise<void> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.CLIENTS)
        .update({ is_active: false })
        .eq('id', id);
      
      await SupabaseService.handleResponse(response);
    });
  }

  // Materials API
  async getMaterials(): Promise<Material[]> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.MATERIALS)
        .select('*')
        .order('name');
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformMaterials(data);
    });
  }

  async createMaterial(materialData: Omit<Material, 'id'>): Promise<Material> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.MATERIALS)
        .insert([{
          name: materialData.name,
          unit: materialData.unit,
          stock: materialData.stock || 0,
          cost_per_unit: materialData.costPerUnit || 0,
          supplier: materialData.supplier,
          expiration_date: materialData.expirationDate,
          min_stock_level: materialData.minStockLevel || 0
        }])
        .select()
        .single();
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformMaterial(data);
    });
  }

  async updateMaterial(id: string, materialData: Partial<Omit<Material, 'id'>>): Promise<Material> {
    return SupabaseService.withErrorHandling(async () => {
      const updateData: any = {};
      
      if (materialData.name !== undefined) updateData.name = materialData.name;
      if (materialData.unit !== undefined) updateData.unit = materialData.unit;
      if (materialData.stock !== undefined) updateData.stock = materialData.stock;
      if (materialData.costPerUnit !== undefined) updateData.cost_per_unit = materialData.costPerUnit;
      if (materialData.supplier !== undefined) updateData.supplier = materialData.supplier;
      if (materialData.expirationDate !== undefined) updateData.expiration_date = materialData.expirationDate;
      if (materialData.minStockLevel !== undefined) updateData.min_stock_level = materialData.minStockLevel;
      
      updateData.updated_at = new Date().toISOString();

      const response = await supabase
        .from(TABLES.MATERIALS)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformMaterial(data);
    });
  }

  async deleteMaterial(id: string): Promise<void> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.MATERIALS)
        .delete()
        .eq('id', id);
      
      await SupabaseService.handleResponse(response);
    });
  }

  // Deliveries API (Mobile Optimized)
  async getDeliveries(limit: number = 100): Promise<Delivery[]> {
    return SupabaseService.withErrorHandling(async () => {
      // Get deliveries with items, returns, and payments in separate queries for better performance
      const deliveriesResponse = await supabase
        .from(TABLES.DELIVERIES)
        .select(`
          *,
          clients:client_id (name, business_name)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      
      const deliveries = await SupabaseService.handleResponse(deliveriesResponse);
      
      // Get all delivery items for these deliveries
      const deliveryIds = deliveries.map(d => d.id);
      const [itemsResponse, returnsResponse, paymentsResponse] = await Promise.all([
        supabase
          .from(TABLES.DELIVERY_ITEMS)
          .select(`
            *,
            products:product_id (name, unit)
          `)
          .in('delivery_id', deliveryIds),
        
        supabase
          .from(TABLES.RETURN_ITEMS)
          .select(`
            *,
            products:product_id (name)
          `)
          .in('delivery_id', deliveryIds),
        
        supabase
          .from(TABLES.PAYMENTS)
          .select('*')
          .in('delivery_id', deliveryIds)
      ]);

      const items = itemsResponse.data || [];
      const returns = returnsResponse.data || [];
      const payments = paymentsResponse.data || [];

      // Group items by delivery
      const itemsByDelivery = items.reduce((acc, item) => {
        if (!acc[item.delivery_id]) acc[item.delivery_id] = [];
        acc[item.delivery_id].push(item);
        return acc;
      }, {} as any);

      const returnsByDelivery = returns.reduce((acc, ret) => {
        if (!acc[ret.delivery_id]) acc[ret.delivery_id] = [];
        acc[ret.delivery_id].push(ret);
        return acc;
      }, {} as any);

      const paymentsByDelivery = payments.reduce((acc, payment) => {
        if (!acc[payment.delivery_id]) acc[payment.delivery_id] = [];
        acc[payment.delivery_id].push(payment);
        return acc;
      }, {} as any);

      // Transform to frontend format
      return deliveries.map(delivery => ({
        id: delivery.id,
        invoiceNumber: delivery.invoice_number,
        clientId: delivery.client_id,
        date: delivery.date,
        status: delivery.status,
        notes: delivery.notes || undefined,
        items: (itemsByDelivery[delivery.id] || []).map((item: any) => ({
          productId: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        returnedItems: (returnsByDelivery[delivery.id] || []).map((ret: any) => ({
          productId: ret.product_id,
          quantity: ret.quantity,
          reason: ret.reason
        })),
        payments: (paymentsByDelivery[delivery.id] || []).map((payment: any) => ({
          amount: payment.amount,
          method: payment.method,
          date: payment.date,
          reference: payment.reference
        }))
      }));
    });
  }

  async createDelivery(deliveryData: {
    clientId: string;
    date: string;
    items: DeliveryItem[];
    notes?: string;
  }): Promise<Delivery> {
    return SupabaseService.withErrorHandling(async () => {
      // Generate invoice number
      const { count } = await supabase
        .from(TABLES.DELIVERIES)
        .select('*', { count: 'exact', head: true });
      
      const invoiceNumber = `INV${String((count || 0) + 1).padStart(6, '0')}`;

      // Create delivery in transaction
      const { data: delivery, error: deliveryError } = await supabase
        .from(TABLES.DELIVERIES)
        .insert([{
          invoice_number: invoiceNumber,
          client_id: deliveryData.clientId,
          date: deliveryData.date,
          notes: deliveryData.notes,
          status: 'Pending'
        }])
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Create delivery items
      const deliveryItems = deliveryData.items.map(item => ({
        delivery_id: delivery.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from(TABLES.DELIVERY_ITEMS)
        .insert(deliveryItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of deliveryData.items) {
        await this.updateProductStock(item.productId, item.quantity, 'subtract');
      }

      // Update client's lastOrderDate and order statistics
      const { error: clientUpdateError } = await supabase
        .from(TABLES.CLIENTS)
        .update({
          last_order_date: deliveryData.date,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryData.clientId);

      if (clientUpdateError) {
        console.error('Error updating client lastOrderDate:', clientUpdateError);
        // Don't throw error as delivery was successful, just log the warning
      }

      // Return full delivery object
      const deliveries = await this.getDeliveries(1);
      return deliveries.find(d => d.id === delivery.id)!;
    });
  }

  async updateDeliveryStatus(id: string, status: 'Pending' | 'Settled' | 'Paid'): Promise<void> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.DELIVERIES)
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      await SupabaseService.handleResponse(response);
    });
  }

  async addDeliveryPayment(deliveryId: string, payment: {
    amount: number;
    method: string;
    date: string;
    reference?: string;
  }): Promise<void> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.PAYMENTS)
        .insert([{
          delivery_id: deliveryId,
          amount: payment.amount,
          method: payment.method,
          date: payment.date,
          reference: payment.reference
        }]);
      
      await SupabaseService.handleResponse(response);
    });
  }

  // Production API
  async getProductionBatches(): Promise<ProductionBatch[]> {
    return SupabaseService.withErrorHandling(async () => {
      const response = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .select(`
          *,
          products:product_id (name, unit)
        `)
        .order('start_date', { ascending: false });
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformProductionBatches(data);
    });
  }

  async createProductionBatch(batchData: {
    productId: string;
    quantity: number;
    startDate: string;
    notes?: string;
  }): Promise<ProductionBatch> {
    return SupabaseService.withErrorHandling(async () => {
      // Generate batch number
      const { count } = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .select('*', { count: 'exact', head: true });
      
      const batchNumber = `B${String((count || 0) + 1).padStart(6, '0')}`;

      const response = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .insert([{
          batch_number: batchNumber,
          product_id: batchData.productId,
          quantity: batchData.quantity,
          start_date: batchData.startDate,
          batch_status: 'PLANNED',
          labor_hours: 0,
          overhead_cost: 0,
          total_cost: 0,
          cost_per_unit: 0,
          notes: batchData.notes
        }])
        .select()
        .single();
      
      const data = await SupabaseService.handleResponse(response);
      return this.transformProductionBatch(data);
    });
  }

  async updateBatchStatus(id: string, status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'QUALITY_HOLD' | 'REJECTED'): Promise<void> {
    return SupabaseService.withErrorHandling(async () => {
      const batch = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .select('product_id, quantity')
        .eq('id', id)
        .single();

      const response = await supabase
        .from(TABLES.PRODUCTION_BATCHES)
        .update({ 
          batch_status: status,
          end_date: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      await SupabaseService.handleResponse(response);

      // If completed, update product stock
      if (status === 'COMPLETED' && batch.data) {
        await this.updateProductStock(batch.data.product_id, batch.data.quantity, 'add');
      }
    });
  }

  // Data transformation helpers
  private transformProducts(dbProducts: DbProduct[]): Product[] {
    return dbProducts.map(this.transformProduct);
  }

  private transformProduct(dbProduct: DbProduct): Product {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      unit: dbProduct.unit as Unit,
      defaultPrice: dbProduct.price || 0,
      stock: dbProduct.stock,
      price: dbProduct.price,
      cost: dbProduct.cost,
      category: dbProduct.category || undefined,
      description: dbProduct.description || undefined
    };
  }

  private transformClients(dbClients: DbClient[]): Client[] {
    return dbClients.map(this.transformClient);
  }

  private transformClient(dbClient: DbClient): Client {
    return {
      id: dbClient.id,
      name: dbClient.name,
      businessName: dbClient.business_name || undefined,
      email: dbClient.email || undefined,
      phone: dbClient.phone || undefined,
      address: dbClient.address || undefined,
      customPrices: [], // This would need separate table
      creditLimit: dbClient.credit_limit,
      paymentTermDays: dbClient.payment_term_days,
      currentBalance: dbClient.current_balance,
      isActive: dbClient.is_active,
      riskLevel: dbClient.risk_level,
      lastOrderDate: dbClient.last_order_date || undefined,
      totalOrderValue: dbClient.total_order_value,
      reliabilityScore: dbClient.reliability_score
    };
  }

  private transformMaterials(dbMaterials: DbMaterial[]): Material[] {
    return dbMaterials.map(this.transformMaterial);
  }

  private transformMaterial(dbMaterial: DbMaterial): Material {
    return {
      id: dbMaterial.id,
      name: dbMaterial.name,
      unit: dbMaterial.unit as MaterialUnit,
      stock: dbMaterial.stock,
      lowStockThreshold: dbMaterial.min_stock_level || 0,
      costPerUnit: dbMaterial.cost_per_unit,
      supplier: dbMaterial.supplier || undefined,
      expirationDate: dbMaterial.expiration_date || undefined,
      minStockLevel: dbMaterial.min_stock_level
    };
  }

  private transformProductionBatches(dbBatches: any[]): ProductionBatch[] {
    return dbBatches.map(this.transformProductionBatch);
  }

  private transformProductionBatch(dbBatch: any): ProductionBatch {
    return {
      id: dbBatch.id,
      batchNumber: dbBatch.batch_number,
      date: dbBatch.start_date,
      productId: dbBatch.product_id,
      quantity: dbBatch.quantity,
      notes: dbBatch.notes || undefined,
      batchStatus: dbBatch.batch_status,
      laborHours: dbBatch.labor_hours,
      overheadCost: dbBatch.overhead_cost,
      totalCost: dbBatch.total_cost,
      costPerUnit: dbBatch.cost_per_unit,
      qualityScore: dbBatch.quality_score || undefined,
      materialCosts: [] // This would need separate query
    };
  }

  // Real-time subscriptions for mobile sync
  subscribeToProducts(callback: (products: Product[]) => void) {
    return supabase
      .channel('products_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: TABLES.PRODUCTS },
        () => {
          this.getProducts().then(callback).catch(console.error);
        }
      )
      .subscribe();
  }

  subscribeToDeliveries(callback: (deliveries: Delivery[]) => void) {
    return supabase
      .channel('deliveries_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: TABLES.DELIVERIES },
        () => {
          this.getDeliveries().then(callback).catch(console.error);
        }
      )
      .subscribe();
  }

  // Purchases Methods
  async getPurchases(): Promise<any[]> {
    // For now, return empty array since purchases table doesn't exist in schema
    // This would need to be implemented when purchases are added to database
    return [];
  }

  async addPurchase(purchase: any): Promise<any> {
    // Placeholder - would need purchases table in schema
    console.warn('Purchases not implemented in Supabase schema yet');
    return purchase;
  }

  async deletePurchase(id: string): Promise<void> {
    // Placeholder - would need purchases table in schema
    console.warn('Purchases not implemented in Supabase schema yet');
  }

  async deleteProductionBatch(id: string): Promise<void> {
    const { error } = await supabase
      .from('production_batches')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete production batch: ${error.message}`);
    }
  }

  async deleteDelivery(id: string): Promise<void> {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete delivery: ${error.message}`);
    }
  }
}

// Create singleton instance
export const supabaseApi = new SupabaseApiService();

// Export for global access
(window as any).supabaseApi = supabaseApi;