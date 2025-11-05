import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

interface Client {
  id: string;
  name: string;
  business_name?: string;
}

interface PaymentRecord {
  id: string;
  delivery_id: string;
  invoice_number: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  created_at: string;
}

export const PaymentHistoryView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all clients
  useEffect(() => {
    loadClients();
  }, []);

  // Load payment history when client is selected
  useEffect(() => {
    if (selectedClientId) {
      loadPaymentHistory(selectedClientId);
    } else {
      setPaymentHistory([]);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, business_name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadPaymentHistory = async (clientId: string) => {
    setLoading(true);
    try {
      // Simple query: Get all payments for this client's deliveries
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          delivery_id,
          amount,
          method,
          reference,
          date,
          created_at,
          deliveries!payments_delivery_id_fkey (
            invoice_number
          )
        `)
        .eq('deliveries.client_id', clientId)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Simple mapping - no complex calculations
      const simplePayments: PaymentRecord[] = (payments || []).map(payment => {
        const delivery = Array.isArray(payment.deliveries) ? payment.deliveries[0] : payment.deliveries;
        
        return {
          id: payment.id,
          delivery_id: payment.delivery_id,
          invoice_number: delivery?.invoice_number?.toString() || 'N/A',
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference,
          created_at: payment.created_at
        };
      });

      setPaymentHistory(simplePayments);
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💳 Payment History</h1>
        <p className="text-gray-600">Simple transaction log - all payments received</p>
      </div>

      {/* Client Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Client
        </label>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Choose a client --</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} {client.business_name ? `(${client.business_name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Payment History Table */}
      {selectedClientId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Client Info Header */}
          {selectedClient && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
              <h2 className="text-xl font-bold">{selectedClient.name}</h2>
              {selectedClient.business_name && (
                <p className="text-blue-100 text-sm">{selectedClient.business_name}</p>
              )}
              <p className="text-blue-100 text-sm mt-1">
                {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''} on record
              </p>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading payment history...</p>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No payment records found for this client</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Paid
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(record.date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(record.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-blue-600">
                          #{record.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(record.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">
                          {record.method}
                        </span>
                        {record.reference && (
                          <div className="text-xs text-gray-500">
                            Ref: {record.reference}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
