import React, { useState } from 'react';
import { Product, Unit, Material, RecipeItem } from '../../types';
import { generateId, formatCurrency } from '../../utils';
import { PRODUCT_UNITS } from '../../constants';
import { Modal } from '../ui/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';
import { 
  useProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  useMaterials 
} from '../../hooks/useDataQueries';

interface ProductsViewProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ t, showToast }) => {
  // React Query hooks - Supabase as single source of truth
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  
  // Mutations with automatic cache invalidation
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  // Local state for UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loading = productsLoading || materialsLoading;

  // Handle errors
  if (productsError) {
    console.error('Products loading error:', productsError);
    showToast('Error loading products', 'error');
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSave = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct) {
        // Update existing product
        await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          data: productData
        });
        showToast(t.products.updated);
      } else {
        // Create new product
        await createProductMutation.mutateAsync(productData);
        showToast(t.products.saved);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t.products.deleteConfirm)) {
      try {
        await deleteProductMutation.mutateAsync(id);
        showToast(t.products.deleted);
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.products.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {products.length} products • React Query powered 🚀
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          disabled={createProductMutation.isPending}
        >
          <PlusIcon />
          <span className="ml-2">{t.products.new}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder={t.products.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
        />
        <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">{t.products.name}</th>
              <th scope="col" className="px-6 py-3">{t.products.unit}</th>
              <th scope="col" className="px-6 py-3">{t.products.price}</th>
              <th scope="col" className="px-6 py-3">{t.products.recipe}</th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">{t.common.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  {product.name}
                </td>
                <td className="px-6 py-4">{product.unit}</td>
                <td className="px-6 py-4">{formatCurrency(product.defaultPrice)}</td>
                <td className="px-6 py-4">
                  {product.recipe && product.recipe.length > 0 ? (
                    <span className="text-green-600">{product.recipe.length} ingredients</span>
                  ) : (
                    <span className="text-slate-400">No recipe</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      disabled={updateProductMutation.isPending}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      disabled={deleteProductMutation.isPending}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm ? t.products.noResults : t.products.empty}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? t.products.edit : t.products.new}
      >
        <ProductFormContent
          product={editingProduct}
          materials={materials}
          onSave={handleSave}
          onCancel={handleCloseModal}
          t={t}
          isLoading={createProductMutation.isPending || updateProductMutation.isPending}
        />
      </Modal>
    </div>
  );
};

// Product form component (same as before, but with loading state)
const ProductFormContent: React.FC<{
  product: Product | null;
  materials: Material[];
  onSave: (product: Omit<Product, 'id'>) => void;
  onCancel: () => void;
  t: any;
  isLoading: boolean;
}> = ({ product, materials, onSave, onCancel, t, isLoading }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    unit: product?.unit || 'piece' as Unit,
    defaultPrice: product?.defaultPrice || 0,
    recipe: product?.recipe || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t.products.name}
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          required
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t.products.unit}
          </label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value as Unit }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            disabled={isLoading}
          >
            {PRODUCT_UNITS.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t.products.price}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.defaultPrice}
            onChange={(e) => setFormData(prev => ({ ...prev, defaultPrice: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          disabled={isLoading}
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !formData.name.trim()}
        >
          {isLoading ? 'Saving...' : (product ? t.common.save : t.common.create)}
        </button>
      </div>
    </form>
  );
};