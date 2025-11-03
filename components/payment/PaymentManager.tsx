import React, { useState, useEffect } from 'react';
import { paymentService, type OrderPaymentRecord, type ClientBalance, type OrderReturn } from '../../services/paymentService';
import { ReturnsManager } from './ReturnsManager';

interface PaymentManagerProps {
  deliveryId: string;
  clientId: string;
  clientName: string;
  driverId?: string;
  onPaymentComplete: (settlementId: string) => void;
  onCancel: () => void;
}

interface PaymentCollectionInfo {
  shouldCollect: boolean;
  ordersToCollect: OrderPaymentRecord[];
  totalAmount: number;
  reason: string;
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({
  deliveryId,
  clientId,
  clientName,
  driverId,
  onPaymentComplete,
  onCancel
}) => {
  const [loading, setLoading] = useState(true);
  const [collectionInfo, setCollectionInfo] = useState<PaymentCollectionInfo | null>(null);
  const [clientBalance, setClientBalance] = useState<ClientBalance | null>(null);
  
  // Payment form state
  const [paymentType, setPaymentType] = useState<'full_payment' | 'partial_payment' | 'no_payment' | 'debt_only'>('full_payment');
  const [amountCollected, setAmountCollected] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  
  // Returns management state
  const [showReturnsManager, setShowReturnsManager] = useState(false);
  const [processedReturns, setProcessedReturns] = useState<OrderReturn[]>([]);

  useEffect(() => {
    loadPaymentInfo();
  }, [deliveryId, clientId]);

  const loadPaymentInfo = async () => {
    try {
      setLoading(true);
      
      const [paymentInfo, balance] = await Promise.all([
        paymentService.shouldCollectPaymentForDelivery(deliveryId, clientId),
        paymentService.getClientBalance(clientId)
      ]);

      setCollectionInfo(paymentInfo);
      setClientBalance(balance);
      
      // Set default amount to total collectible
      if (paymentInfo.shouldCollect && paymentInfo.totalAmount > 0) {
        setAmountCollected(paymentInfo.totalAmount.toString());
      }
      
    } catch (error) {
      console.error('Error loading payment info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentTypeChange = (type: typeof paymentType) => {
    setPaymentType(type);
    
    if (type === 'full_payment' && collectionInfo?.totalAmount) {
      setAmountCollected(collectionInfo.totalAmount.toString());
    } else if (type === 'no_payment' || type === 'debt_only') {
      setAmountCollected('0');
    } else if (type === 'partial_payment') {
      setAmountCollected('');
    }
  };

  const handleSubmit = async () => {
    if (!collectionInfo) return;

    try {
      setProcessing(true);

      const settlementOptions = {
        delivery_id: deliveryId,
        client_id: clientId,
        driver_id: driverId,
        payment_type: paymentType,
        amount_collected: parseFloat(amountCollected) || 0,
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        orders_being_paid: collectionInfo.ordersToCollect.map(o => o.delivery_id),
        returns: processedReturns,
        notes: notes || undefined
      };

      const settlement = await paymentService.createSettlementSession(settlementOptions);

      // If no payment was collected, create debt records for unpaid orders
      if (paymentType === 'no_payment' || paymentType === 'debt_only') {
        for (const order of collectionInfo.ordersToCollect) {
          if (order.amount_remaining > 0) {
            await paymentService.createDebtForUnpaidOrder(
              order.delivery_id,
              `Settlement ${settlement.id} - payment deferred`
            );
          }
        }
      }

      onPaymentComplete(settlement.id);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-manager">
        <div className="payment-header">
          <h3>Processing Settlement...</h3>
        </div>
        <div className="loading-spinner">Loading payment information...</div>
      </div>
    );
  }

  if (!collectionInfo) {
    return (
      <div className="payment-manager">
        <div className="payment-header">
          <h3>Settlement Error</h3>
        </div>
        <p>Could not load payment information. Please try again.</p>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    );
  }

  const maxAmount = collectionInfo.totalAmount;
  const parsedAmount = parseFloat(amountCollected) || 0;

  return (
    <div className="payment-manager">
      <div className="payment-header">
        <h3>Settlement - {clientName}</h3>
        <button onClick={onCancel} className="close-btn">×</button>
      </div>

      {/* Client Balance Overview */}
      {clientBalance && (
        <div className="client-balance-overview">
          <h4>Client Account Status</h4>
          <div className="balance-grid">
            <div className="balance-item">
              <span className="label">Current Balance:</span>
              <span className={`value ${clientBalance.current_balance < 0 ? 'debt' : 'credit'}`}>
                {paymentService.formatCurrency(clientBalance.current_balance)}
              </span>
            </div>
            <div className="balance-item">
              <span className="label">Total Debt:</span>
              <span className="value debt">{paymentService.formatCurrency(clientBalance.total_debt)}</span>
            </div>
            <div className="balance-item">
              <span className="label">Total Credit:</span>
              <span className="value credit">{paymentService.formatCurrency(clientBalance.total_credit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Collection Information */}
      <div className="collection-info">
        <h4>Payment Collection</h4>
        <p className="collection-reason">{collectionInfo.reason}</p>
        
        {collectionInfo.shouldCollect && collectionInfo.ordersToCollect.length > 0 && (
          <div className="orders-to-collect">
            <h5>Orders Available for Collection:</h5>
            <div className="order-list">
              {collectionInfo.ordersToCollect.map(order => (
                <div key={order.delivery_id} className="order-item">
                  <span className="order-id">Order: {order.delivery_id.slice(-8)}</span>
                  <span className="order-total">Total: {paymentService.formatCurrency(order.order_total)}</span>
                  <span className="order-paid">Paid: {paymentService.formatCurrency(order.amount_paid)}</span>
                  <span className="order-remaining">Due: {paymentService.formatCurrency(order.amount_remaining)}</span>
                  <span className={`order-status ${order.payment_status}`}>{order.payment_status}</span>
                </div>
              ))}
            </div>
            <div className="total-collectible">
              <strong>Total Collectible: {paymentService.formatCurrency(collectionInfo.totalAmount)}</strong>
            </div>
          </div>
        )}
        
        {!collectionInfo.shouldCollect && (
          <div className="no-collection">
            <p>✅ No payment collection required for this delivery.</p>
            <button onClick={() => handleSubmit()} className="btn-primary" disabled={processing}>
              {processing ? 'Processing...' : 'Complete Settlement'}
            </button>
            <button onClick={onCancel} className="btn-secondary">Cancel</button>
          </div>
        )}
      </div>

      {/* Returns Management */}
      <div className="returns-section">
        <h4>Returns & Exchanges</h4>
        <p className="returns-explanation">
          If the client is returning unsold items from previous orders, process returns first to adjust payment amounts.
        </p>
        
        {processedReturns.length > 0 && (
          <div className="processed-returns">
            <h5>Processed Returns:</h5>
            {processedReturns.map(returnRecord => (
              <div key={returnRecord.id} className="return-summary">
                <div className="return-header">
                  <span>Order #{returnRecord.original_delivery_id.slice(-8)}</span>
                  <span className="return-credit">
                    Credit: {paymentService.formatCurrency(
                      returnRecord.items.reduce((sum, item) => sum + item.total_credit_amount, 0)
                    )}
                  </span>
                </div>
                <div className="return-items">
                  {returnRecord.items.map((item, idx) => (
                    <span key={idx} className="return-item">
                      {item.product_name} ({item.quantity_returned}x)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="returns-actions">
          <button 
            onClick={() => setShowReturnsManager(true)}
            className="btn-returns"
            disabled={processing}
          >
            {processedReturns.length > 0 ? '📝 Add More Returns' : '🔄 Process Returns'}
          </button>
          
          {processedReturns.length > 0 && (
            <span className="returns-note">
              Returns will reduce payment amounts automatically
            </span>
          )}
        </div>
      </div>

      {/* Payment Form */}
      {collectionInfo.shouldCollect && (
        <div className="payment-form">
          <h4>Payment Collection</h4>
          
          {/* Payment Type Selection */}
          <div className="payment-type-selection">
            <label>
              <input
                type="radio"
                value="full_payment"
                checked={paymentType === 'full_payment'}
                onChange={(e) => handlePaymentTypeChange(e.target.value as typeof paymentType)}
              />
              Full Payment ({paymentService.formatCurrency(maxAmount)})
            </label>
            
            <label>
              <input
                type="radio"
                value="partial_payment"
                checked={paymentType === 'partial_payment'}
                onChange={(e) => handlePaymentTypeChange(e.target.value as typeof paymentType)}
              />
              Partial Payment
            </label>
            
            <label>
              <input
                type="radio"
                value="no_payment"
                checked={paymentType === 'no_payment'}
                onChange={(e) => handlePaymentTypeChange(e.target.value as typeof paymentType)}
              />
              No Payment (Add to Debt)
            </label>
            
            <label>
              <input
                type="radio"
                value="debt_only"
                checked={paymentType === 'debt_only'}
                onChange={(e) => handlePaymentTypeChange(e.target.value as typeof paymentType)}
              />
              Skip Payment (Keep as Debt)
            </label>
          </div>

          {/* Amount Input */}
          {(paymentType === 'full_payment' || paymentType === 'partial_payment') && (
            <div className="payment-details">
              <div className="form-group">
                <label>Amount Collected:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount}
                  value={amountCollected}
                  onChange={(e) => setAmountCollected(e.target.value)}
                  placeholder="Enter amount"
                />
                {parsedAmount > maxAmount && (
                  <span className="warning">⚠️ Amount exceeds total due. Excess will become client credit.</span>
                )}
              </div>

              <div className="form-group">
                <label>Payment Method:</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="mobile_payment">Mobile Payment</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reference Number (optional):</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, Check #, etc."
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label>Notes (optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this settlement..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="payment-actions">
            <button 
              onClick={handleSubmit} 
              className="btn-primary"
              disabled={processing || (paymentType === 'partial_payment' && !amountCollected)}
            >
              {processing ? 'Processing...' : 'Complete Settlement'}
            </button>
            <button onClick={onCancel} className="btn-secondary" disabled={processing}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .payment-manager {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          margin: 20px auto;
          overflow: hidden;
        }

        .payment-header {
          background: #f8f9fa;
          padding: 16px 20px;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-header h3 {
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

        .client-balance-overview {
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .client-balance-overview h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .balance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .balance-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .balance-item .label {
          font-weight: 500;
          color: #666;
        }

        .balance-item .value {
          font-weight: bold;
        }

        .balance-item .value.debt {
          color: #dc3545;
        }

        .balance-item .value.credit {
          color: #28a745;
        }

        .collection-info {
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .collection-info h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .collection-reason {
          margin: 0 0 16px 0;
          color: #666;
          font-style: italic;
        }

        .orders-to-collect h5 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .order-list {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }

        .order-item {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr auto;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
          font-size: 13px;
          align-items: center;
        }

        .order-item:last-child {
          border-bottom: none;
        }

        .order-status {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .order-status.unpaid {
          background: #ffeaa7;
          color: #d63031;
        }

        .order-status.partial {
          background: #74b9ff;
          color: white;
        }

        .total-collectible {
          padding: 12px;
          background: #e8f5e8;
          border-radius: 4px;
          margin-top: 12px;
          text-align: center;
          color: #2d5a2d;
        }

        .no-collection {
          text-align: center;
          padding: 20px;
        }

        .payment-form {
          padding: 20px;
        }

        .payment-form h4 {
          margin: 0 0 16px 0;
          color: #333;
        }

        .payment-type-selection {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .payment-type-selection label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .payment-type-selection label:hover {
          background: #f8f9fa;
        }

        .payment-type-selection input[type="radio"] {
          margin: 0;
        }

        .payment-details {
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 16px;
          margin-bottom: 16px;
          background: #f8f9fa;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 14px;
        }

        .warning {
          display: block;
          color: #f39c12;
          font-size: 12px;
          margin-top: 4px;
        }

        .payment-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-primary:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .loading-spinner {
          padding: 40px;
          text-align: center;
          color: #666;
        }

        @media (max-width: 768px) {
          .payment-manager {
            margin: 10px;
            max-width: none;
          }

          .balance-grid {
            grid-template-columns: 1fr;
          }

          .order-item {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .payment-actions {
            flex-direction: column;
          }
        }

        .returns-section {
          padding: 20px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .returns-section h4 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .returns-explanation {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 14px;
        }

        .processed-returns {
          margin-bottom: 16px;
        }

        .processed-returns h5 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 14px;
        }

        .return-summary {
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 8px;
          background: white;
        }

        .return-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .return-credit {
          color: #28a745;
          font-weight: bold;
        }

        .return-items {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .return-item {
          background: #e9ecef;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          color: #495057;
        }

        .returns-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-returns {
          padding: 8px 16px;
          background: #17a2b8;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-returns:hover:not(:disabled) {
          background: #138496;
        }

        .btn-returns:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .returns-note {
          font-size: 12px;
          color: #28a745;
          font-style: italic;
        }
      `}</style>

      {/* Returns Manager Modal */}
      {showReturnsManager && (
        <ReturnsManager
          deliveryId={deliveryId}
          clientId={clientId}
          clientName={clientName}
          onReturnsProcessed={(returns) => {
            setProcessedReturns([...processedReturns, ...returns]);
            setShowReturnsManager(false);
            // Reload collection info to reflect updated amounts
            loadPaymentInfo();
          }}
          onClose={() => setShowReturnsManager(false)}
        />
      )}
    </div>
  );
};