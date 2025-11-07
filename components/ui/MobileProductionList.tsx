import React, { useState } from 'react';
import { ProductionBatch, Product, Material } from '../../types';
import { formatDate, formatCurrency } from '../../utils';

interface MobileProductionListProps {
  batches: ProductionBatch[];
  products: Product[];
  materials: Material[];
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onUpdate: () => void;
}

export const MobileProductionList: React.FC<MobileProductionListProps> = ({
  batches, products, materials, t, showToast, onUpdate
}) => {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const getProductName = (productId: string) => 
    products.find(p => p.id === productId)?.name || 'Unknown Product';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'QUALITY_HOLD': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANNED': return '📅';
      case 'IN_PROGRESS': return '⚡';
      case 'COMPLETED': return '✅';
      case 'QUALITY_HOLD': return '🔍';
      case 'REJECTED': return '❌';
      default: return '📋';
    }
  };

  const calculateProgress = (batch: ProductionBatch) => {
    const statusOrder = ['PLANNED', 'IN_PROGRESS', 'QUALITY_HOLD', 'COMPLETED'];
    const currentIndex = statusOrder.indexOf(batch.batchStatus || 'PLANNED');
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const updateBatchStatus = async (batch: ProductionBatch, newStatus: string) => {
    try {
      const updatedBatch = { ...batch, batchStatus: newStatus as any };
      
      // If completing, update total cost
      if (newStatus === 'COMPLETED' && !batch.totalCost) {
        updatedBatch.totalCost = batch.totalCost || 0;
      }

      // Update production batch
      const existingBatches = JSON.parse(localStorage.getItem('productionBatches') || '[]');
      const batchIndex = existingBatches.findIndex((b: ProductionBatch) => b.id === batch.id);
      
      if (batchIndex !== -1) {
        existingBatches[batchIndex] = updatedBatch;
        localStorage.setItem('productionBatches', JSON.stringify(existingBatches));
        
        // If completed, update inventory
        if (newStatus === 'COMPLETED') {
          const products = JSON.parse(localStorage.getItem('products') || '[]');
          const productIndex = products.findIndex((p: Product) => p.id === batch.productId);
          
          if (productIndex !== -1) {
            products[productIndex].stock += batch.quantity;
            localStorage.setItem('products', JSON.stringify(products));
          }
        }
        
        showToast(`Batch ${newStatus.toLowerCase()} successfully!`, 'success');
        onUpdate();
      }
    } catch (error) {
      showToast('Failed to update batch status', 'error');
    }
  };

  const getNextAction = (batch: ProductionBatch) => {
    switch (batch.batchStatus || 'PLANNED') {
      case 'PLANNED': 
        return { action: 'Start Production', status: 'IN_PROGRESS', color: 'bg-blue-600' };
      case 'IN_PROGRESS': 
        return { action: 'Quality Check', status: 'QUALITY_HOLD', color: 'bg-purple-600' };
      case 'QUALITY_HOLD': 
        return { action: 'Complete Batch', status: 'COMPLETED', color: 'bg-green-600' };
      default: 
        return null;
    }
  };

  return (
    <div className="space-y-3 pb-20"> {/* Extra padding for FAB */}
      {batches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No production batches found
        </div>
      ) : (
        batches.map(batch => {
          const product = products.find(p => p.id === batch.productId);
          const progress = calculateProgress(batch);
          const nextAction = getNextAction(batch);
          const isExpanded = expandedBatch === batch.id;
          
          return (
            <div
              key={batch.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {getProductName(batch.productId)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Batch #{batch.batchNumber}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(batch.startDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(batch.batchStatus || 'PLANNED')}`}>
                      {getStatusIcon(batch.batchStatus || 'PLANNED')} {batch.batchStatus || 'PLANNED'}
                    </span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {batch.quantity} {product?.unit || 'units'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Cost Info */}
                {batch.totalCost && (
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-medium">
                      {formatCurrency(batch.totalCost)}
                    </span>
                  </div>
                )}
                
                {batch.costPerUnit && (
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-600">Cost per Unit:</span>
                    <span className="font-medium">
                      {formatCurrency(batch.costPerUnit)}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {nextAction && (
                    <button
                      onClick={() => updateBatchStatus(batch, nextAction.status)}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm text-white transition-colors hover:opacity-90 ${nextAction.color}`}
                    >
                      {nextAction.action}
                    </button>
                  )}
                  
                  <button
                    onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                  >
                    {isExpanded ? '🔼' : '🔽'}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  {/* Material Usage */}
                  {batch.materialCosts && batch.materialCosts.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Materials Used:</div>
                      <div className="space-y-2">
                        {batch.materialCosts.map(cost => {
                          const material = materials.find(m => m.id === cost.materialId);
                          return (
                            <div key={cost.materialId} className="flex justify-between text-sm">
                              <span className="text-gray-600">{material?.name}</span>
                              <span className="font-medium">
                                {cost.quantity} {material?.unit} - {formatCurrency(cost.cost)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quality Notes */}
                  {batch.notes && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Notes:</div>
                      <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                        {batch.notes}
                      </div>
                    </div>
                  )}
                  
                  {/* Quality Score */}
                  {batch.qualityScore !== undefined && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Quality Score:</div>
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              batch.qualityScore >= 80 ? 'bg-green-500' :
                              batch.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${batch.qualityScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{batch.qualityScore}/100</span>
                      </div>
                    </div>
                  )}

                  {/* Production Details */}
                  {batch.batchStatus === 'COMPLETED' && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Quantity:</div>
                        <div className="font-medium">{batch.quantity} {product?.unit}</div>
                      </div>
                      {batch.laborHours && (
                        <div>
                          <div className="text-gray-600">Labor Hours:</div>
                          <div className="font-medium">{batch.laborHours}h</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Actions for Completed Batches */}
                  {batch.batchStatus === 'COMPLETED' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs text-green-600 text-center">
                        ✅ Batch completed and inventory updated
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};