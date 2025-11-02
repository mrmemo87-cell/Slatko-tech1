
import React, { useState, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { Client, Product } from '../../types';
import { generateId, formatCurrency } from '../../utils';
import { Modal } from '../ui/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';

interface ClientsViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ t, showToast }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await supabaseApi.getClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      showToast('Error loading clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client: Client | null = null) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingClient(null);
    setIsModalOpen(false);
  };

  const handleSave = async (clientData: Omit<Client, 'id'>) => {
    try {
      if (editingClient) {
        await supabaseApi.updateClient(editingClient.id, clientData);
      } else {
        await supabaseApi.createClient(clientData);
      }
      await loadClients(); // Reload the data
      handleCloseModal();
      showToast(t.clients.saved);
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Error saving client', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t.clients.deleteConfirm)) {
      try {
        await supabaseApi.deleteClient(id);
        await loadClients(); // Reload the data
        showToast(t.clients.deleted);
      } catch (error) {
        console.error('Error deleting client:', error);
        showToast('Error deleting client', 'error');
      }
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.clients.title}</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="mr-2" />
          {t.clients.newClient}
        </button>
      </div>
      
      <input
        type="text"
        placeholder={t.common.search}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      />

      <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Loading clients...</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-6 py-3">{t.clients.businessName}</th>
                <th scope="col" className="px-6 py-3">{t.clients.contactPerson}</th>
                <th scope="col" className="px-6 py-3">{t.clients.phone}</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{client.businessName}</td>
                  <td className="px-6 py-4">{client.name}</td>
                  <td className="px-6 py-4">{client.phone}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleOpenModal(client)} className="text-blue-600 hover:text-blue-800"><EditIcon /></button>
                    <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-800"><DeleteIcon /></button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4">{t.common.noResults}</td>
                </tr>
              )}
            </tbody>
        </table>
        )}
      </div>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        client={editingClient}
        t={t}
      />
    </div>
  );
};

// --- Client Form Modal ---
interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id'>) => void;
  client: Client | null;
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, onSave, client, t }) => {
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    name: '', businessName: '', phone: '', address: '', customPrices: []
  });
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await supabaseApi.getProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };
    
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData(client || { name: '', businessName: '', phone: '', address: '', customPrices: [] });
    }
  }, [isOpen, client]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePriceChange = (productId: string, price: string) => {
    const priceValue = Number(price);
    const existingPrice = formData.customPrices.find(p => p.productId === productId);
    let updatedPrices;

    if (existingPrice) {
      updatedPrices = formData.customPrices.map(p =>
        p.productId === productId ? { ...p, price: priceValue } : p
      );
    } else {
      updatedPrices = [...formData.customPrices, { productId, price: priceValue }];
    }
    
    // Filter out prices that are empty or zero, as they mean "use default"
    updatedPrices = updatedPrices.filter(p => p.price > 0);

    setFormData({ ...formData, customPrices: updatedPrices });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.businessName.trim()) return;
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={client ? t.clients.editClient : t.clients.newClient}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.clients.contactPerson}</label>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.clients.businessName}</label>
          <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.clients.phone}</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full input-style" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.clients.address}</label>
          <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 block w-full input-style" />
        </div>

        <div className="pt-2">
          <h4 className="text-md font-semibold text-slate-800 dark:text-white">{t.clients.customPricing}</h4>
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2">
            {products.map(product => (
              <div key={product.id} className="grid grid-cols-3 gap-2 items-center">
                <label className="text-sm col-span-2">{product.name} ({formatCurrency(product.defaultPrice)})</label>
                <input
                  type="number"
                  placeholder={t.products.defaultPrice}
                  value={formData.customPrices.find(p => p.productId === product.id)?.price || ''}
                  onChange={(e) => handlePriceChange(product.id, e.target.value)}
                  className="input-style text-right"
                  min="0"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end pt-4 space-x-2">
          <button type="button" onClick={onClose} className="btn-secondary">{t.common.cancel}</button>
          <button type="submit" className="btn-primary">{t.common.save}</button>
        </div>
      </form>
      <style>{`
        .input-style {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background-color: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .dark .input-style {
            background-color: #334155;
            border-color: #475569;
            color: white;
        }
        .input-style:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px #3b82f6;
        }
        .btn-primary {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          color: white;
          background-color: #2563eb;
        }
        .btn-primary:hover { background-color: #1d4ed8; }
        .btn-secondary {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            color: #334155;
            background-color: #e2e8f0;
        }
        .dark .btn-secondary { color: #e2e8f0; background-color: #475569; }
        .btn-secondary:hover { background-color: #cbd5e1; }
        .dark .btn-secondary:hover { background-color: #334155; }
      `}</style>
    </Modal>
  );
};
