import React, { useState, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { unifiedWorkflow } from '../../services/unifiedWorkflow';
import { supabase } from '../../config/supabase';
import { Client, Product } from '../../types';
import { groupProductsByCategory } from '../../constants/productCategories';

interface QuickOrderButtonProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const QuickOrderButton: React.FC<QuickOrderButtonProps> = ({ t, showToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'client' | 'products' | 'confirm'>('client');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingLastOrder, setLoadingLastOrder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, productsData] = await Promise.all([
        supabaseApi.getClients(),
        supabaseApi.getProducts()
      ]);
      setClients(clientsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setStep('client');
    setSelectedClient(null);
    setCart([]);
    setSearchTerm('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('client');
    setSelectedClient(null);
    setCart([]);
    setSearchTerm('');
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setStep('products');
    // Start with all categories COLLAPSED by default
    setExpandedCategories(new Set());
  };

  const handleRepeatLastOrder = async () => {
    if (!selectedClient) return;
    
    try {
      setLoadingLastOrder(true);
      
      console.log('🔍 Starting repeat order for client:', selectedClient.id, selectedClient.name);
      
      // Get last order for this client using the API to ensure proper transformation
      const allDeliveries = await supabaseApi.getDeliveries(500); // Increase limit to get more deliveries
      console.log('📦 All deliveries loaded:', allDeliveries.length);
      
      if (allDeliveries.length > 0) {
        console.log('📋 Sample of first 3 deliveries:');
        allDeliveries.slice(0, 3).forEach((d, i) => {
          console.log(`  ${i + 1}. Order ${d.invoiceNumber} - Client ID: ${d.clientId}, Client Name: ${d.clientName}, Items: ${d.items?.length || 0}`);
        });
      }
      
      console.log('🔍 Looking for client ID:', selectedClient.id);
      console.log('🔍 Looking for client name:', selectedClient.name);
      
      // Try to match by ID first, then fall back to name matching
      let clientDeliveries = allDeliveries
        .filter(d => {
          const matchById = d.clientId === selectedClient.id;
          const matchByName = d.clientName?.toLowerCase().includes(selectedClient.name.toLowerCase()) ||
                             selectedClient.name.toLowerCase().includes(d.clientName?.toLowerCase() || '');
          
          if (!matchById && d.clientId) {
            console.log(`❌ ID Mismatch: delivery ${d.invoiceNumber} has clientId ${d.clientId}, expected ${selectedClient.id}`);
            if (matchByName) {
              console.log(`✅ But NAMES match: "${d.clientName}" ~ "${selectedClient.name}"`);
            }
          }
          return matchById || matchByName;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      console.log('📋 Client deliveries found:', clientDeliveries.length);
      const lastDelivery = clientDeliveries[0];

      if (!lastDelivery || !lastDelivery.items || lastDelivery.items.length === 0) {
        console.warn('⚠️ No previous order:', { lastDelivery, items: lastDelivery?.items });
        showToast('No previous order found for this client', 'error');
        return;
      }
      
      // Build cart from last order items using the properly formatted delivery data
      const newCart: Array<{ product: Product; quantity: number }> = [];
      
      for (const item of lastDelivery.items) {
        // Find the product in our products list by ID
        const product = products.find(p => p.id === item.productId);
        if (product) {
          newCart.push({
            product,
            quantity: item.quantity
          });
        } else {
          // If product not found in local list, create a basic product object from the item data
          // This handles cases where products array might be stale
          newCart.push({
            product: {
              id: item.productId,
              name: item.productName || 'Unknown Product',
              defaultPrice: item.price,
              price: item.price,
              stock: 0,
              unit: 'pcs' as any,
              category: 'General'
            },
            quantity: item.quantity
          });
        }
      }
      
      if (newCart.length === 0) {
        showToast('Could not load products from last order', 'error');
        return;
      }
      
      setCart(newCart);
      showToast(`✅ Loaded ${newCart.length} items from last order!`, 'success');
      
    } catch (error) {
      console.error('Error loading last order:', error);
      showToast('Error loading last order', 'error');
    } finally {
      setLoadingLastOrder(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient || cart.length === 0) return;

    try {
      setSubmitting(true);

      // Create delivery items
      const items = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));

      // Create delivery
      const delivery = await supabaseApi.createDelivery({
        clientId: selectedClient.id,
        date: new Date().toISOString().split('T')[0],
        items
      });

      // Reload workflow
      await unifiedWorkflow.loadOrders();

      showToast(t.deliveries?.saved || 'Order created successfully!', 'success');
      handleClose();
    } catch (error) {
      console.error('Error creating order:', error);
      showToast('Error creating order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.businessName || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Sort by last order date (most recent at BOTTOM - oldest first)
    if (a.lastOrderDate && b.lastOrderDate) {
      return new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime();
    }
    if (a.lastOrderDate) return 1;  // a has orders, move down
    if (b.lastOrderDate) return -1; // b has orders, move down
    return a.name.localeCompare(b.name); // Both have no orders, sort alphabetically
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsByCategory = groupProductsByCategory(filteredProducts);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <>
      {/* AWESOME Floating Action Button with "Add Order" text */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 group"
        style={{ perspective: '1000px' }}
      >
        {/* Multi-layer glow background */}
        <div className="absolute inset-0 w-24 h-24 -bottom-2 -right-2 bg-gradient-to-br from-cyan-400 to-pink-500 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-300 animate-pulse"></div>
        <div className="absolute inset-0 w-24 h-24 -bottom-1 -right-1 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 animate-pulse animation-delay-1000"></div>
        
        {/* Main Button */}
        <div className="relative w-24 h-24 bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-95 group-hover:shadow-pink-500/50 group-hover:shadow-2xl overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-full" style={{ animation: 'shimmer 2s infinite' }}></div>
          
          {/* Inner glow */}
          <div className="absolute inset-1 bg-gradient-to-br from-cyan-400 to-pink-400 rounded-full opacity-40"></div>
          
          {/* Content */}
          <div className="relative flex flex-col items-center justify-center text-white z-10">
            <div className="text-3xl font-bold mb-1 drop-shadow-lg">➕</div>
            <div className="text-xs font-bold text-center leading-tight drop-shadow-lg">
              ADD<br/>ORDER
            </div>
          </div>
          
          {/* Sparkle animation */}
          <div className="absolute top-2 left-2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}></div>
          <div className="absolute bottom-3 right-3 w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-75 transition-opacity duration-300" style={{ animation: 'sparkle 2s ease-in-out infinite' }}></div>
        </div>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">⚡ {t.deliveries?.quickOrder || 'Quick Order'}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {step === 'client' && (t.deliveries?.selectClient || 'Select a client')}
                  {step === 'products' && (t.deliveries?.addProducts || 'Add products')}
                  {step === 'confirm' && (t.deliveries?.confirmOrder || 'Confirm order')}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Step 1: Select Client */}
                  {step === 'client' && (
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder={t.clients?.search || 'Search clients...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        autoFocus
                      />
                      <div className="grid gap-2 max-h-96 overflow-y-auto">
                        {filteredClients.map((client, index) => {
                          const lastOrderDays = client.lastOrderDate 
                            ? Math.floor((new Date().getTime() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
                            : null;
                          
                          // Highlight last 5 recent clients (now at bottom)
                          const isRecent = index >= filteredClients.length - 5 && lastOrderDays !== null;
                          
                          return (
                            <button
                              key={client.id}
                              onClick={() => handleSelectClient(client)}
                              className={`text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                                isRecent
                                  ? 'border-blue-300 bg-blue-50 hover:border-blue-500 hover:bg-blue-100'
                                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">{client.name}</div>
                                  {client.businessName && (
                                    <div className="text-sm text-gray-600">{client.businessName}</div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1">{client.phone}</div>
                                </div>
                                {lastOrderDays !== null && (
                                  <div className="ml-2">
                                    <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                                      lastOrderDays <= 3 
                                        ? 'bg-green-100 text-green-700'
                                        : lastOrderDays <= 7 
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {lastOrderDays === 0 ? 'Today' : lastOrderDays === 1 ? 'Yesterday' : `${lastOrderDays}d ago`}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Add Products */}
                  {step === 'products' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <div className="text-sm text-blue-600 font-medium">{t.clients?.selectedClient || 'Client'}</div>
                        <div className="font-bold text-gray-900">{selectedClient?.name}</div>
                      </div>

                      {/* Repeat Last Order Button */}
                      {cart.length === 0 && (
                        <button
                          onClick={handleRepeatLastOrder}
                          disabled={loadingLastOrder}
                          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                          {loadingLastOrder ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Loading...
                            </>
                          ) : (
                            <>
                              🔄 Repeat Last Order
                              <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                                {selectedClient?.lastOrderDate 
                                  ? new Date(selectedClient.lastOrderDate).toLocaleDateString()
                                  : 'Try it'}
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Quick Add - Most Popular Items */}
                      {!searchTerm && cart.length === 0 && (
                        <div className="bg-gradient-to-r from-cyan-50 to-purple-50 p-4 rounded-lg border-2 border-cyan-200">
                          <div className="text-sm font-bold text-cyan-700 mb-2">⚡ Quick Add Popular</div>
                          <div className="grid grid-cols-2 gap-2">
                            {products.filter(p => 
                              p.name.toLowerCase().includes('dubai') || 
                              p.name.toLowerCase().includes('classic') ||
                              p.name.toLowerCase().includes('cheesecake')
                            ).slice(0, 4).map(product => (
                              <button
                                key={product.id}
                                onClick={() => handleAddToCart(product)}
                                className="p-2 bg-white border-2 border-cyan-300 rounded-lg hover:bg-cyan-100 transition-all"
                              >
                                <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                                <div className="text-xs font-bold text-cyan-600">${product.price}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder={t.products?.search || 'Search products...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      />

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => {
                          const isExpanded = expandedCategories.has(categoryName);
                          
                          return (
                            <div key={categoryName} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleCategory(categoryName)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200"
                              >
                                <div className="flex items-center gap-3">
                                  <svg
                                    className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <h3 className="font-bold text-gray-900">{categoryName}</h3>
                                </div>
                                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-full">
                                  {categoryProducts.length}
                                </span>
                              </button>
                              
                              {isExpanded && (
                                <div className="p-2 space-y-2 bg-white">
                                  {categoryProducts.map(product => {
                                    const cartItem = cart.find(item => item.product.id === product.id);
                                    const inCart = !!cartItem;
                                    const quantity = cartItem?.quantity || 0;
                                    
                                    return (
                                      <div
                                        key={product.id}
                                        className={`p-3 border-2 rounded-lg transition-all duration-200 ${
                                          inCart 
                                            ? 'border-green-500 bg-green-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                      >
                                        <div className="flex justify-between items-center">
                                          <div className="flex-1">
                                            <div className="font-semibold text-gray-900">{product.name}</div>
                                            <div className="text-sm font-bold text-blue-600">${product.price.toFixed(2)}</div>
                                          </div>
                                          
                                          {inCart ? (
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => handleUpdateQuantity(product.id, quantity - 1)}
                                                className="w-10 h-10 bg-red-500 text-white text-xl rounded-full hover:bg-red-600 transition-colors font-bold flex items-center justify-center"
                                              >
                                                −
                                              </button>
                                              <span className="w-12 text-center font-bold text-xl text-gray-900">{quantity}</span>
                                              <button
                                                onClick={() => handleUpdateQuantity(product.id, quantity + 1)}
                                                className="w-10 h-10 bg-green-500 text-white text-xl rounded-full hover:bg-green-600 transition-colors font-bold flex items-center justify-center"
                                              >
                                                +
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => handleAddToCart(product)}
                                              className="px-6 py-2 bg-green-500 text-white text-lg font-bold rounded-full hover:bg-green-600 transition-colors flex items-center gap-2"
                                            >
                                              <span className="text-xl">+</span>
                                              <span>Add</span>
                                            </button>
                                          )}
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

                      {/* Simple Cart Summary - NOT sticky */}
                      {cart.length > 0 && (
                        <div className="bg-white border-t-2 border-blue-300 pt-4 mt-4">
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-blue-800">
                                🛒 Cart Total ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                              </span>
                              <span className="text-2xl font-bold text-blue-600">${cartTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Confirm Order */}
                  {step === 'confirm' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <div className="text-sm text-blue-600 font-medium">{t.clients?.selectedClient || 'Client'}</div>
                        <div className="font-bold text-gray-900">{selectedClient?.name}</div>
                      </div>

                      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">📋 Review Order</h3>
                        <p className="text-sm text-gray-600">
                          Review and adjust quantities before creating the order
                        </p>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {cart.map((item) => {
                          const itemTotal = item.product.price * item.quantity;
                          
                          return (
                            <div
                              key={item.product.id}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all bg-white"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{item.product.name}</div>
                                  <div className="text-sm text-gray-600">
                                    ${item.product.price.toFixed(2)} per {item.product.unit || 'pcs'}
                                  </div>
                                </div>
                                
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                                    <button
                                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                                      className="w-8 h-8 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-bold text-lg flex items-center justify-center"
                                    >
                                      −
                                    </button>
                                    <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                                    <button
                                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                                      className="w-8 h-8 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors font-bold text-lg flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                  
                                  <div className="text-right min-w-[80px]">
                                    <div className="font-bold text-gray-900">${itemTotal.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Total */}
                      {cart.length > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300 space-y-2">
                          <div className="flex justify-between items-center text-sm text-gray-700">
                            <span>Total Items:</span>
                            <span className="font-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)} pcs</span>
                          </div>
                          <div className="border-t-2 border-green-300 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-900 text-lg">Order Total:</span>
                              <span className="text-3xl font-bold text-green-600">
                                ${cartTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {cart.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">🛒</div>
                          <p>Cart is empty</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t-2 p-6 bg-gray-50 flex gap-3">
              {step === 'products' && (
                <button
                  onClick={() => {
                    setStep('client');
                    setSearchTerm('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  ← {t.common?.back || 'Back'}
                </button>
              )}
              {step === 'products' && cart.length > 0 && (
                <>
                  <button
                    onClick={() => setStep('confirm')}
                    className="px-6 py-3 border-2 border-blue-600 text-blue-700 rounded-lg font-bold hover:bg-blue-50 transition-all duration-200"
                  >
                    {t.deliveries?.reviewOrder || 'Review'} 📋
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold transition-all duration-200 disabled:opacity-50 shadow-lg"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {t.common?.creating || 'Creating...'}
                      </span>
                    ) : (
                      `✓ ${t.deliveries?.createOrder || 'Create Order Now'}`
                    )}
                  </button>
                </>
              )}
              {step === 'confirm' && (
                <>
                  <button
                    onClick={() => setStep('products')}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    ← {t.common?.back || 'Back'}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || cart.length === 0}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {t.common?.creating || 'Creating...'}
                      </span>
                    ) : (
                      `✓ ${t.deliveries?.createOrder || 'Create Order'}`
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        /* Shimmer effect for button */
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        /* Sparkle effect */
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </>
  );
};
