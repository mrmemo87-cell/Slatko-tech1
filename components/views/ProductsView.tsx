
import React, { useState } from 'react';
import { Product, Unit, Material, RecipeItem } from '../../types';
import { generateId, formatCurrency } from '../../utils';
import { PRODUCT_UNITS } from '../../constants';
import { Modal } from '../ui/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../ui/Icons';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useMaterials } from '../../hooks/useDataQueries';
import { PRODUCT_CATEGORIES, groupProductsByCategory } from '../../constants/productCategories';
import { PageHeader } from '../ui/PageHeader';

interface ProductsViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ t, showToast }) => {
  // Use React Query hooks
  const { data: products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(PRODUCT_CATEGORIES))); // Start with all expanded
  
  const loading = productsLoading || materialsLoading;

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const saveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: productData });
      } else {
        await createProduct.mutateAsync(productData);
      }
      handleCloseModal();
      showToast(t.products.saved);
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t.products.deleteConfirm)) {
      try {
        await deleteProduct.mutateAsync(id);
        showToast(t.products.deleted);
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
      }
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
            title={t.products.title}
            description="Manage your confectionery products and recipes"
            icon="🍰"
            theme="products"
          />
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center backdrop-blur-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow-[0_8px_32px_rgba(255,45,145,0.4)] border border-white/20"
          >
            <PlusIcon className="mr-2" />
            {t.products.newProduct}
          </button>
        </div>
        
        {/* Search Bar - Glassmorphism */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
          <input
            type="text"
            placeholder={t.common.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="relative w-full px-5 py-3 border-0 text-gray-900 dark:text-white rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50 shadow-lg placeholder-gray-400"
          />
        </div>

        <div className="space-y-4">
          {Object.entries(groupProductsByCategory(filteredProducts)).map(([categoryName, categoryProducts]) => {
            const isExpanded = expandedCategories.has(categoryName);
            
            return (
              <div key={categoryName} className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-2xl overflow-hidden border border-white/20 shadow-[0_8px_32px_0_rgba(0,208,232,0.2)]">
                {/* Category Header */}
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedCategories);
                    if (isExpanded) {
                      newExpanded.delete(categoryName);
                    } else {
                      newExpanded.add(categoryName);
                    }
                    setExpandedCategories(newExpanded);
                  }}
                  className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 hover:from-cyan-500/20 hover:to-pink-500/20 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`transform transition-transform text-white ${isExpanded ? 'rotate-90' : ''}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">{categoryName}</h3>
                    <span className="bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent text-xs px-3 py-1 rounded-full border border-white/20 font-semibold">
                      {categoryProducts.length} products
                    </span>
                  </div>
                </button>
                
                {/* Category Products */}
                {isExpanded && (
                  <div className="divide-y divide-white/10">
                    {categoryProducts.map(product => (
                      <div key={product.id} className="p-5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-white drop-shadow-lg">{product.name}</h4>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-white/70">
                              <span className="drop-shadow-lg">{product.unit}</span>
                              <span className="font-bold bg-gradient-to-r from-cyan-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,208,232,0.4)]">
                                {formatCurrency(product.defaultPrice)}
                              </span>
                              {product.recipe && (
                                <span className="text-xs bg-white/20 px-3 py-1 rounded-lg backdrop-blur-xl border border-white/20">
                                  {product.recipe.length} ingredients
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenModal(product)}
                              className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-lg transition-colors backdrop-blur-xl"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-pink-400 hover:text-pink-300 hover:bg-pink-500/20 rounded-lg transition-colors backdrop-blur-xl"
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {categoryProducts.length === 0 && searchTerm && (
                      <div className="p-4 text-center text-white/50">
                        No products in this category match your search
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredProducts.length === 0 && !searchTerm && (
            <div className="text-center py-12 text-white/60">
              No products found. Click "Add Product" to create your first product.
            </div>
          )}
          
          {filteredProducts.length === 0 && searchTerm && (
            <div className="text-center py-12 text-white/60">
              {t.common.noResults}
            </div>
          )}
        </div>

        <ProductFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={saveProduct}
          product={editingProduct}
          materials={materials}
          t={t}
        />
      </div>
    </div>
  );
};

// --- Product Form Modal ---
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>) => void;
  product: Product | null;
  materials: Material[];
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, product, materials, t }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('slice');
  const [defaultPrice, setDefaultPrice] = useState(0);
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);

  React.useEffect(() => {
    if (isOpen) {
        if (product) {
            setName(product.name);
            setUnit(product.unit);
            setDefaultPrice(product.defaultPrice);
            setRecipe(product.recipe || []);
        } else {
            setName('');
            setUnit('slice');
            setDefaultPrice(0);
            setRecipe([]);
        }
    }
  }, [isOpen, product]);
  
  const handleRecipeChange = (index: number, field: keyof RecipeItem, value: string) => {
      const newRecipe = [...recipe];
      (newRecipe[index] as any)[field] = field === 'quantity' ? Number(value) : value;
      setRecipe(newRecipe);
  };
  
  const addRecipeItem = () => {
    if (materials.length > 0) {
        setRecipe([...recipe, { materialId: materials[0].id, quantity: 0 }]);
    }
  };

  const removeRecipeItem = (index: number) => {
      setRecipe(recipe.filter((_, i) => i !== index));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, unit, defaultPrice, recipe: recipe.filter(r => r.quantity > 0) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? t.products.editProduct : t.products.newProduct}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t.products.name}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-style" required />
        </div>
        <div>
          <label className="label">{t.products.unit}</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="input-style">
            {PRODUCT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t.products.defaultPrice}</label>
          <input type="number" value={defaultPrice} onChange={(e) => setDefaultPrice(Number(e.target.value))} className="input-style" required min="0"/>
        </div>
        
        <div className="pt-2">
            <h4 className="text-md font-semibold text-slate-800 dark:text-white">{t.products.recipe}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t.products.recipeDescription}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {recipe.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <select 
                            value={item.materialId} 
                            onChange={e => handleRecipeChange(index, 'materialId', e.target.value)} 
                            className="input-style col-span-7"
                        >
                            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input 
                            type="number"
                            placeholder={t.purchases.quantity}
                            value={item.quantity}
                            onChange={e => handleRecipeChange(index, 'quantity', e.target.value)}
                            className="input-style col-span-3"
                            min="0"
                            step="any"
                        />
                        <button type="button" onClick={() => removeRecipeItem(index)} className="text-red-500 col-span-2 justify-self-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                ))}
            </div>
             <button type="button" onClick={addRecipeItem} className="text-blue-600 font-medium text-sm mt-2">{t.products.addMaterial}</button>
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
