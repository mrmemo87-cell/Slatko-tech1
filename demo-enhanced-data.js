// Demo data enhancement script - run this in the browser console to add enhanced sample data

// Enhanced materials with expiration dates, costs, and quality grades
const enhancedMaterials = [
  {
    id: 'm1',
    name: 'Cream Cheese',
    unit: 'kg',
    stock: 10,
    lowStockThreshold: 2,
    expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    supplier: 'Dairy Fresh Ltd',
    costPerUnit: 800,
    reorderPoint: 5,
    leadTimeDays: 3,
    qualityGrade: 'A'
  },
  {
    id: 'm2',
    name: 'Sugar',
    unit: 'kg',
    stock: 25,
    lowStockThreshold: 5,
    supplier: 'Sweet Supply Co',
    costPerUnit: 90,
    reorderPoint: 10,
    leadTimeDays: 7,
    qualityGrade: 'A'
  },
  {
    id: 'm3',
    name: 'Flour',
    unit: 'kg',
    stock: 20,
    lowStockThreshold: 5,
    supplier: 'Grain Masters',
    costPerUnit: 60,
    reorderPoint: 8,
    leadTimeDays: 5,
    qualityGrade: 'A'
  },
  {
    id: 'm4',
    name: 'Eggs',
    unit: 'piece',
    stock: 100,
    lowStockThreshold: 24,
    expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now - CRITICAL
    supplier: 'Fresh Farm Eggs',
    costPerUnit: 15,
    reorderPoint: 50,
    leadTimeDays: 2,
    qualityGrade: 'A'
  },
  {
    id: 'm5',
    name: 'Red Food Coloring',
    unit: 'ml',
    stock: 500,
    lowStockThreshold: 100,
    supplier: 'Color Pro',
    costPerUnit: 2,
    reorderPoint: 200,
    leadTimeDays: 14,
    qualityGrade: 'B'
  },
  {
    id: 'm6',
    name: 'Honey',
    unit: 'kg',
    stock: 1, // LOW STOCK ALERT!
    lowStockThreshold: 1,
    expirationDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
    supplier: 'Golden Bee Farm',
    costPerUnit: 1200,
    reorderPoint: 3,
    leadTimeDays: 10,
    qualityGrade: 'A'
  },
  {
    id: 'm7',
    name: 'Butter',
    unit: 'kg',
    stock: 8,
    lowStockThreshold: 2,
    expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
    supplier: 'Dairy Fresh Ltd',
    costPerUnit: 900,
    reorderPoint: 4,
    leadTimeDays: 3,
    qualityGrade: 'A'
  }
];

// Enhanced clients with credit management
const enhancedClients = [
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
    creditLimit: 50000,
    paymentTermDays: 14,
    currentBalance: 15000,
    isActive: true,
    riskLevel: 'LOW',
    lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalOrderValue: 245000,
    reliabilityScore: 95
  },
  {
    id: 'c2',
    name: 'Gulnara',
    businessName: 'Adriano Coffee',
    phone: '+996 777 987654',
    address: 'Chuy Ave 123, Bishkek',
    customPrices: [],
    creditLimit: 30000,
    paymentTermDays: 30,
    currentBalance: 2800,
    isActive: true,
    riskLevel: 'MEDIUM',
    lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    totalOrderValue: 78000,
    reliabilityScore: 78
  }
];

// Enhanced production batches with cost tracking
const enhancedProduction = [
  {
    id: 'prod1',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    productId: 'p1',
    quantity: 16,
    materialCosts: [
      { materialId: 'm1', quantity: 1.6, cost: 1280 },
      { materialId: 'm2', quantity: 0.8, cost: 72 },
      { materialId: 'm4', quantity: 16, cost: 240 }
    ],
    laborHours: 4,
    overheadCost: 500,
    totalCost: 2092,
    costPerUnit: 130.75,
    qualityScore: 95,
    batchStatus: 'COMPLETED',
    notes: 'Perfect texture and taste'
  },
  {
    id: 'prod2',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    productId: 'p2',
    quantity: 12,
    materialCosts: [
      { materialId: 'm3', quantity: 0.96, cost: 57.6 },
      { materialId: 'm5', quantity: 120, cost: 240 },
      { materialId: 'm7', quantity: 0.6, cost: 540 }
    ],
    laborHours: 3,
    overheadCost: 400,
    totalCost: 1237.6,
    costPerUnit: 103.13,
    qualityScore: 88,
    batchStatus: 'COMPLETED',
    notes: 'Good color, slightly dense texture'
  }
];

// Function to update localStorage with enhanced data
function loadEnhancedDemoData() {
  localStorage.setItem('materials', JSON.stringify(enhancedMaterials));
  localStorage.setItem('clients', JSON.stringify(enhancedClients));
  localStorage.setItem('production', JSON.stringify(enhancedProduction));
  
  console.log('✅ Enhanced demo data loaded!');
  console.log('📊 New features available:');
  console.log('  - Material expiration tracking');
  console.log('  - Cost per unit tracking');
  console.log('  - Quality grades');
  console.log('  - Client credit management');
  console.log('  - Production cost analysis');
  console.log('  - Business intelligence alerts');
  console.log('');
  console.log('🔔 Refresh the page to see the new features in action!');
}

// Auto-load on script execution
loadEnhancedDemoData();