import React, { useState, useEffect } from 'react';
import { Delivery, Client, Product, ReturnItem, Payment } from '../../types';
import { supabaseApi } from '../../services/supabase-api';
import { formatCurrency, formatDate, generateId, todayISO } from '../../utils';

interface QuickSettlementProps {
  delivery: Delivery;
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
  onUpdate: () => void;
}

export const QuickSettlement: React.FC<QuickSettlementProps> = ({ 
  delivery, t, showToast, onClose, onUpdate 
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>(delivery.returnedItems || []);
  const [newPayment, setNewPayment] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
      setClients(clientsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };
  const [step, setStep] = useState<'overview' | 'returns' | 'payment'>('overview');

  const client = clients.find(c => c.id === delivery.clientId);
  
  // Calculate totals
  const totalAmount = delivery.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const returnAmount = returns.reduce((sum, returnItem) => {
    const deliveryItem = delivery.items.find(di => di.productId === returnItem.productId);
    return sum + (returnItem.quantity * (deliveryItem?.price || 0));
  }, 0);
  const netAmount = totalAmount - returnAmount;
  const paidAmount = (delivery.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = netAmount - paidAmount;

  const handleReturnChange = (productId: string, quantity: number) => {
    const maxQuantity = delivery.items.find(item => item.productId === productId)?.quantity || 0;
    const clampedQuantity = Math.max(0, Math.min(quantity, maxQuantity));
    
    setReturns(prev => {
      const existing = prev.find(r => r.productId === productId);
      if (existing) {
        if (clampedQuantity === 0) {
          return prev.filter(r => r.productId !== productId);
        }
        return prev.map(r => r.productId === productId ? { ...r, quantity: clampedQuantity } : r);
      } else if (clampedQuantity > 0) {
        return [...prev, { productId, quantity: clampedQuantity }];
      }
      return prev;
    });
  };

  const handleSaveReturns = () => {
    const deliveries = api.getDeliveries();
    const updatedDeliveries = deliveries.map(d => 
      d.id === delivery.id 
        ? { ...d, returnedItems: returns, returnDate: new Date().toISOString() }
        : d
    );
    api.saveDeliveries(updatedDeliveries);
    onUpdate();
    showToast('Returns recorded successfully');
    setStep('payment');
  };

  const handleAddPayment = () => {
    if (newPayment <= 0 || newPayment > balanceDue) return;
    
    const payment: Payment = {
      id: generateId(),
      date: new Date().toISOString(),
      amount: newPayment
    };
    
    const updatedPayments = [...(delivery.payments || []), payment];
    const newBalanceDue = balanceDue - newPayment;
    const newStatus: 'Paid' | 'Settled' = newBalanceDue <= 0 ? 'Paid' : 'Settled';
    
    const deliveries = api.getDeliveries();
    const updatedDeliveries = deliveries.map(d => 
      d.id === delivery.id 
        ? { ...d, payments: updatedPayments, status: newStatus }
        : d
    );
    
    api.saveDeliveries(updatedDeliveries);
    onUpdate();
    showToast(`Payment of ${formatCurrency(newPayment)} recorded`);
    onClose();
  };

  const OverviewStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="font-medium text-lg">{client?.name}</div>
        <div className="text-sm text-gray-600">{client?.businessName}</div>
        <div className="text-sm text-gray-500">Invoice: {delivery.invoiceNumber}</div>
        <div className="text-sm text-gray-500">Date: {formatDate(delivery.date)}</div>
      </div>

      {/* Order Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium mb-3">Order Items</h4>
        <div className="space-y-2">
          {delivery.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const returned = returns.find(r => r.productId === item.productId)?.quantity || 0;
            return (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>{product?.name} × {item.quantity}</span>
                <span>{formatCurrency(item.quantity * item.price)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white border rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <span>Order Total:</span>
          <span className="font-medium">{formatCurrency(totalAmount)}</span>
        </div>
        {returnAmount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Returns:</span>
            <span>-{formatCurrency(returnAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium text-lg border-t pt-2">
          <span>Net Amount:</span>
          <span>{formatCurrency(netAmount)}</span>
        </div>
        {paidAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Paid:</span>
            <span>{formatCurrency(paidAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xl border-t pt-2">
          <span>Balance Due:</span>
          <span className={balanceDue > 0 ? 'text-red-600' : 'text-green-600'}>
            {formatCurrency(balanceDue)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => setStep('returns')}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium"
        >
          📦 Process Returns
        </button>
        <button
          onClick={() => setStep('payment')}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium"
          disabled={balanceDue <= 0}
        >
          💰 Record Payment
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );

  const ReturnsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setStep('overview')}
          className="text-blue-600 text-sm"
        >
          ← Back
        </button>
        <h3 className="text-lg font-semibold">Process Returns</h3>
        <div></div>
      </div>

      <div className="space-y-3">
        {delivery.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          const returnQuantity = returns.find(r => r.productId === item.productId)?.quantity || 0;
          
          return (
            <div key={item.productId} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium">{product?.name}</h4>
                  <p className="text-sm text-gray-500">
                    Delivered: {item.quantity} | Price: {formatCurrency(item.price)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Return Quantity:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleReturnChange(item.productId, returnQuantity - 1)}
                    className="w-8 h-8 bg-red-100 text-red-600 rounded-full"
                    disabled={returnQuantity === 0}
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-medium">{returnQuantity}</span>
                  <button
                    onClick={() => handleReturnChange(item.productId, returnQuantity + 1)}
                    className="w-8 h-8 bg-green-100 text-green-600 rounded-full"
                    disabled={returnQuantity >= item.quantity}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {returnQuantity > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  Refund: {formatCurrency(returnQuantity * item.price)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {returnAmount > 0 && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-center font-medium text-red-800">
            Total Refund: {formatCurrency(returnAmount)}
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('overview')}
          className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveReturns}
          className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium"
        >
          Save Returns
        </button>
      </div>
    </div>
  );

  const PaymentStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setStep('overview')}
          className="text-blue-600 text-sm"
        >
          ← Back
        </button>
        <h3 className="text-lg font-semibold">Record Payment</h3>
        <div></div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <div className="text-2xl font-bold text-blue-800">
          Balance Due: {formatCurrency(balanceDue)}
        </div>
      </div>

      {/* Quick payment amounts */}
      <div className="grid grid-cols-3 gap-2">
        {[
          Math.round(balanceDue * 0.25),
          Math.round(balanceDue * 0.5),
          balanceDue
        ].filter(amount => amount > 0).map(amount => (
          <button
            key={amount}
            onClick={() => setNewPayment(amount)}
            className={`py-2 px-2 rounded text-sm font-medium ${
              newPayment === amount
                ? 'bg-green-600 text-white'
                : 'bg-white border-2 border-gray-200 hover:border-green-300'
            }`}
          >
            {amount === balanceDue ? 'Full' : formatCurrency(amount)}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Amount
        </label>
        <input
          type="number"
          min="0"
          max={balanceDue}
          step="0.01"
          value={newPayment || ''}
          onChange={(e) => setNewPayment(parseFloat(e.target.value) || 0)}
          className="w-full p-3 border-2 border-gray-200 rounded-lg text-lg text-center"
          placeholder="0.00"
        />
      </div>

      {(delivery.payments || []).length > 0 && (
        <div className="bg-white border rounded-lg p-3">
          <h4 className="font-medium mb-2">Previous Payments:</h4>
          {delivery.payments?.map(payment => (
            <div key={payment.id} className="flex justify-between text-sm">
              <span>{formatDate(payment.date)}</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('overview')}
          className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleAddPayment}
          disabled={newPayment <= 0 || newPayment > balanceDue}
          className={`flex-1 py-3 rounded-lg font-medium ${
            newPayment > 0 && newPayment <= balanceDue
              ? 'bg-green-600 text-white'
              : 'bg-gray-300 text-gray-500'
          }`}
        >
          Record Payment
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-gray-100 w-full max-w-md h-[90vh] rounded-t-2xl p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settlement</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {step === 'overview' && <OverviewStep />}
        {step === 'returns' && <ReturnsStep />}
        {step === 'payment' && <PaymentStep />}
      </div>
    </div>
  );
};