import { supabaseApi } from '../services/supabase-api';

// Keys used by the old localStorage API
const OLD_STORAGE_KEYS = [
  'slatko_products',
  'slatko_clients', 
  'slatko_deliveries',
  'slatko_materials',
  'slatko_purchases',
  'slatko_production',
  'slatko_invoiceCounter'
];

export interface MigrationResult {
  success: boolean;
  migratedData: {
    products: number;
    clients: number;
    materials: number;
    deliveries: number;
    production: number;
  };
  errors: string[];
}

/**
 * One-time migration from localStorage to Supabase
 * This ensures Supabase becomes the single source of truth
 */
export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedData: {
      products: 0,
      clients: 0,
      materials: 0,
      deliveries: 0,
      production: 0
    },
    errors: []
  };

  try {
    console.log('🚀 Starting localStorage to Supabase migration...');

    // Check if migration already completed
    const migrationFlag = localStorage.getItem('slatko_migration_completed');
    if (migrationFlag === 'true') {
      console.log('✅ Migration already completed, skipping...');
      result.success = true;
      return result;
    }

    // Migrate Products
    const localProducts = localStorage.getItem('slatko_products');
    if (localProducts) {
      try {
        const products = JSON.parse(localProducts);
        const existingProducts = await supabaseApi.getProducts();
        
        // Only migrate if Supabase has no products
        if (existingProducts.length === 0 && products.length > 0) {
          console.log(`📦 Migrating ${products.length} products...`);
          for (const product of products) {
            await supabaseApi.createProduct({
              name: product.name,
              unit: product.unit,
              defaultPrice: product.defaultPrice || product.price || 0,
              recipe: product.recipe
            });
            result.migratedData.products++;
          }
        }
      } catch (error) {
        result.errors.push(`Products migration failed: ${error}`);
      }
    }

    // Migrate Materials
    const localMaterials = localStorage.getItem('slatko_materials');
    if (localMaterials) {
      try {
        const materials = JSON.parse(localMaterials);
        const existingMaterials = await supabaseApi.getMaterials();
        
        if (existingMaterials.length === 0 && materials.length > 0) {
          console.log(`🧱 Migrating ${materials.length} materials...`);
          for (const material of materials) {
            await supabaseApi.createMaterial({
              name: material.name,
              unit: material.unit,
              stock: material.stock || 0,
              lowStockThreshold: material.lowStockThreshold || material.minStockLevel || 0
            });
            result.migratedData.materials++;
          }
        }
      } catch (error) {
        result.errors.push(`Materials migration failed: ${error}`);
      }
    }

    // Migrate Clients
    const localClients = localStorage.getItem('slatko_clients');
    if (localClients) {
      try {
        const clients = JSON.parse(localClients);
        const existingClients = await supabaseApi.getClients();
        
        if (existingClients.length === 0 && clients.length > 0) {
          console.log(`👥 Migrating ${clients.length} clients...`);
          for (const client of clients) {
            await supabaseApi.createClient({
              name: client.name,
              businessName: client.businessName,
              phone: client.phone,
              address: client.address,
              email: client.email,
              customPrices: client.customPrices || []
            });
            result.migratedData.clients++;
          }
        }
      } catch (error) {
        result.errors.push(`Clients migration failed: ${error}`);
      }
    }

    // NOTE: Deliveries and Production batches migration would be more complex
    // due to relationships and date handling - skipping for now to prevent data corruption

    // Mark migration as completed
    localStorage.setItem('slatko_migration_completed', 'true');
    
    result.success = result.errors.length === 0;
    
    console.log('✅ Migration completed:', result);
    
    // Schedule localStorage cleanup after successful migration
    if (result.success) {
      setTimeout(() => purgeOldLocalStorage(), 5000);
    }

    return result;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    result.errors.push(`Migration failed: ${error}`);
    return result;
  }
}

/**
 * Purge old localStorage keys after successful migration
 * This ensures Supabase becomes the only data source
 */
export function purgeOldLocalStorage(): void {
  try {
    console.log('🧹 Purging old localStorage data...');
    
    OLD_STORAGE_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed ${key}`);
      }
    });
    
    console.log('✅ Old localStorage data purged - Supabase is now single source of truth');
    
  } catch (error) {
    console.error('❌ Failed to purge localStorage:', error);
  }
}

/**
 * Force cleanup of localStorage (emergency use)
 */
export function forceCleanLocalStorage(): void {
  console.log('🚨 Force cleaning ALL localStorage data...');
  
  // Keep only essential keys
  const keepKeys = ['slatko_migration_completed'];
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (!keepKeys.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Force cleanup completed');
}