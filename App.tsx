
import React, { useState, useMemo } from 'react';
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

  const t = useMemo(() => translations[lang], [lang]);

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
      onClick={() => setView(id)}
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
        <aside className="no-print flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 transition-colors duration-200">
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
          {/* Header with Alert Center */}
          <div className="no-print bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 md:px-8 py-4">
            <div className="flex justify-end">
              <AlertCenter t={t} />
            </div>
          </div>
          
          {/* Main Content */}
          <div className="p-4 sm:p-6 md:p-8">
            {renderView()}
          </div>
        </main>
        
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
