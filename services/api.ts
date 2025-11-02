// ⚠️  LOCALSTORAGE API DISABLED 
// This file has been disabled to prevent localStorage/Supabase confusion
// ALL DATA MUST COME FROM SUPABASE ONLY - Use supabaseApi instead

const throwError = (method: string) => {
  const error = `❌ LOCALHOST API DISABLED - Use supabaseApi.${method}() instead!`;
  console.error('🚨 LOCALSTORAGE API USAGE DETECTED!', error);
  throw new Error(error);
};

// Export disabled API that throws errors to force Supabase usage
export const api = {
  // All localStorage methods disabled - use supabaseApi instead
  getProducts: () => throwError('getProducts'),
  getClients: () => throwError('getClients'),
  getMaterials: () => throwError('getMaterials'),
  getDeliveries: () => throwError('getDeliveries'),
  getProduction: () => throwError('getProductionBatches'),
  getPurchases: () => throwError('getPurchases'),
  getInventory: () => throwError('calculate inventory from Supabase data'),
  getInventoryDetail: () => throwError('calculate inventory from Supabase data'),
  
  // Write operations
  addProductionBatch: () => throwError('createProductionBatch'),
  deleteProductionBatch: () => throwError('deleteProductionBatch'),
  saveDeliveries: () => throwError('use individual delivery methods'),
  addPurchase: () => throwError('addPurchase'),
  deletePurchase: () => throwError('deletePurchase'),
  
  // Other commonly used methods
  createClient: () => throwError('createClient'),
  updateClient: () => throwError('updateClient'),
  deleteClient: () => throwError('deleteClient'),
  createProduct: () => throwError('createProduct'),
  updateProduct: () => throwError('updateProduct'),
  deleteProduct: () => throwError('deleteProduct'),
  createMaterial: () => throwError('createMaterial'),
  updateMaterial: () => throwError('updateMaterial'),
  deleteMaterial: () => throwError('deleteMaterial')
};

console.warn('⚠️  localStorage API has been disabled - use supabaseApi for all data operations!');
