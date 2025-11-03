// Product Categories Configuration
export const PRODUCT_CATEGORIES = {
  DUBAI: {
    id: 'dubai',
    name: 'Dubai',
    products: ['Dubai Cheesecake', 'Dubai San Sebastian', 'Dubai Solly', 'Snickers']
  },
  FRUIT_CHEESECAKE: {
    id: 'fruit-cheesecake',
    name: 'Fruit Cheesecake',
    products: ['Cheesecake Raspberry', 'Cheesecake Strawberry', 'Cheesecake Pistachio', 'Cheesecake Mango']
  },
  CLASSIC: {
    id: 'classic',
    name: 'Classic',
    products: ['Classic Cheesecake', 'San Sebastian']
  },
  CAKES: {
    id: 'cakes',
    name: 'Cakes',
    products: ['Red Velvet', 'Honey Cake']
  }
} as const;

// Helper function to get category for a product
export function getProductCategory(productName: string): string | null {
  // Clean the product name (trim whitespace)
  const cleanProductName = productName.trim();
  
  for (const [categoryKey, category] of Object.entries(PRODUCT_CATEGORIES)) {
    if (category.products.some(p => p.toLowerCase().trim() === cleanProductName.toLowerCase())) {
      return category.id;
    }
  }
  
  // Debug logging for uncategorized products
  console.log(`🔍 Product "${cleanProductName}" not found in any category`);
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
    let categoryFound = false;
    const productName = product.name.trim().toLowerCase();
    
    // Try exact matching first
    for (const [categoryKey, category] of Object.entries(PRODUCT_CATEGORIES)) {
      if (category.products.some(p => p.toLowerCase().trim() === productName)) {
        grouped[category.name].push(product);
        categoryFound = true;
        break;
      }
    }
    
    // If no exact match, try flexible matching
    if (!categoryFound) {
      // Dubai products
      if (productName.includes('dubai') || productName.includes('solly') || productName.includes('snickers')) {
        grouped['Dubai'].push(product);
        categoryFound = true;
      }
      // Fruit Cheesecakes
      else if (productName.includes('cheesecake') && 
               (productName.includes('mango') || productName.includes('pistachio') || 
                productName.includes('raspberry') || productName.includes('strawberry'))) {
        grouped['Fruit Cheesecake'].push(product);
        categoryFound = true;
      }
      // Classic products
      else if ((productName.includes('classic') && productName.includes('cheesecake')) || 
               (productName === 'san sebastian')) {
        grouped['Classic'].push(product);
        categoryFound = true;
      }
      // Cakes
      else if (productName.includes('red velvet') || productName.includes('honey cake') || 
               productName === 'red velvet' || productName === 'honey cake') {
        grouped['Cakes'].push(product);
        categoryFound = true;
      }
    }
    
    // If still no category found, add to Other
    if (!categoryFound) {
      console.log(`🔍 Uncategorized product: "${product.name}"`);
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