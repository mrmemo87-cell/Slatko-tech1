import React from 'react';
import { WorkflowOrder, unifiedWorkflow } from '../../services/unifiedWorkflow';
import { formatCurrency } from '../../utils';

interface UnifiedOrderCardProps {
  order: WorkflowOrder;
  actions?: Array<{
    label: string;
    onClick: (orderId: string) => void;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
    icon?: string;
  }>;
  showDetails?: 'minimal' | 'standard' | 'full';
  className?: string;
}

export const UnifiedOrderCard: React.FC<UnifiedOrderCardProps> = ({ 
  order, 
  actions = [], 
  showDetails = 'standard',
  className = ''
}) => {
  const stageInfo = unifiedWorkflow.getStageInfo(order.workflowStage);
  
  const getActionButtonClass = (variant: string = 'primary') => {
    const baseClass = 'px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center';
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
      success: 'bg-green-600 text-white hover:bg-green-700',
      danger: 'bg-red-600 text-white hover:bg-red-700'
    };
    return `${baseClass} ${variants[variant as keyof typeof variants] || variants.primary}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border-l-4 ${stageInfo.color.replace('bg-', 'border-').replace('-100', '-500')} p-6 hover:shadow-lg transition-shadow ${className}`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Order #{order.invoiceNumber}
          </h3>
          <p className="text-sm text-gray-600">
            {stageInfo.description}
          </p>
        </div>
        <div className="flex gap-2 items-start">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${stageInfo.color}`}>
            {stageInfo.icon} {stageInfo.label}
          </span>
          {/* Payment Status Badge */}
          {order.workflowStage === 'completed' && order.status === 'Pending' && (
            <span className="px-3 py-1 text-sm font-bold rounded-full bg-red-600 text-white animate-pulse">
              💰 UNPAID
            </span>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="space-y-3">
        
        {/* Client Info */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Client:</span>
          <span className="font-medium">{order.clientName}</span>
        </div>
        
        {/* Date */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Order Date:</span>
          <span className="font-medium">{new Date(order.date).toLocaleDateString()}</span>
        </div>

        {/* Products */}
        {showDetails !== 'minimal' && (
          <div className="space-y-2">
            <span className="text-gray-600 text-sm">Products:</span>
            <div className="bg-gray-50 rounded p-3 space-y-1 max-h-32 overflow-y-auto">
              {order.items && order.items.length > 0 ? order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-gray-600">{item.quantity} pcs</span>
                </div>
              )) : (
                <span className="text-sm text-gray-500">No items loaded</span>
              )}
            </div>
          </div>
        )}

        {/* Total Value */}
        {showDetails === 'full' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Value:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(order.totalValue)}
            </span>
          </div>
        )}

        {/* Production Notes */}
        {order.productionNotes && showDetails !== 'minimal' && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-900">Production Notes:</h4>
            <p className="text-sm text-gray-600 mt-1">{order.productionNotes}</p>
          </div>
        )}

        {/* Delivery Notes */}
        {order.deliveryNotes && showDetails !== 'minimal' && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-900">Delivery Notes:</h4>
            <p className="text-sm text-gray-600 mt-1">{order.deliveryNotes}</p>
          </div>
        )}

        {/* Assigned Driver */}
        {order.assignedDriver && showDetails !== 'minimal' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Assigned Driver:</span>
            <span className="font-medium">{order.assignedDriver}</span>
          </div>
        )}

        {/* Timing Information */}
        {showDetails === 'full' && (
          <div className="border-t pt-3 space-y-1">
            <h4 className="text-sm font-medium text-gray-900">Timeline:</h4>
            {order.productionStartTime && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>Production Started:</span>
                <span>{new Date(order.productionStartTime).toLocaleString()}</span>
              </div>
            )}
            {order.productionCompletedTime && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>Production Completed:</span>
                <span>{new Date(order.productionCompletedTime).toLocaleString()}</span>
              </div>
            )}
            {order.deliveryStartTime && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>Pickup Time:</span>
                <span>{new Date(order.deliveryStartTime).toLocaleString()}</span>
              </div>
            )}
            {order.deliveryCompletedTime && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>Delivered:</span>
                <span>{new Date(order.deliveryCompletedTime).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {actions.length > 0 && (
        <div className="mt-4 space-y-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => action.onClick(order.id)}
              className={`w-full ${getActionButtonClass(action.variant)}`}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};