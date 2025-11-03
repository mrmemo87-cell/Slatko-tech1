// Product Categories Configuration
export const PRODUCT_CATEGORIES = {
  DUBAI: {
    id: 'dubai',
    name: 'Dubai',
    products: ['Dubai Cheesecake', 'Dubai San Sebastian', 'Solly', 'Snickers']
  },
  FRUIT_CHEESECAKE: {
    id: 'fruit-cheesecake',
    name: 'Fruit Cheesecake',
    products: ['Raspberries Cheesecake', 'Mango Cheesecake', 'Strawberry Cheesecake', 'Pistachio Cheesecake']
  },
  CLASSIC: {
    id: 'classic',
    name: 'Classic',
    products: ['Classic Cheesecake', 'San Sebastian']
  },
  CAKES: {
    id: 'cakes',
    name: 'Cakes',
    products: ['Redvelvet', 'Honey Cake']
  }
} as const;

// Helper function to get category for a product
export function getProductCategory(productName: string): string | null {
  for (const [categoryKey, category] of Object.entries(PRODUCT_CATEGORIES)) {
    if (category.products.some(p => p.toLowerCase() === productName.toLowerCase())) {
      return category.id;
    }
  }
  return null;
}

// Helper function to group products by category
export function groupProductsByCategory(products: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  // Initialize all categories
  Object.values(PRODUCT_CATEGORIES).forEach(category => {
    grouped[category.name] = [];
  });
  
  // Add uncategorized group
  grouped['Other'] = [];
  
  // Group products
  products.forEach(product => {
    const categoryId = getProductCategory(product.name);
    if (categoryId) {
      // Find category by id and use its name as key
      const category = Object.values(PRODUCT_CATEGORIES).find(cat => cat.id === categoryId);
      if (category) {
        grouped[category.name].push(product);
      } else {
        grouped['Other'].push(product);
      }
    } else {
      grouped['Other'].push(product);
    }
  });
  
  // Filter out empty categories
  const result: Record<string, any[]> = {};
  Object.entries(grouped).forEach(([categoryName, categoryProducts]) => {
    if (categoryProducts.length > 0) {
      result[categoryName] = categoryProducts;
    }
  });
  
  return result;
}