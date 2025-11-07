
import React, { useState, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { Client, Product } from '../../types';
import { generateId, formatCurrency } from '../../utils';
import { Modal } from '../ui/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';
import { PageHeader } from '../ui/PageHeader';

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
    <div className="min-h-screen relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* DRAMATIC Gradient Background */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-600 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-pink-500/40 via-purple-500/40 to-cyan-500/40 animate-gradient-y"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-purple-900/20 to-black/40"></div>
      </div>

      {/* Animated Mesh Gradient Orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-cyan-400/20 via-transparent to-transparent rounded-full blur-3xl animate-spin-slow"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-pink-400/20 via-transparent to-transparent rounded-full blur-3xl animate-spin-reverse"></div>
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <PageHeader 
            title={t.clients.title}
            description="Manage your clients and business relationships"
            icon="👥"
            theme="clients"
          />
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center backdrop-blur-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow-[0_8px_32px_rgba(0,150,200,0.4)] border border-white/20"
          >
            <PlusIcon className="mr-2" />
            {t.clients.newClient}
          </button>
        </div>
        
        {/* Search Bar - Glassmorphism */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
          <input
            type="text"
            placeholder={t.common.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="relative w-full px-5 py-3 border-0 text-gray-900 dark:text-white rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50 shadow-lg placeholder-gray-400"
          />
        </div>

        {/* Clients Table - Glassmorphism */}
        <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-2xl overflow-hidden border border-white/20 shadow-[0_8px_32px_0_rgba(0,208,232,0.2)]">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-cyan-400 border-t-transparent mb-4"></div>
              <p className="mt-3 text-white/70 font-semibold">Loading clients...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left text-white/70">
              <thead className="text-xs font-bold uppercase bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white/90 border-b border-white/10">
                <tr>
                  <th scope="col" className="px-6 py-4 drop-shadow-lg">{t.clients.businessName}</th>
                  <th scope="col" className="px-6 py-4 drop-shadow-lg">{t.clients.contactPerson}</th>
                  <th scope="col" className="px-6 py-4 drop-shadow-lg">{t.clients.phone}</th>
                  <th scope="col" className="px-6 py-4 text-right drop-shadow-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white drop-shadow-lg whitespace-nowrap">{client.businessName}</td>
                    <td className="px-6 py-4 text-white/80">{client.name}</td>
                    <td className="px-6 py-4 text-white/80">{client.phone}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(client)} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 p-2 rounded-lg transition-colors"><EditIcon /></button>
                      <button onClick={() => handleDelete(client.id)} className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/20 p-2 rounded-lg transition-colors"><DeleteIcon /></button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-white/50">{t.common.noResults}</td>
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
