
// ⚠️  LOCALSTORAGE API DISABLED 
// This file has been disabled to prevent localStorage/Supabase confusion
// ALL DATA MUST COME FROM SUPABASE ONLY - Use supabaseApi instead

const throwError = (method: string) => {
  const error = `❌ LOCALHOST API DISABLED - Use supabaseApi.${method}() instead!`;
  console.error('🚨 LOCALSTORAGE API USAGE DETECTED!', error);
  throw new Error(error);
};
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
};

// --- Initial Data ---
const setupInitialData = () => {
  if (localStorage.getItem('data_initialized_v2')) return;

  const sampleMaterials: Material[] = [
      { id: 'm1', name: 'Cream Cheese', unit: 'kg', stock: 10, lowStockThreshold: 2 },
      { id: 'm2', name: 'Sugar', unit: 'kg', stock: 25, lowStockThreshold: 5 },
      { id: 'm3', name: 'Flour', unit: 'kg', stock: 20, lowStockThreshold: 5 },
      { id: 'm4', name: 'Eggs', unit: 'piece', stock: 100, lowStockThreshold: 24 },
      { id: 'm5', name: 'Red Food Coloring', unit: 'ml', stock: 500, lowStockThreshold: 100 },
      { id: 'm6', name: 'Honey', unit: 'kg', stock: 5, lowStockThreshold: 1 },
      { id: 'm7', name: 'Butter', unit: 'kg', stock: 8, lowStockThreshold: 2 },
  ];
  
  const samplePurchases: Purchase[] = [
    {
      id: generateId(),
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      supplier: 'Bishkek Prod Service',
      items: [
        { materialId: 'm1', quantity: 10, price: 800 },
        { materialId: 'm2', quantity: 25, price: 90 },
      ]
    }
  ];

  const sampleProducts: Product[] = [
    { id: 'p1', name: 'New York Cheesecake', unit: 'slice', defaultPrice: 350, recipe: [
        { materialId: 'm1', quantity: 0.1 }, // 100g cream cheese
        { materialId: 'm2', quantity: 0.05 }, // 50g sugar
        { materialId: 'm4', quantity: 1 }, // 1 egg
    ]},
    { id: 'p2', name: 'Red Velvet Cake', unit: 'slice', defaultPrice: 300, recipe: [
        { materialId: 'm3', quantity: 0.08 },
        { materialId: 'm5', quantity: 10 },
        { materialId: 'm7', quantity: 0.05 },
    ]},
    { id: 'p3', name: 'Honey Cake (Medovik)', unit: 'slice', defaultPrice: 280, recipe: [
        { materialId: 'm6', quantity: 0.06 },
        { materialId: 'm3', quantity: 0.07 },
    ]},
    { id: 'p4', name: 'Whole Cheesecake', unit: 'whole', defaultPrice: 2800, recipe: [
        { materialId: 'm1', quantity: 1 }, // 1kg cream cheese
        { materialId: 'm2', quantity: 0.5 }, // 500g sugar
        { materialId: 'm4', quantity: 8 }, // 8 eggs
    ]},
  ];

  const sampleClients: Client[] = [
    {
      id: 'c1',
      name: 'Aibek',
      businessName: 'Coffee House "Sierra"',
      phone: '+996 555 123456',
      address: 'Manas Ave 45, Bishkek',
      customPrices: [
        { productId: 'p1', price: 320 },
        { productId: 'p2', price: 280 },
      ],
    },
    {
      id: 'c2',
      name: 'Gulnara',
      businessName: 'Adriano Coffee',
      phone: '+996 777 987654',
      address: 'Chuy Ave 123, Bishkek',
      customPrices: [],
    },
  ];

  const sampleProduction: ProductionBatch[] = [
    { id: generateId(), date: new Date(Date.now() - 2 * 86400000).toISOString(), productId: 'p1', quantity: 16 },
    { id: generateId(), date: new Date(Date.now() - 2 * 86400000).toISOString(), productId: 'p2', quantity: 12 },
    { id: generateId(), date: new Date(Date.now() - 1 * 86400000).toISOString(), productId: 'p3', quantity: 20 },
  ];

  const sampleDeliveries: Delivery[] = [
    {
      id: generateId(),
      invoiceNumber: 'SL-001',
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      clientId: 'c1',
      items: [{ productId: 'p1', quantity: 8, price: 320 }, { productId: 'p2', quantity: 6, price: 280 }],
      status: 'Paid',
      returnDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      returnedItems: [{ productId: 'p1', quantity: 1 }, { productId: 'p2', quantity: 0 }],
      payments: [{ id: generateId(), date: new Date(Date.now() - 2 * 86400000).toISOString(), amount: 3920 }],
    },
    {
      id: generateId(),
      invoiceNumber: 'SL-002',
      date: new Date(Date.now() - 1 * 86400000).toISOString(),
      clientId: 'c2',
      items: [{ productId: 'p3', quantity: 10, price: 280 }],
      status: 'Pending',
      notes: 'Urgent order for weekend event',
    },
  ];
  
  saveToStorage('materials', sampleMaterials);
  saveToStorage('purchases', samplePurchases);
  saveToStorage('products', sampleProducts);
  saveToStorage('clients', sampleClients);
  saveToStorage('production', sampleProduction);
  saveToStorage('deliveries', sampleDeliveries);
  localStorage.setItem('data_initialized_v2', 'true');
};

setupInitialData();

class SlatkoAPI {
  // Materials
  getMaterials = (): Material[] => getFromStorage('materials', []);
  saveMaterials = (materials: Material[]) => saveToStorage('materials', materials);

  // Purchases
  getPurchases = (): Purchase[] => getFromStorage('purchases', []);
  savePurchases = (purchases: Purchase[]) => {
    // This function only saves, stock logic is handled in add/delete methods
    saveToStorage('purchases', purchases);
  };

  addPurchase = (purchase: Omit<Purchase, 'id'>) => {
      const purchases = this.getPurchases();
      const materials = this.getMaterials();
      const newPurchase = { ...purchase, id: generateId() };

      // Increase stock
      newPurchase.items.forEach(item => {
          const material = materials.find(m => m.id === item.materialId);
          if (material) {
              material.stock += item.quantity;
          }
      });

      this.savePurchases([newPurchase, ...purchases]);
      this.saveMaterials(materials);
  }

  deletePurchase = (purchaseId: string) => {
    const purchases = this.getPurchases();
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if(!purchaseToDelete) return;

    const materials = this.getMaterials();
    // Revert stock
    purchaseToDelete.items.forEach(item => {
        const material = materials.find(m => m.id === item.materialId);
        if (material) {
            material.stock -= item.quantity;
        }
    });

    this.savePurchases(purchases.filter(p => p.id !== purchaseId));
    this.saveMaterials(materials);
  }


  // Products
  getProducts = (): Product[] => getFromStorage('products', []);
  saveProducts = (products: Product[]) => saveToStorage('products', products);

  // Clients
  getClients = (): Client[] => getFromStorage('clients', []);
  saveClients = (clients: Client[]) => saveToStorage('clients', clients);

  // Production
  getProduction = (): ProductionBatch[] => getFromStorage('production', []);
  saveProductionBatches = (batches: ProductionBatch[]) => saveToStorage('production', batches);
  
  addProductionBatch = (batch: Omit<ProductionBatch, 'id'>) => {
    const batches = this.getProduction();
    const materials = this.getMaterials();
    const product = this.getProducts().find(p => p.id === batch.productId);
    
    if (product?.recipe) {
      product.recipe.forEach(recipeItem => {
        const material = materials.find(m => m.id === recipeItem.materialId);
        if(material) {
          material.stock -= recipeItem.quantity * batch.quantity;
        }
      });
    }

    this.saveProductionBatches([{...batch, id: generateId()}, ...batches].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    this.saveMaterials(materials);
  }

  deleteProductionBatch = (batchId: string) => {
    const batches = this.getProduction();
    const batchToDelete = batches.find(b => b.id === batchId);
    if (!batchToDelete) return;

    const materials = this.getMaterials();
    const product = this.getProducts().find(p => p.id === batchToDelete.productId);
    
    // Revert material stock
    if (product?.recipe) {
      product.recipe.forEach(recipeItem => {
        const material = materials.find(m => m.id === recipeItem.materialId);
        if(material) {
          material.stock += recipeItem.quantity * batchToDelete.quantity;
        }
      });
    }

    this.saveProductionBatches(batches.filter(b => b.id !== batchId));
    this.saveMaterials(materials);
  }

  // Deliveries
  getDeliveries = (): Delivery[] => getFromStorage('deliveries', []);
  saveDeliveries = (deliveries: Delivery[]) => saveToStorage('deliveries', deliveries);

  // Business Logic & Analytics
  getInventory = (): Record<string, number> => {
    const production = this.getProduction();
    const deliveries = this.getDeliveries();

    const produced = production.reduce((acc, batch) => {
      acc[batch.productId] = (acc[batch.productId] || 0) + batch.quantity;
      return acc;
    }, {} as Record<string, number>);

    const delivered = deliveries.flatMap(d => d.items).reduce((acc, item) => {
      acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

    const inventory = Object.keys(produced).reduce((acc, productId) => {
      acc[productId] = produced[productId] - (delivered[productId] || 0);
      return acc;
    }, {} as Record<string, number>);

    return inventory;
  };

  getInventoryDetail = (): InventoryDetail[] => {
    const products = this.getProducts();
    const production = this.getProduction();
    const deliveries = this.getDeliveries();

    return products.map(product => {
      const totalProduced = production
        .filter(p => p.productId === product.id)
        .reduce((sum, p) => sum + p.quantity, 0);

      const totalDelivered = deliveries
        .flatMap(d => d.items)
        .filter(i => i.productId === product.id)
        .reduce((sum, i) => sum + i.quantity, 0);

      const totalReturned = deliveries
        .flatMap(d => d.returnedItems || [])
        .filter(i => i.productId === product.id)
        .reduce((sum, i) => sum + i.quantity, 0);

      const totalSold = totalDelivered - totalReturned;
      const inFactory = totalProduced - totalDelivered;

      return {
        productId: product.id,
        productName: product.name,
        totalProduced,
        totalDelivered,
        totalReturned,
        totalSold,
        inFactory,
      };
    });
  };
}

// Export disabled API that throws errors
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
  addProductionBatch: () => throwError('createProductionBatch'),
  deleteProductionBatch: () => throwError('deleteProductionBatch'),
  saveDeliveries: () => throwError('use individual delivery methods'),
  addPurchase: () => throwError('addPurchase'),
  deletePurchase: () => throwError('deletePurchase'),
};
