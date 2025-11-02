// Script to update localStorage with new clients and materials
// Run this in your browser's console (F12 > Console tab) while your app is open

// Clear existing data
localStorage.removeItem('clients');
localStorage.removeItem('materials');

// New clients data
const newClients = [
  { id: 'c1', name: 'ONLINE', businessName: 'ONLINE', phone: '', address: '', customPrices: [] },
  { id: 'c2', name: 'بيغ بايت', businessName: 'بيغ بايت', phone: '', address: '', customPrices: [] },
  { id: 'c3', name: 'شاشليشني', businessName: 'شاشليشني', phone: '', address: '', customPrices: [] },
  { id: 'c4', name: 'مراش', businessName: 'مراش', phone: '', address: '', customPrices: [] },
  { id: 'c5', name: 'سونون', businessName: 'سونون', phone: '', address: '', customPrices: [] },
  { id: 'c6', name: '135', businessName: '135', phone: '', address: '', customPrices: [] },
  { id: 'c7', name: 'بايراق', businessName: 'بايراق', phone: '', address: '', customPrices: [] },
  { id: 'c8', name: 'كورداك', businessName: 'كورداك', phone: '', address: '', customPrices: [] },
  { id: 'c9', name: 'دبل شوت', businessName: 'دبل شوت', phone: '', address: '', customPrices: [] },
  { id: 'c10', name: 'تودور', businessName: 'تودور', phone: '', address: '', customPrices: [] },
  { id: 'c11', name: 'pollen', businessName: 'pollen', phone: '', address: '', customPrices: [] },
  { id: 'c12', name: 'شاشليك', businessName: 'شاشليك', phone: '', address: '', customPrices: [] },
  { id: 'c13', name: 'وود', businessName: 'وود', phone: '', address: '', customPrices: [] },
  { id: 'c14', name: 'كافينيي', businessName: 'كافينيي', phone: '', address: '', customPrices: [] },
  { id: 'c15', name: 'بينوتشي', businessName: 'بينوتشي', phone: '', address: '', customPrices: [] },
  { id: 'c16', name: 'ice', businessName: 'ice', phone: '', address: '', customPrices: [] },
  { id: 'c17', name: 'تايمين', businessName: 'تايمين', phone: '', address: '', customPrices: [] },
  { id: 'c18', name: 'لونا', businessName: 'لونا', phone: '', address: '', customPrices: [] },
  { id: 'c19', name: 'فارينتشايا', businessName: 'فارينتشايا', phone: '', address: '', customPrices: [] },
  { id: 'c20', name: 'كافيار', businessName: 'كافيار', phone: '', address: '', customPrices: [] },
  { id: 'c21', name: 'زيرنو 2', businessName: 'زيرنو 2', phone: '', address: '', customPrices: [] },
  { id: 'c22', name: 'سيلينتانا 2', businessName: 'سيلينتانا 2', phone: '', address: '', customPrices: [] },
  { id: 'c23', name: 'شهرزاد', businessName: 'شهرزاد', phone: '', address: '', customPrices: [] },
  { id: 'c24', name: 'أيل', businessName: 'أيل', phone: '', address: '', customPrices: [] },
  { id: 'c25', name: 'زيرنو 1', businessName: 'زيرنو 1', phone: '', address: '', customPrices: [] },
  { id: 'c26', name: 'زيرنو 3', businessName: 'زيرنو 3', phone: '', address: '', customPrices: [] },
  { id: 'c27', name: 'bey', businessName: 'bey', phone: '', address: '', customPrices: [] },
  { id: 'c28', name: 'زادة', businessName: 'زادة', phone: '', address: '', customPrices: [] }
];

// New materials data
const newMaterials = [
  { id: 'm1', name: 'Cream Cheese', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm2', name: 'Whipping Cream', unit: 'liter', stock: 0, lowStockThreshold: 1 },
  { id: 'm3', name: 'Eggs', unit: 'piece', stock: 0, lowStockThreshold: 12 },
  { id: 'm4', name: 'Sugar', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm5', name: 'Flour', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm6', name: 'Starch', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm7', name: 'Vanilia', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm8', name: 'Butter', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm9', name: 'Sour cream', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm10', name: 'Biscuit', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm11', name: 'White Chocolate', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm12', name: 'Milk Chocolare', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm13', name: 'Dark Chocolate', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm14', name: 'Pistachio Butter', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm15', name: 'Kunafeh', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm16', name: 'Pistachio', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm17', name: 'Lemon', unit: 'piece', stock: 0, lowStockThreshold: 1 },
  { id: 'm18', name: 'Milk', unit: 'liter', stock: 0, lowStockThreshold: 1 },
  { id: 'm19', name: 'Baking Paper', unit: 'roll', stock: 0, lowStockThreshold: 1 },
  { id: 'm20', name: 'Foil Paper', unit: 'roll', stock: 0, lowStockThreshold: 1 },
  { id: 'm21', name: 'Napkins', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm22', name: 'Chocolate Box', unit: 'piece', stock: 0, lowStockThreshold: 5 },
  { id: 'm23', name: 'Cake Box', unit: 'piece', stock: 0, lowStockThreshold: 5 },
  { id: 'm24', name: 'Mango', unit: 'piece', stock: 0, lowStockThreshold: 1 },
  { id: 'm25', name: 'Gelatin', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm26', name: 'Puree Mango', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm27', name: 'Puree Raspberries', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm28', name: 'Puree Passion Fruit', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm29', name: 'Raspberries', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm30', name: 'Cacao', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm31', name: 'Peanut Butter', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm32', name: 'Heavy Cream 33', unit: 'liter', stock: 0, lowStockThreshold: 1 },
  { id: 'm33', name: 'Piping Bag', unit: 'piece', stock: 0, lowStockThreshold: 10 },
  { id: 'm34', name: 'Chocolate Biscuit', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm35', name: 'Condensed Milk', unit: 'can', stock: 0, lowStockThreshold: 1 },
  { id: 'm36', name: 'Washing Soap', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm37', name: 'Trash Bag', unit: 'roll', stock: 0, lowStockThreshold: 1 },
  { id: 'm38', name: 'Strech Wrap', unit: 'roll', stock: 0, lowStockThreshold: 1 },
  { id: 'm39', name: 'Hair Net', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm40', name: 'Testing Box', unit: 'piece', stock: 0, lowStockThreshold: 5 },
  { id: 'm41', name: 'Alpen Chocolate', unit: 'bar', stock: 0, lowStockThreshold: 1 },
  { id: 'm42', name: 'Ghee', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm43', name: 'Peanut', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm44', name: 'Glaze Orange', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm45', name: 'Glaze Pink', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm46', name: 'Glaze Green', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm47', name: 'Glaze Black', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm48', name: 'Glaze White', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm49', name: 'Glaze Yellow', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm50', name: 'Glaze Blue', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm51', name: 'Oil', unit: 'liter', stock: 0, lowStockThreshold: 1 },
  { id: 'm52', name: 'Kitchen Towels', unit: 'roll', stock: 0, lowStockThreshold: 1 },
  { id: 'm53', name: 'Food color', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm54', name: 'cinamon', unit: 'kg', stock: 0, lowStockThreshold: 0.1 },
  { id: 'm55', name: 'yeast', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm56', name: 'Kefir', unit: 'liter', stock: 0, lowStockThreshold: 1 },
  { id: 'm57', name: 'mascarpone cheese', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm58', name: 'flowers decor', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm59', name: 'Lotus biscuit', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm60', name: 'Lotus butter', unit: 'jar', stock: 0, lowStockThreshold: 1 },
  { id: 'm61', name: 'Honey', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm62', name: 'Soda', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm63', name: 'Baking powder', unit: 'pack', stock: 0, lowStockThreshold: 1 },
  { id: 'm64', name: 'Milk butter', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm65', name: 'Salt', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm66', name: 'Brown sugar', unit: 'kg', stock: 0, lowStockThreshold: 1 },
  { id: 'm67', name: 'vineger', unit: 'bottle', stock: 0, lowStockThreshold: 1 },
  { id: 'm68', name: 'kakao', unit: 'kg', stock: 0, lowStockThreshold: 1 }
];

// Save to localStorage
localStorage.setItem('clients', JSON.stringify(newClients));
localStorage.setItem('materials', JSON.stringify(newMaterials));

// Refresh the page to load new data
window.location.reload();

console.log('✅ Data updated successfully!');
console.log(`📊 Added ${newClients.length} clients and ${newMaterials.length} materials`);
console.log('🔄 Page will refresh to load the new data');