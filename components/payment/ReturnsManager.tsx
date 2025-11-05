import React, { useState, useEffect } from 'react';
import { paymentService, type OrderReturn, type ReturnLineItem } from '../../services/paymentService';
import { supabaseApi } from '../../services/supabase-api';

interface ReturnsManagerProps {
  deliveryId: string;
  clientId: string;
  clientName: string;
  onReturnsProcessed: (returns: OrderReturn[]) => void;
  onClose: () => void;
}

interface DeliveryItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export const ReturnsManager: React.FC<ReturnsManagerProps> = ({
  deliveryId,
  clientId,
  clientName,
  onReturnsProcessed,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [orderItems, setOrderItems] = useState<DeliveryItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnLineItem[]>([]);
  const [returnType, setReturnType] = useState<OrderReturn['return_type']>('unsold_return');
  const [notes, setNotes] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPreviousOrders();
  }, [clientId]);

  const loadPreviousOrders = async () => {
    try {
      setLoading(true);
      
      // Get unpaid orders for this client (these could have returns)
      const unpaidOrders = await paymentService.getClientUnpaidOrders(clientId);
      
      // Filter out the current delivery
      const previousOrders = unpaidOrders.filter(o => o.delivery_id !== deliveryId);
      
      setPreviousOrders(previousOrders);
      
      if (previousOrders.length > 0) {
        setSelectedOrder(previousOrders[0].delivery_id);
        await loadOrderItems(previousOrders[0].delivery_id);
      }
      
    } catch (error) {
      console.error('Error loading previous orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    try {
      // Load actual delivery items from database
      const deliveries = await supabaseApi.getDeliveries(1000);
      const delivery = deliveries.find(d => d.id === orderId);
      
      if (delivery && delivery.items) {
        const items: DeliveryItem[] = delivery.items.map((item, index) => ({
          id: item.productId || `item-${index}`,
          product_name: item.productName || '',
          quantity: item.quantity,
          price: item.price
        }));
        setOrderItems(items);
      } else {
        setOrderItems([]);
      }
      
    } catch (error) {
      console.error('Error loading order items:', error);
      setOrderItems([]);
    }
  };

  const handleOrderSelection = async (orderId: string) => {
    setSelectedOrder(orderId);
    setReturnItems([]); // Clear existing return items
    await loadOrderItems(orderId);
  };

  const addReturnItem = (item: DeliveryItem) => {
    const existingReturn = returnItems.find(r => r.product_name === item.product_name);
    
    if (existingReturn) {
      // Increase quantity if not exceeding original quantity
      if (existingReturn.quantity_returned < item.quantity) {
        setReturnItems(returnItems.map(r => 
          r.product_name === item.product_name 
            ? { ...r, quantity_returned: r.quantity_returned + 1, total_credit_amount: (r.quantity_returned + 1) * r.unit_price }
            : r
        ));
      }
    } else {
      // Add new return item
      setReturnItems([...returnItems, {
        product_name: item.product_name,
        quantity_returned: 1,
        unit_price: item.price,
        total_credit_amount: item.price,
        condition: 'good',
        restockable: true
      }]);
    }
  };

  const updateReturnItem = (productName: string, field: keyof ReturnLineItem, value: any) => {
    setReturnItems(returnItems.map(item => 
      item.product_name === productName 
        ? { 
            ...item, 
            [field]: value,
            total_credit_amount: field === 'quantity_returned' || field === 'unit_price' 
              ? (field === 'quantity_returned' ? value : item.quantity_returned) * (field === 'unit_price' ? value : item.unit_price)
              : item.total_credit_amount
          }
        : item
    ));
  };

  const removeReturnItem = (productName: string) => {
    setReturnItems(returnItems.filter(item => item.product_name !== productName));
  };

  const getTotalCredit = () => {
    return returnItems.reduce((sum, item) => sum + item.total_credit_amount, 0);
  };

  const handleProcessReturns = async () => {
    if (returnItems.length === 0) {
      alert('Please add at least one item to return');
      return;
    }

    try {
      setProcessing(true);

      const returnData = {
        original_delivery_id: selectedOrder,
        return_delivery_id: deliveryId, // Current delivery where returns are processed
        client_id: clientId,
        return_type: returnType,
        items: returnItems,
        notes: notes || `Returns processed during delivery ${deliveryId}`
      };

      const processedReturn = await paymentService.processReturn(returnData);
      
      onReturnsProcessed([processedReturn]);
      
    } catch (error) {
      console.error('Error processing returns:', error);
      alert('Error processing returns. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="returns-manager-modal">
        <div className="returns-manager-content">
          <div className="loading">Loading previous orders...</div>
        </div>
      </div>
    );
  }

  if (previousOrders.length === 0) {
    return (
      <div className="returns-manager-modal">
        <div className="returns-manager-content">
          <div className="header">
            <h3>Process Returns - {clientName}</h3>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div className="empty-state">
            <p>✅ No previous orders available for returns.</p>
            <p>This client has no unpaid orders that could have returnable items.</p>
            <button onClick={onClose} className="btn-primary">Continue</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="returns-manager-modal">
      <div className="returns-manager-content">
        <div className="header">
          <h3>Process Returns - {clientName}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="returns-form">
          {/* Order Selection */}
          <div className="form-section">
            <h4>Select Order to Return Items From</h4>
            <select 
              value={selectedOrder} 
              onChange={(e) => handleOrderSelection(e.target.value)}
              className="order-select"
            >
              {previousOrders.map(order => (
                <option key={order.delivery_id} value={order.delivery_id}>
                  Order #{order.delivery_id.slice(-8)} - {paymentService.formatCurrency(order.order_total)} 
                  ({order.payment_status})
                </option>
              ))}
            </select>
          </div>

          {/* Return Type */}
          <div className="form-section">
            <h4>Return Reason</h4>
            <div className="return-type-options">
              <label>
                <input
                  type="radio"
                  value="unsold_return"
                  checked={returnType === 'unsold_return'}
                  onChange={(e) => setReturnType(e.target.value as OrderReturn['return_type'])}
                />
                Unsold Items
              </label>
              <label>
                <input
                  type="radio"
                  value="quality_issue"
                  checked={returnType === 'quality_issue'}
                  onChange={(e) => setReturnType(e.target.value as OrderReturn['return_type'])}
                />
                Quality Issue
              </label>
              <label>
                <input
                  type="radio"
                  value="wrong_item"
                  checked={returnType === 'wrong_item'}
                  onChange={(e) => setReturnType(e.target.value as OrderReturn['return_type'])}
                />
                Wrong Item
              </label>
              <label>
                <input
                  type="radio"
                  value="customer_request"
                  checked={returnType === 'customer_request'}
                  onChange={(e) => setReturnType(e.target.value as OrderReturn['return_type'])}
                />
                Customer Request
              </label>
            </div>
          </div>

          {/* Available Items */}
          <div className="form-section">
            <h4>Available Items to Return</h4>
            <div className="items-grid">
              {orderItems.map(item => (
                <div key={item.id} className="item-card">
                  <div className="item-info">
                    <div className="item-name">{item.product_name}</div>
                    <div className="item-details">
                      Qty: {item.quantity} | Price: {paymentService.formatCurrency(item.price)}
                    </div>
                  </div>
                  <button 
                    onClick={() => addReturnItem(item)}
                    className="btn-add-return"
                    disabled={returnItems.some(r => r.product_name === item.product_name && r.quantity_returned >= item.quantity)}
                  >
                    + Add Return
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Return Items */}
          {returnItems.length > 0 && (
            <div className="form-section">
              <h4>Items Being Returned</h4>
              <div className="return-items-list">
                {returnItems.map(item => (
                  <div key={item.product_name} className="return-item">
                    <div className="return-item-header">
                      <span className="product-name">{item.product_name}</span>
                      <button onClick={() => removeReturnItem(item.product_name)} className="remove-btn">×</button>
                    </div>
                    <div className="return-item-details">
                      <div className="field">
                        <label>Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max={orderItems.find(oi => oi.product_name === item.product_name)?.quantity || 1}
                          value={item.quantity_returned}
                          onChange={(e) => updateReturnItem(item.product_name, 'quantity_returned', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="field">
                        <label>Unit Price:</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateReturnItem(item.product_name, 'unit_price', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="field">
                        <label>Condition:</label>
                        <select
                          value={item.condition}
                          onChange={(e) => updateReturnItem(item.product_name, 'condition', e.target.value)}
                        >
                          <option value="good">Good</option>
                          <option value="damaged">Damaged</option>
                          <option value="expired">Expired</option>
                          <option value="unsellable">Unsellable</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>
                          <input
                            type="checkbox"
                            checked={item.restockable}
                            onChange={(e) => updateReturnItem(item.product_name, 'restockable', e.target.checked)}
                          />
                          Can restock?
                        </label>
                      </div>
                      <div className="credit-amount">
                        Credit: {paymentService.formatCurrency(item.total_credit_amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="total-credit">
                <strong>Total Credit: {paymentService.formatCurrency(getTotalCredit())}</strong>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-section">
            <h4>Notes (Optional)</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the returns..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="actions">
            <button 
              onClick={handleProcessReturns}
              className="btn-primary"
              disabled={processing || returnItems.length === 0}
            >
              {processing ? 'Processing...' : `Process Returns (${paymentService.formatCurrency(getTotalCredit())} credit)`}
            </button>
            <button onClick={onClose} className="btn-secondary" disabled={processing}>
              Skip Returns
            </button>
          </div>
        </div>

        <style jsx>{`
          .returns-manager-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
            padding: 20px;
          }

          .returns-manager-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 800px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .header {
            padding: 20px 24px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
          }

          .header h3 {
            margin: 0;
            color: #333;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .returns-form {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
          }

          .form-section {
            margin-bottom: 24px;
          }

          .form-section h4 {
            margin: 0 0 12px 0;
            color: #333;
            font-size: 16px;
          }

          .order-select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }

          .return-type-options {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
          }

          .return-type-options label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }

          .items-grid {
            display: grid;
            gap: 12px;
          }

          .item-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: #f9f9f9;
          }

          .item-info .item-name {
            font-weight: 500;
            color: #333;
          }

          .item-info .item-details {
            font-size: 12px;
            color: #666;
          }

          .btn-add-return {
            padding: 6px 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          }

          .btn-add-return:disabled {
            background: #6c757d;
            cursor: not-allowed;
          }

          .return-items-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .return-item {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 16px;
            background: #f8f9fa;
          }

          .return-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .product-name {
            font-weight: 500;
            color: #333;
          }

          .remove-btn {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .return-item-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            align-items: center;
          }

          .field {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .field label {
            font-size: 12px;
            font-weight: 500;
            color: #666;
          }

          .field input, .field select {
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }

          .field input[type="checkbox"] {
            width: auto;
          }

          .credit-amount {
            font-weight: bold;
            color: #28a745;
            text-align: center;
          }

          .total-credit {
            margin-top: 16px;
            padding: 12px;
            background: #e8f5e8;
            border-radius: 6px;
            text-align: center;
            color: #2d5a2d;
          }

          textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            resize: vertical;
          }

          .actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
          }

          .btn-primary, .btn-secondary {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }

          .btn-primary {
            background: #28a745;
            color: white;
          }

          .btn-primary:disabled {
            background: #6c757d;
            cursor: not-allowed;
          }

          .btn-secondary {
            background: #6c757d;
            color: white;
          }

          .empty-state {
            text-align: center;
            padding: 40px;
          }

          .loading {
            text-align: center;
            padding: 40px;
            color: #666;
          }

          @media (max-width: 768px) {
            .returns-manager-content {
              margin: 10px;
              max-width: none;
            }

            .return-item-details {
              grid-template-columns: 1fr;
            }

            .actions {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </div>
  );
};