#!/bin/bash
# NUCLEAR OPTION: Remove localStorage API completely
# This will force all components to use Supabase only

# 1. Rename the localStorage API service to prevent usage
mv services/api.ts services/api.ts.DISABLED

# 2. Create a redirect file that warns about localStorage usage
cat > services/api.ts << 'EOF'
// ⚠️  LOCALSTORAGE API DISABLED
// This file has been disabled to prevent localStorage/Supabase confusion
// ALL DATA MUST COME FROM SUPABASE ONLY

export const api = {
  // All methods disabled - use supabaseApi instead
  getProducts: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi.getProducts()');
  },
  getClients: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi.getClients()');
  },
  getMaterials: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi.getMaterials()');
  },
  getDeliveries: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi.getDeliveries()');
  },
  getProduction: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi.getProductionBatches()');
  },
  getPurchases: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi.getPurchases()');
  },
  getInventory: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Calculate from Supabase data');
  },
  getInventoryDetail: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Calculate from Supabase data');
  },
  // Add more disabled methods as needed
  addProductionBatch: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi.createProductionBatch()');
  },
  deleteProductionBatch: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi methods');
  },
  saveDeliveries: () => { 
    throw new Error('❌ LOCALHOST API DISABLED - Use supabaseApi methods');
  }
};

console.error('🚨 LOCALSTORAGE API USAGE DETECTED! Switch to supabaseApi immediately!');
EOF

echo "✅ localStorage API disabled - all code must now use Supabase!"