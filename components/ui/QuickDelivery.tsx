import React, { useState, useEffect } from 'react';
import { Client, Product, DeliveryItem } from '../../types';
import { api } from '../../services/api';
import { generateId, todayISO, formatCurrency } from '../../utils';

interface QuickDeliveryProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
}

// Preset quantities for quick selection
const QUICK_QUANTITIES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24];

export const QuickDelivery: React.FC<QuickDeliveryProps> = ({ t, showToast, onClose }) => {
  const [clients] = useState<Client[]>(api.getClients());
  const [products] = useState<Product[]>(api.getProducts());
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<DeliveryItem[]>([]);
  const [step, setStep] = useState<'client' | 'products' | 'review'>('client');

  // Quick client selection with large touch targets
  const ClientSelector = () => (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4 text-center">Select Client</h3>
      <div className="space-y-2">
        {clients.map(client => (
          <button
            key={client.id}
            onClick={() => {
              setSelectedClient(client);
              setStep('products');
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">{client.name}</div>
            <div className="text-sm text-gray-500">{client.businessName}</div>
            <div className="text-xs text-gray-400">{client.phone}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // Product selection with quantity buttons
  const ProductSelector = () => {
    const inventory = api.getInventory();
    
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
          {products.map(product => {
            const available = inventory[product.id] || 0;
            const price = selectedClient?.customPrices.find(cp => cp.productId === product.id)?.price || product.defaultPrice;
            const inCart = cart.find(item => item.productId === product.id)?.quantity || 0;
            
            return (
              <div key={product.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-500">{formatCurrency(price)}/{product.unit}</p>
                    <p className="text-xs text-gray-400">
                      Available: {available} | In cart: {inCart}
                    </p>
                  </div>
                </div>
                
                {/* Quick quantity buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_QUANTITIES.filter(q => q <= available - inCart && q > 0).slice(0, 8).map(quantity => (
                    <button
                      key={quantity}
                      onClick={() => addToCart(product, quantity)}
                      className="bg-blue-600 text-white py-2 px-2 rounded text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
                      disabled={available - inCart < quantity}
                    >
                      +{quantity}
                    </button>
                  ))}
                </div>
                
                {available - inCart === 0 && (
                  <p className="text-red-500 text-xs mt-2">Out of stock</p>
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
    const total = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    const handleSubmit = () => {
      if (!selectedClient || cart.length === 0) return;
      
      const delivery = {
        invoiceNumber: `SL-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        clientId: selectedClient.id,
        items: cart,
        status: 'Pending' as const,
        notes: `Quick order - ${new Date().toLocaleTimeString()}`
      };
      
      const deliveries = api.getDeliveries();
      api.saveDeliveries([{ ...delivery, id: generateId() }, ...deliveries]);
      
      showToast(`Order created for ${selectedClient.name} - ${formatCurrency(total)}`);
      onClose();
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
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium"
            disabled={cart.length === 0}
          >
            Create Order
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

        {step === 'client' && <ClientSelector />}
        {step === 'products' && <ProductSelector />}
        {step === 'review' && <ReviewOrder />}
      </div>
    </div>
  );
};