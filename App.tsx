
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardView } from './components/views/DashboardView';
import { ProductsView } from './components/views/ProductsView';
import { ClientsView } from './components/views/ClientsView';
import { ProductionView } from './components/views/ProductionView';
import { DeliveriesView } from './components/views/DeliveriesView';
import { ReportsView } from './components/views/ReportsView';
import { InventoryView } from './components/views/InventoryView';
import { MaterialsView } from './components/views/MaterialsView';
import { PurchasesView } from './components/views/PurchasesView';
import { BulkImport } from './components/views/BulkImport';
import { SlatkoIcon, DashboardIcon, ProductsIcon, ClientsIcon, ProductionIcon, DeliveriesIcon, ReportsIcon, LanguageIcon, SunIcon, MoonIcon, InventoryIcon, MaterialsIcon, PurchasesIcon, BusinessIntelligenceIcon, LogoutIcon, ImportIcon } from './components/ui/Icons';
import { AlertCenter } from './components/ui/AlertCenter';
import { BusinessMetricsDashboard } from './components/views/BusinessMetricsDashboard';
import { MobileActionButton } from './components/ui/MobileActionButton';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { LoginForm } from './components/auth/LoginForm';
import { translations } from './i18n/translations';
import { ToastContainer } from './components/ui/Toast';
import { Toast } from './types';
import { generateId } from './utils';

type View = 'dashboard' | 'products' | 'clients' | 'production' | 'inventory' | 'deliveries' | 'reports' | 'materials' | 'purchases' | 'business-intelligence' | 'import';

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const t = useMemo(() => translations[lang], [lang]);

  // Handle body scroll lock on mobile when sidebar is open
  React.useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    
    // Cleanup on unmount
    return () => document.body.classList.remove('sidebar-open');
  }, [isSidebarOpen]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Show loading screen while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <SlatkoIcon className="h-16 w-16 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if user is not authenticated
  if (!user) {
    return <LoginForm t={t} />;
  }


  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'ru' : 'en');
  };

  const renderView = () => {
    const props = { t, showToast };
    switch (view) {
      case 'dashboard':
        return <DashboardView t={t} />;
      case 'materials':
        return <MaterialsView {...props} />;
      case 'purchases':
        return <PurchasesView {...props} />;
      case 'production':
        return <ProductionView {...props} />;
      case 'inventory':
        return <InventoryView t={t} />;
      case 'deliveries':
        return <DeliveriesView {...props} />;
      case 'products':
        return <ProductsView {...props} />;
      case 'clients':
        return <ClientsView {...props} />;
      case 'reports':
        return <ReportsView t={t} />;
      case 'business-intelligence':
        return <BusinessMetricsDashboard t={t} />;
      case 'import':
        return <BulkImport {...props} />;
      default:
        return <DashboardView t={t} />;
    }
  };

  const NavItem = ({ icon, label, id }: { icon: React.ReactElement, label: string, id: View }) => (
    <button
      onClick={() => {
        setView(id);
        setIsSidebarOpen(false); // Close sidebar on mobile after selecting
      }}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        view === id
          ? 'bg-blue-600 text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <div className={`flex h-screen bg-slate-100 dark:bg-slate-900 ${isDarkMode ? 'dark' : ''}`}>
        {/* Mobile Full Menu Overlay */}
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 bg-white dark:bg-slate-800 z-50 overflow-y-auto">
            <div className="p-4">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <SlatkoIcon className="h-8 w-8 text-blue-600" />
                  <span className="ml-2 text-xl font-bold text-slate-800 dark:text-white">Slatko Menu</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Mobile menu items in a grid */}
              <div className="grid grid-cols-2 gap-4">
                <NavItem icon={<MaterialsIcon />} label={t.navigation.materials} id="materials" />
                <NavItem icon={<PurchasesIcon />} label={t.navigation.purchases} id="purchases" />
                <NavItem icon={<ProductionIcon />} label={t.navigation.production} id="production" />
                <NavItem icon={<InventoryIcon />} label={t.navigation.inventory} id="inventory" />
                <NavItem icon={<ReportsIcon />} label={t.navigation.reports} id="reports" />
                <NavItem icon={<BusinessIntelligenceIcon />} label={t.navigation.businessIntelligence} id="business-intelligence" />
                <NavItem icon={<ImportIcon />} label="Import Data" id="import" />
              </div>
              
              {/* Settings section */}
              <div className="mt-8 space-y-2">
                <hr className="my-4 border-slate-200 dark:border-slate-700" />
                <button onClick={toggleLanguage} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                    <LanguageIcon />
                    <span className="ml-3">{lang === 'en' ? 'Русский' : 'English'}</span>
                </button>
                <button onClick={toggleTheme} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                    <span className="ml-3">{isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}</span>
                </button>
                <hr className="my-2 border-slate-200 dark:border-slate-700" />
                <button onClick={signOut} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                    <LogoutIcon />
                    <span className="ml-3">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Desktop Sidebar - Hidden on Mobile */}
        <aside className="no-print hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 w-64">
          <div className="flex items-center mb-8 px-2">
            <SlatkoIcon className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-slate-800 dark:text-white">Slatko</span>
          </div>
          <nav className="flex-1 space-y-2">
            <NavItem icon={<DashboardIcon />} label={t.navigation.dashboard} id="dashboard" />
            <hr className="my-2 border-slate-200 dark:border-slate-700" />
            <NavItem icon={<MaterialsIcon />} label={t.navigation.materials} id="materials" />
            <NavItem icon={<PurchasesIcon />} label={t.navigation.purchases} id="purchases" />
            <NavItem icon={<ProductionIcon />} label={t.navigation.production} id="production" />
            <hr className="my-2 border-slate-200 dark:border-slate-700" />
            <NavItem icon={<InventoryIcon />} label={t.navigation.inventory} id="inventory" />
            <NavItem icon={<DeliveriesIcon />} label={t.navigation.deliveries} id="deliveries" />
            <hr className="my-2 border-slate-200 dark:border-slate-700" />
            <NavItem icon={<ProductsIcon />} label={t.navigation.products} id="products" />
            <NavItem icon={<ClientsIcon />} label={t.navigation.clients} id="clients" />
            <NavItem icon={<ReportsIcon />} label={t.navigation.reports} id="reports" />
            <hr className="my-2 border-slate-200 dark:border-slate-700" />
            <NavItem icon={<BusinessIntelligenceIcon />} label={t.navigation.businessIntelligence} id="business-intelligence" />
            <NavItem icon={<ImportIcon />} label="Import Data" id="import" />
          </nav>
          <div className="mt-auto space-y-2">
              <button onClick={toggleLanguage} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                  <LanguageIcon />
                  <span className="ml-3">{lang === 'en' ? 'Русский' : 'English'}</span>
              </button>
              <button onClick={toggleTheme} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                  {isDarkMode ? <SunIcon /> : <MoonIcon />}
                  <span className="ml-3">{isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}</span>
              </button>
              <hr className="my-2 border-slate-200 dark:border-slate-700" />
              <button onClick={signOut} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                  <LogoutIcon />
                  <span className="ml-3">Sign Out</span>
              </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
          {/* Header with Menu Button and Alert Center */}
          <div className="no-print bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 md:px-8 py-4">
            <div className="flex justify-between items-center">
              {/* Logo - Always visible */}
              <div className="flex items-center">
                <SlatkoIcon className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-lg font-bold text-slate-800 dark:text-white">Slatko</span>
              </div>
              
              <AlertCenter t={t} />
            </div>
          </div>
          
          {/* Main Content - Add bottom padding for mobile nav */}
          <div className="p-4 sm:p-6 md:p-8 pb-20 lg:pb-8">
            {renderView()}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50">
          <div className="flex justify-around items-center py-2">
            <button
              onClick={() => setView('dashboard')}
              className={`flex flex-col items-center p-2 rounded-lg ${
                view === 'dashboard' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <DashboardIcon />
              <span className="text-xs mt-1">Dashboard</span>
            </button>
            <button
              onClick={() => setView('products')}
              className={`flex flex-col items-center p-2 rounded-lg ${
                view === 'products' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <ProductsIcon />
              <span className="text-xs mt-1">Products</span>
            </button>
            <button
              onClick={() => setView('clients')}
              className={`flex flex-col items-center p-2 rounded-lg ${
                view === 'clients' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <ClientsIcon />
              <span className="text-xs mt-1">Clients</span>
            </button>
            <button
              onClick={() => setView('deliveries')}
              className={`flex flex-col items-center p-2 rounded-lg ${
                view === 'deliveries' ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <DeliveriesIcon />
              <span className="text-xs mt-1">Orders</span>
            </button>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex flex-col items-center p-2 rounded-lg text-slate-600 dark:text-slate-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs mt-1">More</span>
            </button>
          </div>
        </nav>

        {/* Mobile Action Button */}
        <MobileActionButton t={t} showToast={showToast} />
      </div>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
