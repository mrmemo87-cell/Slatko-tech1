
import React, { useState, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { Material, MaterialUnit } from '../../types';
import { generateId } from '../../utils';
import { MATERIAL_UNITS } from '../../constants';
import { Modal } from '../ui/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';

interface MaterialsViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({ t, showToast }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const materialsData = await supabaseApi.getMaterials();
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading materials:', error);
      showToast('Error loading materials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (material: Material | null = null) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingMaterial(null);
    setIsModalOpen(false);
  };

  const handleSave = async (materialData: Omit<Material, 'id'>) => {
    try {
      if (editingMaterial) {
        await supabaseApi.updateMaterial(editingMaterial.id, materialData);
      } else {
        await supabaseApi.createMaterial(materialData);
      }
      await loadMaterials(); // Reload the data
      handleCloseModal();
      showToast(t.materials.saved);
    } catch (error) {
      console.error('Error saving material:', error);
      showToast('Error saving material', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    // TODO: Check if material is used in recipes before deleting
    if (window.confirm(t.materials.deleteConfirm)) {
      try {
        await supabaseApi.deleteMaterial(id);
        await loadMaterials(); // Reload the data
        showToast(t.materials.deleted);
      } catch (error) {
        console.error('Error deleting material:', error);
        showToast('Error deleting material', 'error');
      }
    }
  };

  const filteredMaterials = materials.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center relative">
        <div className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-600 animate-gradient-x"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-pink-500/40 via-purple-500/40 to-cyan-500/40 animate-gradient-y"></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent shadow-lg mb-4"></div>
          <p className="text-white font-semibold drop-shadow-lg">Loading materials...</p>
        </div>
      </div>
    );
  }

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
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,208,232,0.4)]">{t.materials.title}</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center backdrop-blur-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-[0_8px_32px_rgba(0,150,200,0.4)] border border-white/20"
        >
          <PlusIcon className="mr-2" />
          {t.materials.newMaterial}
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
        <input
          type="text"
          placeholder={t.common.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="relative w-full px-5 py-3 border-0 text-gray-900 dark:text-white rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50 shadow-lg placeholder-gray-400"
      />

      <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">{t.materials.name}</th>
              <th scope="col" className="px-6 py-3">{t.materials.stock}</th>
              <th scope="col" className="px-6 py-3">Expiration</th>
              <th scope="col" className="px-6 py-3">Quality</th>
              <th scope="col" className="px-6 py-3 text-right">{t.materials.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(material => {
              const isLowStock = material.stock <= material.lowStockThreshold;
              
              // Calculate expiration status
              let expirationStatus = 'none';
              let daysUntilExpiry = null;
              if (material.expirationDate) {
                const expDate = new Date(material.expirationDate);
                const now = new Date();
                daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry <= 0) expirationStatus = 'expired';
                else if (daysUntilExpiry <= 2) expirationStatus = 'critical';
                else if (daysUntilExpiry <= 7) expirationStatus = 'warning';
                else expirationStatus = 'good';
              }
              
              return (
                <tr key={material.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {material.name}
                    {material.supplier && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Supplier: {material.supplier}
                      </div>
                    )}
                  </td>
                  <td className={`px-6 py-4 font-semibold ${isLowStock ? 'text-red-500' : ''}`}>
                    {material.stock} {material.unit}
                    {isLowStock && <span className="ml-2 text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 px-2 py-0.5 rounded-full">{t.materials.lowStockAlert}</span>}
                    {material.costPerUnit && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Cost: {material.costPerUnit} KGS/{material.unit}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {material.expirationDate ? (
                      <div>
                        <div className={`text-sm ${
                          expirationStatus === 'expired' ? 'text-red-600 font-bold' :
                          expirationStatus === 'critical' ? 'text-red-500 font-semibold' :
                          expirationStatus === 'warning' ? 'text-orange-500' : 'text-slate-600'
                        }`}>
                          {new Date(material.expirationDate).toLocaleDateString()}
                        </div>
                        {daysUntilExpiry !== null && (
                          <div className="text-xs text-slate-500">
                            {daysUntilExpiry <= 0 ? 'EXPIRED' : 
                             daysUntilExpiry === 1 ? '1 day left' : 
                             `${daysUntilExpiry} days left`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">No expiration</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {material.qualityGrade && (
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        material.qualityGrade === 'A' ? 'bg-green-100 text-green-800' :
                        material.qualityGrade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Grade {material.qualityGrade}
                      </span>
                    )}
                    {material.reorderPoint && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Reorder at: {material.reorderPoint}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleOpenModal(material)} className="text-blue-600 hover:text-blue-800"><EditIcon /></button>
                    <button onClick={() => handleDelete(material.id)} className="text-red-600 hover:text-red-800"><DeleteIcon /></button>
                  </td>
                </tr>
              );
            })}
             {filteredMaterials.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4">{t.common.noResults}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MaterialFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        material={editingMaterial}
        t={t}
      />
    </div>
      </div>
    </div>
  );
};

// --- Material Form Modal ---
interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Material, 'id'>) => void;
  material: Material | null;
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

const MaterialFormModal: React.FC<MaterialFormModalProps> = ({ isOpen, onClose, onSave, material, t }) => {
  const [formData, setFormData] = useState({ name: '', unit: 'kg' as MaterialUnit, stock: 0, lowStockThreshold: 0 });

  React.useEffect(() => {
    if (isOpen) {
        if (material) {
            setFormData(material);
        } else {
            setFormData({ name: '', unit: 'kg', stock: 0, lowStockThreshold: 0 });
        }
    }
  }, [isOpen, material]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'stock' || name === 'lowStockThreshold' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={material ? t.materials.editMaterial : t.materials.newMaterial}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t.materials.name}</label>
          <input name="name" type="text" value={formData.name} onChange={handleInputChange} className="input-style" required />
        </div>
        <div>
          <label className="label">{t.materials.unit}</label>
          <select name="unit" value={formData.unit} onChange={handleInputChange} className="input-style" >
            {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
         <div>
          <label className="label">{t.materials.stock}</label>
          <input name="stock" type="number" value={formData.stock} onChange={handleInputChange} className="input-style" required min="0" step="any"/>
        </div>
        <div>
          <label className="label">{t.materials.lowStock}</label>
          <input name="lowStockThreshold" type="number" value={formData.lowStockThreshold} onChange={handleInputChange} className="input-style" required min="0" step="any"/>
        </div>
        <div className="flex justify-end pt-4 space-x-2">
          <button type="button" onClick={onClose} className="btn-secondary">{t.common.cancel}</button>
          <button type="submit" className="btn-primary">{t.common.save}</button>
        </div>
      </form>
       <style>{`
        .label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-medium; color: #475569; }
        .dark .label { color: #d1d5db; }
        .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: white; border: 1px solid #cbd5e1; border-radius: 0.375rem; }
        .dark .input-style { background-color: #334155; border-color: #475569; color: white; }
        .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: white; background-color: #2563eb; }
        .btn-primary:hover { background-color: #1d4ed8; }
        .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: #334155; background-color: #e2e8f0; }
        .dark .btn-secondary { color: #e2e8f0; background-color: #475569; }
      `}</style>
    </Modal>
  );
};
