import React, { useState, useEffect } from 'react';
import { paymentService, type ClientPaymentSheet } from '../../services/paymentService';

interface ClientPaymentSheetProps {
  clientId: string;
  onClose: () => void;
}

export const ClientPaymentSheetView: React.FC<ClientPaymentSheetProps> = ({
  clientId,
  onClose
}) => {
  const [paymentSheet, setPaymentSheet] = useState<ClientPaymentSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'transactions' | 'settlements' | 'returns'>('overview');
  const [clientReturns, setClientReturns] = useState<any[]>([]);

  useEffect(() => {
    loadPaymentSheet();
  }, [clientId]);

  const loadPaymentSheet = async () => {
    try {
      setLoading(true);
      const [paymentData, returnsData] = await Promise.all([
        paymentService.getClientPaymentSheet(clientId),
        paymentService.getClientReturns(clientId, 10)
      ]);
      setPaymentSheet(paymentData);
      setClientReturns(returnsData);
    } catch (error) {
      console.error('Error loading client payment sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-sheet-modal">
        <div className="payment-sheet-content">
          <div className="loading">Loading payment information...</div>
        </div>
      </div>
    );
  }

  if (!paymentSheet) {
    return (
      <div className="payment-sheet-modal">
        <div className="payment-sheet-content">
          <div className="error">Could not load payment information</div>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  const { client, balance, unpaid_orders, recent_transactions, recent_settlements, return_policy } = paymentSheet;

  return (
    <div className="payment-sheet-modal">
      <div className="payment-sheet-content">
        {/* Header */}
        <div className="payment-sheet-header">
          <div className="client-info">
            <h2>{client.name}</h2>
            {client.business_name && <p className="business-name">{client.business_name}</p>}
          </div>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        {/* Navigation Tabs */}
        <div className="payment-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders ({unpaid_orders.length})
          </button>
          <button 
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`tab ${activeTab === 'settlements' ? 'active' : ''}`}
            onClick={() => setActiveTab('settlements')}
          >
            Settlements
          </button>
          <button 
            className={`tab ${activeTab === 'returns' ? 'active' : ''}`}
            onClick={() => setActiveTab('returns')}
          >
            Returns
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              {/* Account Balance Summary */}
              <div className="balance-summary">
                <h3>Account Summary</h3>
                <div className="balance-cards">
                  <div className={`balance-card ${balance.current_balance < 0 ? 'debt' : 'credit'}`}>
                    <div className="balance-label">Current Balance</div>
                    <div className="balance-amount">
                      {paymentService.formatCurrency(balance.current_balance)}
                    </div>
                  </div>
                  <div className="balance-card debt">
                    <div className="balance-label">Total Debt</div>
                    <div className="balance-amount">
                      {paymentService.formatCurrency(balance.total_debt)}
                    </div>
                  </div>
                  <div className="balance-card credit">
                    <div className="balance-label">Total Payments</div>
                    <div className="balance-amount">
                      {paymentService.formatCurrency(balance.total_credit)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Policy Settings */}
              <div className="return-policy">
                <h3>Payment Policy</h3>
                <div className="policy-details">
                  <div className="policy-item">
                    <span className="label">Return Policy:</span>
                    <span className={`value ${return_policy.policy_enabled ? 'enabled' : 'disabled'}`}>
                      {return_policy.policy_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {return_policy.policy_enabled && (
                    <>
                      <div className="policy-item">
                        <span className="label">Payment Delay:</span>
                        <span className="value">{return_policy.payment_delay_orders} order(s)</span>
                      </div>
                      <div className="policy-item">
                        <span className="label">Debt Limit:</span>
                        <span className="value">{paymentService.formatCurrency(return_policy.max_debt_limit)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="quick-stats">
                <h3>Quick Stats</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">{unpaid_orders.length}</div>
                    <div className="stat-label">Unpaid Orders</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">
                      {paymentService.formatCurrency(unpaid_orders.reduce((sum, o) => sum + o.amount_remaining, 0))}
                    </div>
                    <div className="stat-label">Outstanding Amount</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{recent_transactions.length}</div>
                    <div className="stat-label">Recent Transactions</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">
                      {balance.last_payment_date ? new Date(balance.last_payment_date).toLocaleDateString() : 'Never'}
                    </div>
                    <div className="stat-label">Last Payment</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-tab">
              <h3>Unpaid Orders</h3>
              {unpaid_orders.length === 0 ? (
                <div className="empty-state">
                  <p>✅ All orders are paid up to date!</p>
                </div>
              ) : (
                <div className="orders-list">
                  {unpaid_orders.map(order => {
                    const invoiceNumber = order.delivery?.invoice_number || order.invoice_number || order.delivery_id.slice(-8);
                    const deliveryDate = order.delivery?.date || order.order_date || order.created_at;
                    const deliveryWorkflow = order.delivery?.workflow_stage || 'unknown';
                    const deliveryStatus = order.delivery?.status || order.payment_status;
                    
                    return (
                      <div key={order.id} className="order-card">
                        <div className="order-header">
                          <div className="order-id">
                            Invoice #{invoiceNumber}
                          </div>
                          <div className={`order-status ${order.payment_status}`}>
                            {order.payment_status.toUpperCase()}
                          </div>
                        </div>
                        <div className="order-details">
                          <div className="detail-row">
                            <span className="label">Delivery Date:</span>
                            <span className="value">{new Date(deliveryDate).toLocaleDateString()}</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">Workflow Stage:</span>
                            <span className="value">{deliveryWorkflow.replace(/_/g, ' ').toUpperCase()}</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">Order Total:</span>
                            <span className="value font-semibold">{paymentService.formatCurrency(order.order_total)}</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">Amount Paid:</span>
                            <span className="value text-green-600">{paymentService.formatCurrency(order.amount_paid)}</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">Amount Due:</span>
                            <span className="value outstanding text-red-600 font-bold">{paymentService.formatCurrency(order.amount_remaining)}</span>
                          </div>
                          {order.payment_date && (
                            <div className="detail-row">
                              <span className="label">Last Payment:</span>
                              <span className="value">{new Date(order.payment_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {order.due_date && (
                            <div className="detail-row">
                              <span className="label">Due Date:</span>
                              <span className="value">{new Date(order.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {order.notes && (
                            <div className="detail-row">
                              <span className="label">Notes:</span>
                              <span className="value">{order.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="transactions-tab">
              <h3>Recent Transactions</h3>
              {recent_transactions.length === 0 ? (
                <div className="empty-state">
                  <p>No recent transactions</p>
                </div>
              ) : (
                <div className="transactions-list">
                  {recent_transactions.map(transaction => (
                    <div key={transaction.id} className="transaction-card">
                      <div className="transaction-header">
                        <div className={`transaction-type ${transaction.transaction_type}`}>
                          {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="transaction-date">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="transaction-details">
                        <div className="detail-row">
                          <span className="label">Amount:</span>
                          <span className={`value ${transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'credit_applied' ? 'credit' : 'debt'}`}>
                            {transaction.transaction_type === 'debt_created' ? '-' : '+'}
                            {paymentService.formatCurrency(transaction.amount)}
                          </span>
                        </div>
                        {transaction.payment_method && (
                          <div className="detail-row">
                            <span className="label">Method:</span>
                            <span className="value">{transaction.payment_method}</span>
                          </div>
                        )}
                        {transaction.reference_number && (
                          <div className="detail-row">
                            <span className="label">Reference:</span>
                            <span className="value">{transaction.reference_number}</span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span className="label">Description:</span>
                          <span className="value">{transaction.description}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settlements Tab */}
          {activeTab === 'settlements' && (
            <div className="settlements-tab">
              <h3>Recent Settlements</h3>
              {recent_settlements.length === 0 ? (
                <div className="empty-state">
                  <p>No recent settlements</p>
                </div>
              ) : (
                <div className="settlements-list">
                  {recent_settlements.map(settlement => (
                    <div key={settlement.id} className="settlement-card">
                      <div className="settlement-header">
                        <div className="settlement-id">Settlement: {settlement.id.slice(-8)}</div>
                        <div className={`settlement-status ${settlement.settlement_status}`}>
                          {settlement.settlement_status}
                        </div>
                      </div>
                      <div className="settlement-details">
                        <div className="detail-row">
                          <span className="label">Date:</span>
                          <span className="value">{new Date(settlement.settlement_date).toLocaleDateString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Type:</span>
                          <span className="value">{settlement.settlement_type.replace('_', ' ')}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Total Collectible:</span>
                          <span className="value">{paymentService.formatCurrency(settlement.total_collectible)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Amount Collected:</span>
                          <span className="value credit">{paymentService.formatCurrency(settlement.amount_collected)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Payment Method:</span>
                          <span className="value">{settlement.payment_method}</span>
                        </div>
                        {settlement.payment_reference && (
                          <div className="detail-row">
                            <span className="label">Reference:</span>
                            <span className="value">{settlement.payment_reference}</span>
                          </div>
                        )}
                        {settlement.notes && (
                          <div className="detail-row">
                            <span className="label">Notes:</span>
                            <span className="value">{settlement.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Returns Tab */}
          {activeTab === 'returns' && (
            <div className="returns-tab">
              <h3>Returns & Exchanges</h3>
              {clientReturns.length === 0 ? (
                <div className="empty-state">
                  <p>No returns processed for this client</p>
                </div>
              ) : (
                <div className="returns-list">
                  {clientReturns.map(returnRecord => (
                    <div key={returnRecord.id} className="return-card">
                      <div className="return-header">
                        <div className="return-id">Return: {returnRecord.id.slice(-8)}</div>
                        <div className={`return-type ${returnRecord.return_type}`}>
                          {returnRecord.return_type.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div className="return-details">
                        <div className="detail-row">
                          <span className="label">Original Order:</span>
                          <span className="value">#{returnRecord.original_delivery_id.slice(-8)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Return Date:</span>
                          <span className="value">{new Date(returnRecord.return_date).toLocaleDateString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Items Returned:</span>
                          <span className="value">{returnRecord.items?.length || 0}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Total Credit:</span>
                          <span className="value credit">
                            {paymentService.formatCurrency(
                              returnRecord.items?.reduce((sum: number, item: any) => sum + item.total_credit_amount, 0) || 0
                            )}
                          </span>
                        </div>
                        {returnRecord.notes && (
                          <div className="detail-row">
                            <span className="label">Notes:</span>
                            <span className="value">{returnRecord.notes}</span>
                          </div>
                        )}
                        {returnRecord.items && returnRecord.items.length > 0 && (
                          <div className="return-items-detail">
                            <div className="label">Returned Items:</div>
                            <div className="items-list">
                              {returnRecord.items.map((item: any, idx: number) => (
                                <div key={idx} className="item-detail">
                                  <span className="item-name">{item.product_name}</span>
                                  <span className="item-quantity">Qty: {item.quantity_returned}</span>
                                  <span className="item-condition">{item.condition}</span>
                                  <span className="item-credit">
                                    {paymentService.formatCurrency(item.total_credit_amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          .payment-sheet-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .payment-sheet-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .payment-sheet-header {
            padding: 20px 24px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
          }

          .client-info h2 {
            margin: 0;
            color: #333;
            font-size: 24px;
          }

          .business-name {
            margin: 4px 0 0 0;
            color: #666;
            font-style: italic;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
          }

          .close-btn:hover {
            background: #e9ecef;
          }

          .payment-tabs {
            display: flex;
            border-bottom: 1px solid #e9ecef;
            background: white;
          }

          .tab {
            padding: 12px 24px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #666;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
          }

          .tab:hover {
            color: #333;
            background: #f8f9fa;
          }

          .tab.active {
            color: #007bff;
            border-bottom-color: #007bff;
          }

          .tab-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }

          .loading, .error {
            text-align: center;
            padding: 40px;
            color: #666;
          }

          .balance-summary h3 {
            margin: 0 0 16px 0;
            color: #333;
          }

          .balance-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
          }

          .balance-card {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
          }

          .balance-card.debt {
            background: #fff5f5;
            border-color: #fed7d7;
          }

          .balance-card.credit {
            background: #f0fff4;
            border-color: #9ae6b4;
          }

          .balance-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
          }

          .balance-amount {
            font-size: 24px;
            font-weight: bold;
          }

          .balance-card.debt .balance-amount {
            color: #e53e3e;
          }

          .balance-card.credit .balance-amount {
            color: #38a169;
          }

          .return-policy, .quick-stats {
            margin-bottom: 32px;
          }

          .return-policy h3, .quick-stats h3 {
            margin: 0 0 16px 0;
            color: #333;
          }

          .policy-details {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 6px;
          }

          .policy-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .policy-item:last-child {
            margin-bottom: 0;
          }

          .policy-item .label {
            font-weight: 500;
            color: #666;
          }

          .policy-item .value.enabled {
            color: #38a169;
            font-weight: bold;
          }

          .policy-item .value.disabled {
            color: #e53e3e;
            font-weight: bold;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
          }

          .stat-item {
            text-align: center;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 6px;
          }

          .stat-number {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }

          .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
          }

          .orders-list, .transactions-list, .settlements-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .order-card, .transaction-card, .settlement-card {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            background: white;
          }

          .order-header, .transaction-header, .settlement-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .order-id, .transaction-type, .settlement-id {
            font-weight: bold;
            color: #333;
          }

          .order-status, .settlement-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .order-status.unpaid, .settlement-status.no_payment {
            background: #ffeaa7;
            color: #d63031;
          }

          .order-status.partial, .settlement-status.partial {
            background: #74b9ff;
            color: white;
          }

          .order-status.paid, .settlement-status.completed {
            background: #00b894;
            color: white;
          }

          .transaction-type.payment_received {
            color: #38a169;
          }

          .transaction-type.debt_created {
            color: #e53e3e;
          }

          .transaction-date {
            color: #666;
            font-size: 14px;
          }

          .order-details, .transaction-details, .settlement-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
          }

          .detail-row .label {
            color: #666;
            font-weight: 500;
          }

          .detail-row .value {
            color: #333;
          }

          .detail-row .value.outstanding {
            color: #e53e3e;
            font-weight: bold;
          }

          .detail-row .value.credit {
            color: #38a169;
            font-weight: bold;
          }

          .detail-row .value.debt {
            color: #e53e3e;
            font-weight: bold;
          }

          .returns-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .return-card {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            background: white;
          }

          .return-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .return-id {
            font-weight: bold;
            color: #333;
          }

          .return-type {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .return-type.unsold_return {
            background: #fff3cd;
            color: #856404;
          }

          .return-type.quality_issue {
            background: #f8d7da;
            color: #721c24;
          }

          .return-type.wrong_item {
            background: #d1ecf1;
            color: #0c5460;
          }

          .return-type.customer_request {
            background: #d4edda;
            color: #155724;
          }

          .return-items-detail {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e9ecef;
          }

          .return-items-detail .label {
            font-weight: 500;
            color: #666;
            margin-bottom: 8px;
            display: block;
          }

          .items-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .item-detail {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 8px;
            align-items: center;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
            font-size: 13px;
          }

          .item-name {
            font-weight: 500;
            color: #333;
          }

          .item-quantity {
            color: #666;
          }

          .item-condition {
            color: #666;
            text-transform: capitalize;
          }

          .item-credit {
            color: #28a745;
            font-weight: bold;
            text-align: right;
          }

          @media (max-width: 768px) {
            .payment-sheet-modal {
              padding: 10px;
            }

            .balance-cards, .stats-grid {
              grid-template-columns: 1fr;
            }

            .payment-tabs {
              overflow-x: auto;
            }

            .tab {
              white-space: nowrap;
              min-width: max-content;
            }

            .detail-row {
              flex-direction: column;
              gap: 4px;
            }
          }
        `}</style>
      </div>
    </div>
  );
};