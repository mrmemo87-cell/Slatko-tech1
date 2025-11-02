import React, { useState } from 'react';
import { supabaseApi } from '../../services/supabase-api';

interface BulkImportProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const BulkImport: React.FC<BulkImportProps> = ({ t, showToast }) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'clients' | 'purchases'>('materials');
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState('');

  const csvToJson = (csv: string) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
  };

  const importMaterials = async (data: any[]) => {
    const materials = data.map(row => ({
      name: row.name,
      unit: row.unit,
      stock: parseFloat(row.stock) || 0,
      cost_per_unit: parseFloat(row.cost_per_unit) || 0,
      supplier: row.supplier || '',
      min_stock_level: parseFloat(row.min_stock_level) || 0,
      expiration_date: row.expiration_date || null
    }));

    for (const material of materials) {
      await supabaseApi.createMaterial(material);
    }
  };

  const importClients = async (data: any[]) => {
    const clients = data.map(row => ({
      name: row.name,
      business_name: row.business_name || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      credit_limit: parseFloat(row.credit_limit) || 0,
      payment_term_days: parseInt(row.payment_term_days) || 30,
      risk_level: (row.risk_level || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH'
    }));

    for (const client of clients) {
      await supabaseApi.createClient(client);
    }
  };

  const importPurchases = async (data: any[]) => {
    // Group by supplier and date to create purchase records
    const purchaseGroups = data.reduce((acc, row) => {
      const key = `${row.supplier}-${row.date}`;
      if (!acc[key]) {
        acc[key] = {
          supplier: row.supplier,
          date: row.date,
          status: row.status || 'received',
          notes: row.notes || '',
          items: []
        };
      }
      acc[key].items.push({
        material_name: row.material_name,
        quantity: parseFloat(row.quantity) || 0,
        unit_cost: parseFloat(row.unit_cost) || 0,
        total_cost: parseFloat(row.total_cost) || 0
      });
      return acc;
    }, {} as any);

    // Get all materials to map names to IDs
    const materials = await supabaseApi.getMaterials();
    const materialMap = materials.reduce((acc, material) => {
      acc[material.name] = material.id;
      return acc;
    }, {} as any);

    // Create purchases with items
    for (const purchase of Object.values(purchaseGroups) as any[]) {
      const totalAmount = purchase.items.reduce((sum: number, item: any) => sum + item.total_cost, 0);
      
      const purchaseData = {
        supplier: purchase.supplier,
        date: purchase.date,
        total_amount: totalAmount,
        status: purchase.status,
        notes: purchase.notes
      };

      const createdPurchase = await supabaseApi.createPurchase(purchaseData);

      // Add purchase items
      for (const item of purchase.items) {
        const materialId = materialMap[item.material_name];
        if (materialId) {
          await supabaseApi.createPurchaseItem({
            purchase_id: createdPurchase.id,
            material_id: materialId,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost
          });
        }
      }
    }
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      showToast('Please paste CSV data first', 'error');
      return;
    }

    setImporting(true);
    try {
      const jsonData = csvToJson(csvData);
      
      switch (activeTab) {
        case 'materials':
          await importMaterials(jsonData);
          showToast(`Successfully imported ${jsonData.length} materials!`, 'success');
          break;
        case 'clients':
          await importClients(jsonData);
          showToast(`Successfully imported ${jsonData.length} clients!`, 'success');
          break;
        case 'purchases':
          await importPurchases(jsonData);
          showToast(`Successfully imported purchase history!`, 'success');
          break;
      }
      
      setCsvData('');
    } catch (error) {
      console.error('Import error:', error);
      showToast('Import failed. Please check your data format.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const getTemplate = () => {
    switch (activeTab) {
      case 'materials':
        return `name,unit,stock,cost_per_unit,supplier,min_stock_level,notes
Flour - All Purpose,kg,50,1.20,Main Supplier,10,Standard baking flour
Sugar - Granulated,kg,30,0.80,Sweet Supplies Co,5,White granulated sugar`;
      case 'clients':
        return `name,business_name,email,phone,address,credit_limit,payment_term_days,risk_level,notes
Cafe Central,Cafe Central Downtown,orders@cafecentral.com,+1-555-0201,"123 Main St",1000.00,30,LOW,Regular weekly orders
Restaurant Bella Vista,Bella Vista Fine Dining,purchasing@bellavista.com,+1-555-0202,"456 Oak Ave",2000.00,15,LOW,High-end dessert orders`;
      case 'purchases':
        return `supplier,date,status,notes,material_name,quantity,unit_cost,total_cost
Main Supplier,2024-11-01,received,Weekly delivery,Flour - All Purpose,25,1.20,30.00
Main Supplier,2024-11-01,received,Weekly delivery,Sugar - Granulated,10,0.80,8.00`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        📊 Bulk Data Import
      </h2>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {(['materials', 'clients', 'purchases'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Import Instructions */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          📋 How to Import Your {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <li>Prepare your data in CSV format (Excel → Save As → CSV)</li>
          <li>Copy the CSV content and paste it in the text area below</li>
          <li>Click "Import Data" to upload to your database</li>
          <li>Check the results in the respective section of the app</li>
        </ol>
      </div>

      {/* CSV Template */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          CSV Template (copy this format):
        </label>
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-mono text-xs overflow-x-auto">
          <pre>{getTemplate()}</pre>
        </div>
      </div>

      {/* CSV Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Paste your CSV data here:
        </label>
        <textarea
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          className="w-full h-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          placeholder={`Paste your ${activeTab} CSV data here...`}
        />
      </div>

      {/* Import Button */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => setCsvData(getTemplate())}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Load Template
        </button>
        <button
          onClick={handleImport}
          disabled={importing || !csvData.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Importing...
            </div>
          ) : (
            `Import ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`
          )}
        </button>
      </div>

      {/* Import Tips */}
      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          💡 Import Tips
        </h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
          <li>Use commas to separate values, quotes for text with commas</li>
          <li>Dates should be in YYYY-MM-DD format</li>
          <li>Numbers should use decimal points (not commas)</li>
          <li>Risk levels: LOW, MEDIUM, HIGH (for clients)</li>
          <li>Status options: pending, received, cancelled (for purchases)</li>
        </ul>
      </div>
    </div>
  );
};