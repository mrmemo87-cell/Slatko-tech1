import React, { useState, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { paymentService } from '../../services/paymentService';

export const AllPaymentRecordsView: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid' | 'settlements'>('all');

  useEffect(() => {
    loadRecords();
  }, [activeTab]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const deliveries = await supabaseApi.getDeliveries(1000); // Get more records
      
      // Transform and filter based on active tab
      const transformedRecords = deliveries
        .map(delivery => ({
          id: delivery.id,
          invoiceNumber: delivery.invoiceNumber,
          clientName: delivery.clientName,
          date: delivery.date,
          status: delivery.status,
          amount: delivery.items?.reduce((sum: number, item: any) => 
            sum + (item.quantity * item.price), 0) || 0,
          paymentMethod: delivery.paymentMethod,
          paymentStatus: delivery.paymentStatus || 'pending',
          workflowStage: delivery.workflowStage
        }))
        .filter(record => {
          switch (activeTab) {
            case 'unpaid':
              return record.paymentStatus !== 'paid';
            case 'paid':
              return record.paymentStatus === 'paid';
            case 'settlements':
              return record.workflowStage === 'completed';
            default:
              return true;
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecords(transformedRecords);
    } catch (error) {
      console.error('Error loading payment records:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Records</h2>
        <p className="text-gray-600">View and manage all payment records across clients</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={\`px-4 py-2 font-medium text-sm \${
              activeTab === 'all'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }\`}
          >
            All Records
          </button>
          <button
            onClick={() => setActiveTab('unpaid')}
            className={\`px-4 py-2 font-medium text-sm \${
              activeTab === 'unpaid'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }\`}
          >
            Unpaid
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={\`px-4 py-2 font-medium text-sm \${
              activeTab === 'paid'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }\`}
          >
            Paid
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={\`px-4 py-2 font-medium text-sm \${
              activeTab === 'settlements'
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }\`}
          >
            Settlements
          </button>
        </nav>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{record.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {paymentService.formatCurrency(record.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${record.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {record.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.paymentMethod || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};