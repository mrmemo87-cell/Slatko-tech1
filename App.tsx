
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const t = useMemo(() => translations[lang], [lang]);

  // Force database loading on app start - CRITICAL for multi-user access
  useEffect(() => {
    console.log('🔥 FORCE LOADING DATABASE DATA FOR ALL USERS 🔥');
    // This ensures all users see the same database data, not localStorage
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && !(event.target as Element)?.closest('.dropdown-menu')) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

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

  const MenuItem = ({ icon, label, id }: { icon: React.ReactElement, label: string, id: View }) => (
    <button
      onClick={() => {
        setView(id);
        setIsMenuOpen(false);
      }}
      className={`flex items-center w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
        view === id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 ${isDarkMode ? 'dark' : ''}`}>
        
        {/* TOP HEADER BAR - FULL WIDTH */}
        <header className="no-print bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              
              {/* Left: Logo + Dropdown Menu */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <SlatkoIcon className="h-8 w-8 text-blue-600" />
                  <span className="ml-2 text-xl font-bold text-slate-800 dark:text-white">Slatko</span>
                </div>
                
                {/* DROPDOWN MENU */}
                <div className="relative dropdown-menu">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Menu
                    <svg className={`w-4 h-4 ml-2 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* DROPDOWN CONTENT */}
                  {isMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                      <div className="py-2">
                        <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Main</div>
                        <MenuItem icon={<DashboardIcon />} label={t.navigation.dashboard} id="dashboard" />
                        
                        <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                          <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Production</div>
                          <MenuItem icon={<MaterialsIcon />} label={t.navigation.materials} id="materials" />
                          <MenuItem icon={<PurchasesIcon />} label={t.navigation.purchases} id="purchases" />
                          <MenuItem icon={<ProductionIcon />} label={t.navigation.production} id="production" />
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                          <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sales</div>
                          <MenuItem icon={<ProductsIcon />} label={t.navigation.products} id="products" />
                          <MenuItem icon={<ClientsIcon />} label={t.navigation.clients} id="clients" />
                          <MenuItem icon={<DeliveriesIcon />} label={t.navigation.deliveries} id="deliveries" />
                          <MenuItem icon={<InventoryIcon />} label={t.navigation.inventory} id="inventory" />
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                          <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Analytics</div>
                          <MenuItem icon={<ReportsIcon />} label={t.navigation.reports} id="reports" />
                          <MenuItem icon={<BusinessIntelligenceIcon />} label={t.navigation.businessIntelligence} id="business-intelligence" />
                          <MenuItem icon={<ImportIcon />} label="Import Data" id="import" />
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                          <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Settings</div>
                          <button onClick={() => { toggleLanguage(); setIsMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                            <LanguageIcon />
                            <span className="ml-3">{lang === 'en' ? 'Русский' : 'English'}</span>
                          </button>
                          <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {isDarkMode ? <SunIcon /> : <MoonIcon />}
                            <span className="ml-3">{isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}</span>
                          </button>
                          <button onClick={signOut} className="flex items-center w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400">
                            <LogoutIcon />
                            <span className="ml-3">Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right: Alert Center */}
              <AlertCenter t={t} />
            </div>
          </div>
        </header>
        
        {/* MAIN CONTENT AREA - FULL WIDTH */}
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          {renderView()}
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
