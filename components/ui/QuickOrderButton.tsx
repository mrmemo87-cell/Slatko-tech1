import React, { useState, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { unifiedWorkflow } from '../../services/unifiedWorkflow';
import { Client, Product } from '../../types';

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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
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
        price: item.product.price,
        unit: item.product.unit || 'pcs'
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
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{ boxShadow: '0 8px 32px rgba(59, 130, 246, 0.5)' }}
      >
        ⚡
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
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                          >
                            <div className="font-semibold text-gray-900">{client.name}</div>
                            {client.businessName && (
                              <div className="text-sm text-gray-600">{client.businessName}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">{client.phone}</div>
                          </button>
                        ))}
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

                      <input
                        type="text"
                        placeholder={t.products?.search || 'Search products...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      />

                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleAddToCart(product)}
                            className="text-left p-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-semibold text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-600">${product.price.toFixed(2)}</div>
                            </div>
                            <div className="text-2xl">+</div>
                          </button>
                        ))}
                      </div>

                      {/* Cart */}
                      {cart.length > 0 && (
                        <div className="border-t-2 pt-4 mt-4">
                          <h3 className="font-bold text-gray-900 mb-3">🛒 {t.deliveries?.cart || 'Cart'}</h3>
                          <div className="space-y-2">
                            {cart.map(item => (
                              <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{item.product.name}</div>
                                  <div className="text-sm text-gray-600">${item.product.price.toFixed(2)} × {item.quantity}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                                    className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                                  <button
                                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                                    className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="ml-4 font-bold text-gray-900 w-20 text-right">
                                  ${(item.product.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">{t.deliveries?.total || 'Total'}</span>
                            <span className="text-2xl font-bold text-blue-600">${cartTotal.toFixed(2)}</span>
                          </div>
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
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
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
      `}</style>
    </>
  );
};
