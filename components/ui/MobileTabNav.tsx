import React from 'react';
import { DashboardIcon, MaterialsIcon, PurchasesIcon, ProductionIcon, DeliveriesIcon, ClientsIcon, MoreIcon } from './Icons';

interface MobileTabNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isDarkMode: boolean;
}

export const MobileTabNav: React.FC<MobileTabNavProps> = ({ currentView, onViewChange, isDarkMode }) => {
  const [showMore, setShowMore] = React.useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'deliveries', label: 'Deliveries', icon: DeliveriesIcon },
    { id: 'production', label: 'Production', icon: ProductionIcon },
    { id: 'materials', label: 'Materials', icon: MaterialsIcon },
    { id: 'more', label: 'More', icon: MoreIcon },
  ];

  const moreTabs = [
    { id: 'clients', label: 'Clients' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'products', label: 'Products' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'reports', label: 'Reports' },
    { id: 'business-intelligence', label: 'Analytics' },
    { id: 'import', label: 'Import Data' },
  ];

  const handleTabClick = (id: string) => {
    if (id === 'more') {
      setShowMore(!showMore);
    } else {
      onViewChange(id);
      setShowMore(false);
    }
  };

  return (
    <>
      {/* Main Bottom Tab Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t-2 ${
        isDarkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex justify-around items-center">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors duration-200 min-h-[70px] ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : `text-gray-700 dark:text-gray-300 font-semibold ${
                        tab.id === 'more' ? '' : 'hover:text-gray-900 dark:hover:text-gray-100'
                      }`
                }`}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Menu Overlay */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-30 bottom-16"
            onClick={() => setShowMore(false)}
          />
          {/* More Menu */}
          <div className={`fixed bottom-20 right-2 z-50 rounded-lg shadow-xl border-2 ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-600' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="py-2 min-w-48">
              {moreTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onViewChange(tab.id);
                    setShowMore(false);
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors font-semibold ${
                    currentView === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : `text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700`
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};