import React, { useState, useEffect } from 'react';
import { Client, Product, DeliveryItem } from '../../types';
import { supabaseApi } from '../../services/supabase-api';
import { generateId, todayISO, formatCurrency } from '../../utils';
import { PRODUCT_CATEGORIES, groupProductsByCategory } from '../../constants/productCategories';

interface QuickDeliveryProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
}

// Preset quantities for quick selection
const QUICK_QUANTITIES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24];

export const QuickDelivery: React.FC<QuickDeliveryProps> = ({ t, showToast, onClose }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<DeliveryItem[]>([]);
  const [step, setStep] = useState<'client' | 'products' | 'review'>('client');
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, productsData] = await Promise.all([
        supabaseApi.getClients(),
        supabaseApi.getProducts()
      ]);
      
      // Sort clients by order priority (expected to order soon first)
      const sortedClients = sortClientsByOrderPriority(clientsData);
      setClients(sortedClients);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sort clients based on last order date - prioritize those expected to order
  const sortClientsByOrderPriority = (clientList: Client[]): Client[] => {
    const now = new Date();
    
    return clientList.sort((a, b) => {
      // Parse dates safely
      const aLastOrder = a.lastOrderDate ? new Date(a.lastOrderDate) : null;
      const bLastOrder = b.lastOrderDate ? new Date(b.lastOrderDate) : null;
      
      // Handle invalid dates
      const aValid = aLastOrder && !isNaN(aLastOrder.getTime());
      const bValid = bLastOrder && !isNaN(bLastOrder.getTime());
      
      // New clients (no valid date) get highest priority
      if (!aValid && !bValid) return a.name.localeCompare(b.name); // Sort by name as tiebreaker
      if (!aValid) return -1; // a comes first (new client)
      if (!bValid) return 1;  // b comes first (new client)
      
      // Calculate days since last order for valid dates
      const aDaysSince = Math.floor((now.getTime() - aLastOrder!.getTime()) / (1000 * 60 * 60 * 24));
      const bDaysSince = Math.floor((now.getTime() - bLastOrder!.getTime()) / (1000 * 60 * 60 * 24));
      
      // Sort by days since last order (more days = higher priority to order again)
      const daysDiff = bDaysSince - aDaysSince;
      
      // If same number of days, sort by name
      return daysDiff !== 0 ? daysDiff : a.name.localeCompare(b.name);
    });
  };

  // Get order priority indicator for display
  const getOrderPriorityInfo = (client: Client): { priority: 'high' | 'medium' | 'low', text: string, days: number } => {
    if (!client.lastOrderDate) {
      return { priority: 'high', text: 'New client', days: 0 };
    }
    
    const now = new Date();
    const lastOrder = new Date(client.lastOrderDate);
    
    // Handle invalid dates
    if (isNaN(lastOrder.getTime())) {
      return { priority: 'high', text: 'New client', days: 0 };
    }
    
    const daysSince = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
    
    // Handle negative days (future dates)
    if (daysSince < 0) {
      return { priority: 'low', text: 'Today', days: 0 };
    }
    
    // High priority: Haven't ordered in a week or more
    if (daysSince >= 7) {
      if (daysSince >= 30) {
        const months = Math.floor(daysSince / 30);
        return { priority: 'high', text: `${months} month${months === 1 ? '' : 's'} ago`, days: daysSince };
      } else if (daysSince >= 14) {
        const weeks = Math.floor(daysSince / 7);
        return { priority: 'high', text: `${weeks} week${weeks === 1 ? '' : 's'} ago`, days: daysSince };
      } else {
        return { priority: 'high', text: `${daysSince} days ago`, days: daysSince };
      }
    } 
    // Medium priority: 3-6 days ago  
    else if (daysSince >= 3) {
      return { priority: 'medium', text: `${daysSince} days ago`, days: daysSince };
    } 
    // Low priority: Recent orders (0-2 days)
    else {
      return { 
        priority: 'low', 
        text: daysSince === 0 ? 'Today' : `${daysSince} day${daysSince === 1 ? '' : 's'} ago`, 
        days: daysSince 
      };
    }
  };

  // Quick client selection with large touch targets
  const ClientSelector = () => {
    // Filter clients based on search term
    const filteredClients = clients.filter(client => 
      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      client.businessName?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      client.phone?.includes(clientSearchTerm)
    );

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold mb-4 text-center">Select Client</h3>
        
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search clients..."
            value={clientSearchTerm}
            onChange={(e) => setClientSearchTerm(e.target.value)}
            className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
          {clientSearchTerm && (
            <button
              onClick={() => setClientSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="text-xs text-center text-gray-500 mb-4">
          Sorted by order priority - Expected to order clients first
          {clientSearchTerm && ` (${filteredClients.length} matches)`}
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredClients.map(client => {
          const priorityInfo = getOrderPriorityInfo(client);
          const priorityColors = {
            high: 'bg-red-100 text-red-700 border-red-200',
            medium: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
            low: 'bg-green-100 text-green-700 border-green-200'
          };
          
          return (
            <button
              key={client.id}
              onClick={() => {
                setSelectedClient(client);
                setStep('products');
              }}
              className={`w-full p-4 bg-white border-2 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                priorityInfo.priority === 'high' ? 'border-red-200' : 
                priorityInfo.priority === 'medium' ? 'border-yellow-200' : 
                'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-500">{client.businessName}</div>
                  <div className="text-xs text-gray-400">{client.phone}</div>
                  {client.lastOrderDate && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Last order:</span>
                      <span className="ml-1">
                        {new Date(client.lastOrderDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'Asia/Bishkek'
                        })}
                      </span>
                      <span className="mx-1">•</span>
                      <span className="font-mono">
                        {new Date(client.lastOrderDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                          timeZone: 'Asia/Bishkek'
                        })}
                      </span>
                    </div>
                  )}
                  {!client.lastOrderDate && (
                    <div className="text-xs text-orange-600 mt-1 font-medium flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      No previous orders
                    </div>
                  )}
                </div>
                <div className="ml-3 flex flex-col items-end">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[priorityInfo.priority]}`}>
                    {priorityInfo.priority === 'high' ? '🔥 Expected' : 
                     priorityInfo.priority === 'medium' ? '⚡ Soon' : 
                     '✅ Recent'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    {priorityInfo.text}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
        </div>
        
        {filteredClients.length === 0 && clientSearchTerm && (
          <div className="text-center py-8 text-gray-500">
            No clients found matching "{clientSearchTerm}"
          </div>
        )}
      </div>
    );
  };

  // Product selection with quantity buttons
  const ProductSelector = () => {
    // TODO: Implement inventory check with Supabase API if needed
    
    const addToCart = (product: Product, quantity: number) => {
      const price = selectedClient?.customPrices.find(cp => cp.productId === product.id)?.price || product.defaultPrice;
      const existingItem = cart.find(item => item.productId === product.id);
      
      if (existingItem) {
        setCart(prev => prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ));
      } else {
        setCart(prev => [...prev, {
          productId: product.id,
          quantity,
          price
        }]);
      }
      
      // Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setStep('client')}
            className="text-blue-600 text-sm"
          >
            ← Change Client
          </button>
          <h3 className="text-lg font-semibold">Add Products</h3>
          <button
            onClick={() => setStep('review')}
            className={`text-sm px-3 py-1 rounded ${
              cart.length > 0 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-500'
            }`}
            disabled={cart.length === 0}
          >
            Review ({cart.length})
          </button>
        </div>
        
        <div className="text-center text-sm text-gray-600 mb-4">
          Client: <span className="font-medium">{selectedClient?.name}</span>
        </div>

        <div className="space-y-3">
          {Object.entries(groupProductsByCategory(products)).map(([categoryName, categoryProducts]) => {
            const isExpanded = expandedCategories.has(categoryName);
            const categoryProductsInCart = categoryProducts.filter(product => 
              cart.find(item => item.productId === product.id)?.quantity > 0
            ).length;
            
            return (
              <div key={categoryName} className="bg-white border rounded-lg">
                {/* Category Header */}
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedCategories);
                    if (isExpanded) {
                      newExpanded.delete(categoryName);
                    } else {
                      newExpanded.add(categoryName);
                    }
                    setExpandedCategories(newExpanded);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900">{categoryName}</h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {categoryProducts.length} products
                    </span>
                  </div>
                  {categoryProductsInCart > 0 && (
                    <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                      {categoryProductsInCart} in cart
                    </span>
                  )}
                </button>
                
                {/* Category Products */}
                {isExpanded && (
                  <div className="border-t space-y-2 p-2">
                    {categoryProducts.map(product => {
                      const price = selectedClient?.customPrices.find(cp => cp.productId === product.id)?.price || product.defaultPrice;
                      const inCart = cart.find(item => item.productId === product.id)?.quantity || 0;
                      
                      return (
                        <div key={product.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-medium text-gray-900">{product.name}</h5>
                              <p className="text-sm text-gray-500">{formatCurrency(price)}/{product.unit}</p>
                              {inCart > 0 && (
                                <p className="text-xs text-green-600 font-medium">
                                  In cart: {inCart}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick quantity buttons */}
                          <div className="grid grid-cols-4 gap-2">
                            {QUICK_QUANTITIES.slice(0, 8).map(quantity => (
                              <button
                                key={quantity}
                                onClick={() => addToCart(product, quantity)}
                                className="bg-blue-600 text-white py-2 px-2 rounded text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
                              >
                                +{quantity}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Review and submit
  const ReviewOrder = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const total = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    const handleSubmit = async () => {
      if (!selectedClient || cart.length === 0 || isSubmitting) return;
      
      setIsSubmitting(true);
      try {
        // Create delivery using Supabase API
        await supabaseApi.createDelivery({
          date: new Date().toISOString(),
          clientId: selectedClient.id,
          items: cart,
          notes: `Quick order - ${new Date().toLocaleTimeString()}`
        });
        
        showToast(`Order created for ${selectedClient.name} - ${formatCurrency(total)}`);
        
        // Refresh client data to get updated lastOrderDate
        await loadData();
        
        onClose();
      } catch (error) {
        console.error('Error creating delivery:', error);
        showToast('Error creating order', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
      if (newQuantity === 0) {
        removeFromCart(productId);
        return;
      }
      
      setCart(prev => prev.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      ));
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setStep('products')}
            className="text-blue-600 text-sm"
          >
            ← Add More
          </button>
          <h3 className="text-lg font-semibold">Review Order</h3>
          <div></div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="font-medium">{selectedClient?.name}</div>
          <div className="text-sm text-gray-600">{selectedClient?.businessName}</div>
        </div>

        <div className="space-y-2">
          {cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            return (
              <div key={item.productId} className="bg-white border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{product?.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center"
                    >
                      +
                    </button>
                    <div className="ml-4 font-medium">
                      {formatCurrency(item.quantity * item.price)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total:</span>
            <span className="text-green-600">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              isSubmitting 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            disabled={cart.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </div>
            ) : (
              'Create Order'
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-gray-100 w-full max-w-md h-[90vh] rounded-t-2xl p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Quick Delivery</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-2 text-slate-500">Loading clients and products...</p>
          </div>
        ) : (
          <>
            {step === 'client' && <ClientSelector />}
            {step === 'products' && <ProductSelector />}
            {step === 'review' && <ReviewOrder />}
          </>
        )}
      </div>
    </div>
  );
};