import React, { useState } from 'react';
import { QuickDelivery } from './QuickDelivery';
import { QuickProduction } from './QuickProduction';

interface MobileActionButtonProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const MobileActionButton: React.FC<MobileActionButtonProps> = ({ t, showToast }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'delivery' | 'production' | null>(null);

  const handleOpenModal = (type: 'delivery' | 'production') => {
    setActiveModal(type);
    setIsMenuOpen(false);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Quick Action Menu */}
        {isMenuOpen && (
          <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-xl border p-2 min-w-48">
            <button
              onClick={() => handleOpenModal('delivery')}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">📦</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Quick Order</div>
                <div className="text-sm text-gray-500">Create delivery</div>
              </div>
            </button>
            
            <button
              onClick={() => handleOpenModal('production')}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">⚙️</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Quick Batch</div>
                <div className="text-sm text-gray-500">Start production</div>
              </div>
            </button>

            <div className="border-t my-2"></div>
            
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-full p-3 text-center text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-all transform ${
            isMenuOpen 
              ? 'bg-gray-600 rotate-45' 
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
          }`}
        >
          {isMenuOpen ? '✕' : '+'}
        </button>
      </div>

      {/* Modals */}
      {activeModal === 'delivery' && (
        <QuickDelivery 
          t={t} 
          showToast={showToast} 
          onClose={handleCloseModal} 
        />
      )}
      
      {activeModal === 'production' && (
        <QuickProduction 
          t={t} 
          showToast={showToast} 
          onClose={handleCloseModal} 
        />
      )}

      {/* Backdrop for menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-30"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
};