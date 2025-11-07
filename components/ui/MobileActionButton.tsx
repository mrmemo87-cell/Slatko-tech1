import React, { useState } from 'react';
import { PlusIcon, DeliveriesIcon, ProductionIcon } from './Icons';

interface MobileActionButtonProps {
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const MobileActionButton: React.FC<MobileActionButtonProps> = ({ t, showToast }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'quick-delivery',
      label: '📦 Quick Delivery',
      icon: DeliveriesIcon,
      action: () => {
        showToast('Quick delivery creation coming soon!', 'success');
      }
    },
    {
      id: 'quick-production',
      label: '🍰 Quick Production',
      icon: ProductionIcon,
      action: () => {
        showToast('Quick production batch coming soon!', 'success');
      }
    }
  ];

  return (
    <>
      {/* Floating Action Button Menu */}
      <div className="fixed bottom-24 right-6 z-30">
        {/* Menu Items */}
        {isOpen && (
          <div className="flex flex-col gap-3 mb-3">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.action();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg transition-all transform hover:scale-105 whitespace-nowrap"
              >
                <span className="text-lg">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg transition-all transform ${
            isOpen 
              ? 'bg-red-500 hover:bg-red-600 scale-110' 
              : 'bg-blue-600 hover:bg-blue-700 scale-100'
          } text-white flex items-center justify-center font-bold text-2xl`}
        >
          {isOpen ? '✕' : '+'}
        </button>
      </div>

      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};