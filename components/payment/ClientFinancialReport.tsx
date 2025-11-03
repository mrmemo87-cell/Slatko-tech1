import React, { useState, useEffect } from 'react';
import { paymentService, type OrderPaymentRecord, type ClientBalance, type PaymentTransaction, type SettlementSession } from '../../services/paymentService';

interface ClientFinancialReportProps {
  clientId: string;
  clientName: string;
  currentDeliveryId?: string;
  onClose: () => void;
  onSettlementComplete?: (settlementId: string) => void;
}

export const ClientFinancialReport: React.FC<ClientFinancialReportProps> = ({
  clientId,
  clientName,
  currentDeliveryId,
  onClose,
  onSettlementComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'payments' | 'settlement'>('overview');
  
  // Data state
  const [balance, setBalance] = useState<ClientBalance | null>(null);
  const [unpaidOrders, setUnpaidOrders] = useState<OrderPaymentRecord[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementSession[]>([]);
  const [returnPolicy, setReturnPolicy] = useState<any>(null);
  const [orderReturns, setOrderReturns] = useState<Map<string, any[]>>(new Map());
  
  // Settlement state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      
      const [
        balanceData,
        unpaidData,
        paymentsData,
        settlementsData,
        policyData
      ] = await Promise.all([
        paymentService.getClientBalance(clientId),
        paymentService.getClientUnpaidOrders(clientId),
        paymentService.getClientPaymentHistory(clientId, 50),
        paymentService.getClientSettlementHistory(clientId, 20),
        paymentService.getClientReturnPolicy(clientId)
      ]);

      setBalance(balanceData);
      setUnpaidOrders(unpaidData);
      setPaymentHistory(paymentsData);
      setSettlementHistory(settlementsData);
      setReturnPolicy(policyData);
      
      // Load returns for each unpaid order
      const returnsMap = new Map();
      for (const order of unpaidData) {
        try {
          const returns = await paymentService.getOrderReturns(order.delivery_id);
          if (returns && returns.length > 0) {
            returnsMap.set(order.delivery_id, returns);
          }
        } catch (err) {
          console.log('No returns for order:', order.delivery_id);
        }
      }
      setOrderReturns(returnsMap);
      
    } catch (error) {
      console.error('Error loading client financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const getOrderReturnsTotal = (deliveryId: string): number => {
    const returns = orderReturns.get(deliveryId);
    if (!returns || returns.length === 0) return 0;
    
    return returns.reduce((total, returnRecord) => {
      const returnItems = returnRecord.items || [];
      return total + returnItems.reduce((sum: number, item: any) => sum + item.total_credit_amount, 0);
    }, 0);
  };

  const getAdjustedOrderTotal = (order: OrderPaymentRecord): number => {
    const returnsTotal = getOrderReturnsTotal(order.delivery_id);
    return order.order_total - returnsTotal;
  };

  const handleProcessSettlement = async () => {
    try {
      setProcessing(true);
      
      const amount = parseFloat(paymentAmount) || 0;
      const ordersArray = Array.from(selectedOrders) as string[];
      
      if (amount > 0 && ordersArray.length > 0) {
        // Process payment for selected orders
        for (const orderId of ordersArray) {
          const order = unpaidOrders.find(o => o.delivery_id === orderId);
          if (order) {
            const paymentForOrder = Math.min(amount, order.amount_remaining);
            await paymentService.updateOrderPaymentStatus(
              orderId,
              paymentForOrder,
              paymentMethod,
              paymentReference
            );
          }
        }
      }
      
      // Create settlement session
      const settlement = await paymentService.createSettlementSession({
        delivery_id: currentDeliveryId || ordersArray[0],
        client_id: clientId,
        driver_id: undefined, // Make optional to avoid foreign key error
        payment_type: amount > 0 ? 'full_payment' : 'no_payment',
        amount_collected: amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        notes: notes || undefined
      });

      alert('Settlement processed successfully!');
      if (onSettlementComplete) {
        onSettlementComplete(settlement.id);
      }
      onClose();
      
    } catch (error) {
      console.error('Error processing settlement:', error);
      alert('Error processing settlement. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content client-financial-report" onClick={e => e.stopPropagation()}>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading client financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalUnpaid = unpaidOrders.reduce((sum, o) => sum + o.amount_remaining, 0);
  const selectedAmount = unpaidOrders
    .filter(o => selectedOrders.has(o.delivery_id))
    .reduce((sum, o) => sum + o.amount_remaining, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content client-financial-report full-screen" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="report-header">
          <div className="header-content">
            <h2>💰 Financial Report - {clientName}</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          
          {/* Financial Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card balance">
              <div className="card-label">Current Balance</div>
              <div className={`card-value ${(balance?.current_balance || 0) < 0 ? 'negative' : 'positive'}`}>
                ${Math.abs(balance?.current_balance || 0).toFixed(2)}
                <span className="balance-type">
                  {(balance?.current_balance || 0) < 0 ? ' DEBT' : ' CREDIT'}
                </span>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="card-label">Total Unpaid</div>
              <div className="card-value">${totalUnpaid.toFixed(2)}</div>
              <div className="card-detail">{unpaidOrders.length} orders</div>
            </div>
            
            <div className="summary-card">
              <div className="card-label">Total Debt</div>
              <div className="card-value">${(balance?.total_debt || 0).toFixed(2)}</div>
            </div>
            
            <div className="summary-card">
              <div className="card-label">Last Payment</div>
              <div className="card-value">
                {balance?.last_payment_date || 'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="tabs-navigation">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Unpaid Orders ({unpaidOrders.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💳 Payment History
          </button>
          <button
            className={`tab-button ${activeTab === 'settlement' ? 'active' : ''}`}
            onClick={() => setActiveTab('settlement')}
          >
            ✅ Settle Payment
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="section">
                <h3>Return Policy</h3>
                {returnPolicy ? (
                  <div className="policy-info">
                    <p><strong>Policy Enabled:</strong> {returnPolicy.policy_enabled ? 'Yes' : 'No'}</p>
                    <p><strong>Payment Delay:</strong> {returnPolicy.payment_delay_orders} order(s)</p>
                    <p><strong>Max Debt Limit:</strong> ${returnPolicy.max_debt_limit}</p>
                    {returnPolicy.notes && <p><strong>Notes:</strong> {returnPolicy.notes}</p>}
                  </div>
                ) : (
                  <p>No return policy configured. Using standard payment terms.</p>
                )}
              </div>

              <div className="section">
                <h3>Recent Settlements</h3>
                {settlementHistory.length > 0 ? (
                  <div className="settlements-list">
                    {settlementHistory.slice(0, 5).map(settlement => (
                      <div key={settlement.id} className="settlement-item">
                        <div className="settlement-date">{settlement.settlement_date}</div>
                        <div className="settlement-amount">${settlement.amount_collected.toFixed(2)}</div>
                        <div className="settlement-status">{settlement.settlement_status}</div>
                        <div className="settlement-method">{settlement.payment_method}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No settlement history</p>
                )}
              </div>
            </div>
          )}

          {/* Unpaid Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-tab">
              {unpaidOrders.length > 0 ? (
                <div className="orders-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>Order Total</th>
                        <th>Returns</th>
                        <th>Adjusted Total</th>
                        <th>Paid</th>
                        <th>Remaining</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidOrders.map(order => {
                        const returnsTotal = getOrderReturnsTotal(order.delivery_id);
                        const adjustedTotal = getAdjustedOrderTotal(order);
                        const remaining = adjustedTotal - order.amount_paid;
                        
                        return (
                        <tr key={order.id} className={selectedOrders.has(order.delivery_id) ? 'selected' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.delivery_id)}
                              onChange={() => toggleOrderSelection(order.delivery_id)}
                            />
                          </td>
                          <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>{(order as any).delivery?.invoice_number || 'N/A'}</td>
                          <td>${order.order_total.toFixed(2)}</td>
                          <td className={returnsTotal > 0 ? 'returns-credit' : ''}>
                            {returnsTotal > 0 ? `-$${returnsTotal.toFixed(2)}` : '-'}
                          </td>
                          <td className="adjusted-total">
                            <strong>${adjustedTotal.toFixed(2)}</strong>
                          </td>
                          <td>${order.amount_paid.toFixed(2)}</td>
                          <td className="amount-remaining">${remaining.toFixed(2)}</td>
                          <td>
                            <span className={`status-badge ${order.payment_status}`}>
                              {order.payment_status}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>✅ No unpaid orders! Client is up to date.</p>
                </div>
              )}
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === 'payments' && (
            <div className="payments-tab">
              {paymentHistory.length > 0 ? (
                <div className="payments-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map(payment => (
                        <tr key={payment.id}>
                          <td>{payment.transaction_date}</td>
                          <td>
                            <span className={`transaction-type ${payment.transaction_type}`}>
                              {payment.transaction_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className={payment.transaction_type.includes('debt') ? 'negative' : 'positive'}>
                            ${payment.amount.toFixed(2)}
                          </td>
                          <td>{payment.payment_method}</td>
                          <td>{payment.reference_number || '-'}</td>
                          <td>{payment.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No payment history</p>
                </div>
              )}
            </div>
          )}

          {/* Settlement Tab */}
          {activeTab === 'settlement' && (
            <div className="settlement-tab">
              <div className="settlement-summary">
                <h3>Process Settlement</h3>
                <p>Selected {selectedOrders.size} order(s) totaling ${selectedAmount.toFixed(2)}</p>
              </div>

              <div className="settlement-form">
                <div className="form-group">
                  <label>Payment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <button 
                    className="btn-secondary"
                    onClick={() => setPaymentAmount(selectedAmount.toFixed(2))}
                  >
                    Use Selected Amount
                  </button>
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="mobile_payment">Mobile Payment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction reference, check number, etc."
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this settlement..."
                    rows={3}
                  />
                </div>

                <div className="settlement-actions">
                  <button
                    className="btn-primary"
                    onClick={handleProcessSettlement}
                    disabled={processing || selectedOrders.size === 0}
                  >
                    {processing ? 'Processing...' : 'Complete Settlement'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setActiveTab('orders')}
                  >
                    Select More Orders
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .client-financial-report.full-screen {
          width: 95vw;
          height: 95vh;
          max-width: none;
          max-height: none;
          margin: 0;
          display: flex;
          flex-direction: column;
        }

        .report-header {
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 1rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header-content h2 {
          margin: 0;
          font-size: 1.8rem;
        }

        .close-button {
          background: #ff4444;
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .summary-card {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          border: 2px solid #e0e0e0;
        }

        .summary-card.balance {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }

        .card-label {
          font-size: 0.875rem;
          opacity: 0.8;
          margin-bottom: 0.5rem;
        }

        .card-value {
          font-size: 2rem;
          font-weight: bold;
        }

        .card-value.negative {
          color: #ff6b6b;
        }

        .card-value.positive {
          color: #51cf66;
        }

        .summary-card.balance .card-value {
          color: white;
        }

        .balance-type {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .card-detail {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-top: 0.25rem;
        }

        .tabs-navigation {
          display: flex;
          gap: 0.5rem;
          border-bottom: 2px solid #e0e0e0;
          padding: 1rem 0 0 0;
        }

        .tab-button {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .tab-button:hover {
          background: #f8f9fa;
        }

        .tab-button.active {
          border-bottom-color: #667eea;
          font-weight: bold;
          color: #667eea;
        }

        .tab-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .orders-table, .payments-table {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        th {
          background: #f8f9fa;
          font-weight: bold;
        }

        tr:hover {
          background: #f8f9fa;
        }

        tr.selected {
          background: #e7f5ff;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: bold;
        }

        .status-badge.unpaid {
          background: #ffe3e3;
          color: #c92a2a;
        }

        .status-badge.partial {
          background: #fff3bf;
          color: #f08c00;
        }

        .status-badge.paid {
          background: #d3f9d8;
          color: #2b8a3e;
        }

        .amount-remaining {
          font-weight: bold;
          color: #c92a2a;
        }

        .returns-credit {
          color: #2b8a3e;
          font-weight: 600;
        }

        .adjusted-total {
          background: #f0f7ff;
          font-weight: 600;
        }

        .settlement-form {
          max-width: 600px;
          margin: 2rem auto;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 4px;
          font-size: 1rem;
        }

        .settlement-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .btn-primary, .btn-secondary {
          padding: 1rem 2rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          flex: 1;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f8f9fa;
          border: 2px solid #e0e0e0;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .section {
          margin-bottom: 2rem;
        }

        .section h3 {
          margin-bottom: 1rem;
          color: #667eea;
        }

        .policy-info p {
          margin: 0.5rem 0;
        }

        .settlements-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .settlement-item {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 1rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .loading-state {
          text-align: center;
          padding: 3rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
