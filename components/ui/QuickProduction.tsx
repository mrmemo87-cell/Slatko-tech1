import React, { useState, useEffect } from 'react';
import { Product, Material, ProductionBatch } from '../../types';
import { supabaseApi } from '../../services/supabase-api';
import { generateId, todayISO } from '../../utils';
import { PRODUCT_CATEGORIES, groupProductsByCategory } from '../../constants/productCategories';

interface QuickProductionProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
}

// Preset batch quantities
const QUICK_BATCH_SIZES = [1, 2, 4, 6, 8, 10, 12, 16, 20, 24];

export const QuickProduction: React.FC<QuickProductionProps> = ({ t, showToast, onClose }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  const [materialCheck, setMaterialCheck] = useState<{available: boolean, details: any[]}>({available: false, details: []});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, materialsData] = await Promise.all([
        supabaseApi.getProducts(),
        supabaseApi.getMaterials()
      ]);
      setProducts(productsData);
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct && selectedQuantity > 0) {
      checkMaterialAvailability();
    }
  }, [selectedProduct, selectedQuantity]);

  const checkMaterialAvailability = () => {
    if (!selectedProduct?.recipe) {
      setMaterialCheck({available: true, details: []});
      return;
    }

    const details = selectedProduct.recipe.map(recipeItem => {
      const material = materials.find(m => m.id === recipeItem.materialId);
      const required = recipeItem.quantity * selectedQuantity;
      const available = material?.stock || 0;
      
      return {
        materialName: material?.name || 'Unknown',
        required,
        available,
        unit: material?.unit || '',
        sufficient: available >= required
      };
    });

    const allAvailable = details.every(d => d.sufficient);
    setMaterialCheck({available: allAvailable, details});
  };

  const handleSubmit = async () => {
    if (!selectedProduct || selectedQuantity === 0 || !materialCheck.available) return;

    try {
      await supabaseApi.createProductionBatch({
        productId: selectedProduct.id,
        quantity: selectedQuantity,
        startDate: new Date().toISOString(),
        notes: `Quick batch - ${new Date().toLocaleTimeString()}`
      });
      
      showToast(`Production batch created: ${selectedQuantity}x ${selectedProduct.name}`);
      onClose();
    } catch (error) {
      console.error('Error creating production batch:', error);
      showToast('Error creating production batch', 'error');
    }
  };

  const ProductGrid = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">Select Product</h3>
      <div className="space-y-3">
        {Object.entries(groupProductsByCategory(products)).map(([categoryName, categoryProducts]) => {
          const isExpanded = expandedCategories.has(categoryName);
          const selectedInCategory = selectedProduct && categoryProducts.find(p => p.id === selectedProduct.id);
          
          return (
            <div key={categoryName} className="bg-white border rounded-lg">
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
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900">{categoryName}</h4>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {categoryProducts.length} products
                  </span>
                </div>
                {selectedInCategory && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    Selected
                  </span>
                )}
              </button>
              
              {/* Category Products */}
              {isExpanded && (
                <div className="border-t space-y-2 p-2">
                  {categoryProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full p-3 border-2 rounded-lg text-left transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.unit}</div>
                      {product.recipe && (
                        <div className="text-xs text-gray-400 mt-1">
                          {product.recipe.length} ingredients
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const QuantitySelector = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setSelectedProduct(null)}
          className="text-blue-600 text-sm"
        >
          ← Change Product
        </button>
        <h3 className="text-lg font-semibold">Batch Size</h3>
        <div></div>
      </div>
      
      <div className="bg-blue-50 p-3 rounded-lg text-center">
        <div className="font-medium">{selectedProduct?.name}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {QUICK_BATCH_SIZES.map(size => (
          <button
            key={size}
            onClick={() => setSelectedQuantity(size)}
            className={`py-3 px-2 rounded-lg font-medium transition-colors ${
              selectedQuantity === size
                ? 'bg-blue-600 text-white'
                : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-blue-300'
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Custom quantity input */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Quantity
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={selectedQuantity || ''}
          onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 0)}
          className="w-full p-3 border-2 border-gray-200 rounded-lg text-lg text-center"
          placeholder="Enter quantity"
        />
      </div>
    </div>
  );

  const MaterialCheckDisplay = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setSelectedQuantity(0)}
          className="text-blue-600 text-sm"
        >
          ← Change Quantity
        </button>
        <h3 className="text-lg font-semibold">Material Check</h3>
        <div></div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg text-center">
        <div className="font-medium">{selectedProduct?.name}</div>
        <div className="text-sm text-gray-600">Batch size: {selectedQuantity}</div>
      </div>

      {materialCheck.details.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Required Materials:</h4>
          {materialCheck.details.map((detail, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                detail.sufficient 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{detail.materialName}</span>
                <span className={detail.sufficient ? 'text-green-600' : 'text-red-600'}>
                  {detail.sufficient ? '✓' : '✗'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Need: {detail.required} {detail.unit} | 
                Available: {detail.available} {detail.unit}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`p-4 rounded-lg ${
        materialCheck.available 
          ? 'bg-green-100 border-green-300' 
          : 'bg-red-100 border-red-300'
      }`}>
        <div className="text-center font-medium">
          {materialCheck.available 
            ? '✅ Ready to produce' 
            : '❌ Insufficient materials'}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!materialCheck.available}
          className={`flex-1 py-3 rounded-lg font-medium ${
            materialCheck.available
              ? 'bg-green-600 text-white'
              : 'bg-gray-300 text-gray-500'
          }`}
        >
          Start Production
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-gray-100 w-full max-w-md h-[90vh] rounded-t-2xl p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Quick Production</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {!selectedProduct && <ProductGrid />}
        {selectedProduct && selectedQuantity === 0 && <QuantitySelector />}
        {selectedProduct && selectedQuantity > 0 && <MaterialCheckDisplay />}
      </div>
    </div>
  );
};