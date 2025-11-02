import React, { useState } from 'react';
import { Delivery, Client, Product } from '../../types';
import { formatDate, formatCurrency } from '../../utils';
import { QuickSettlement } from './QuickSettlement';

interface MobileDeliveryListProps {
  deliveries: Delivery[];
  clients: Client[];
  products: Product[];
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onUpdate: () => void;
}

export const MobileDeliveryList: React.FC<MobileDeliveryListProps> = ({
  deliveries, clients, products, t, showToast, onUpdate
}) => {
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const getClientName = (clientId: string) => 
    clients.find(c => c.id === clientId)?.name || 'Unknown';

  const getDeliveryTotal = (delivery: Delivery): number => 
    delivery.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Settled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateBalance = (delivery: Delivery) => {
    const total = getDeliveryTotal(delivery);
    const returnAmount = (delivery.returnedItems || []).reduce((sum, returnItem) => {
      const deliveryItem = delivery.items.find(di => di.productId === returnItem.productId);
      return sum + (returnItem.quantity * (deliveryItem?.price || 0));
    }, 0);
    const netAmount = total - returnAmount;
    const paidAmount = (delivery.payments || []).reduce((sum, p) => sum + p.amount, 0);
    return netAmount - paidAmount;
  };

  return (
    <div className="space-y-3 pb-20"> {/* Extra padding for FAB */}
      {deliveries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No deliveries found
        </div>
      ) : (
        deliveries.map(delivery => {
          const balance = calculateBalance(delivery);
          const client = clients.find(c => c.id === delivery.clientId);
          
          return (
            <div
              key={delivery.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-gray-900">
                    {delivery.invoiceNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getClientName(delivery.clientId)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(delivery.date)}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(delivery.status)}`}>
                    {delivery.status}
                  </span>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {formatCurrency(getDeliveryTotal(delivery))}
                  </div>
                </div>
              </div>

              {/* Items Preview */}
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">
                  Items ({delivery.items.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {delivery.items.slice(0, 3).map(item => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <span
                        key={item.productId}
                        className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {product?.name} × {item.quantity}
                      </span>
                    );
                  })}
                  {delivery.items.length > 3 && (
                    <span className="inline-block bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
                      +{delivery.items.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Balance Info */}
              {balance > 0 && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <div className="font-medium text-red-800">
                    Outstanding: {formatCurrency(balance)}
                  </div>
                  {delivery.payments && delivery.payments.length > 0 && (
                    <div className="text-red-600 text-xs">
                      Paid: {formatCurrency((delivery.payments || []).reduce((sum, p) => sum + p.amount, 0))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDelivery(delivery)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    delivery.status === 'Pending'
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : balance > 0
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {delivery.status === 'Pending' 
                    ? '📝 Settle Order' 
                    : balance > 0 
                    ? '💰 Collect Payment' 
                    : '✅ View Details'
                  }
                </button>
                
                {/* Quick actions for common scenarios */}
                {delivery.status === 'Pending' && (
                  <button
                    onClick={() => {
                      // Quick complete without returns
                      setSelectedDelivery(delivery);
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                  >
                    🚚
                  </button>
                )}
              </div>

              {/* Client Credit Info */}
              {client && client.creditLimit && (
                <div className="mt-2 text-xs text-gray-500">
                  Credit: {formatCurrency(client.currentBalance || 0)}/{formatCurrency(client.creditLimit)}
                  {client.riskLevel === 'HIGH' && (
                    <span className="ml-2 text-red-600">⚠️ High Risk</span>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Quick Settlement Modal */}
      {selectedDelivery && (
        <QuickSettlement
          delivery={selectedDelivery}
          t={t}
          showToast={showToast}
          onClose={() => setSelectedDelivery(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};