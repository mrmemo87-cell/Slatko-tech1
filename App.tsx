
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
import { DataProvider } from './providers/DataProvider';
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('.dropdown-menu')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // One-time migration and setup - CRITICAL for data source consistency
  useEffect(() => {
    const initializeDataSources = async () => {
      if (user) {
        console.log('🔥 INITIALIZING SUPABASE AS SINGLE SOURCE OF TRUTH 🔥');
        
        try {
          // Import migration utilities
          const { migrateLocalStorageToSupabase } = await import('./utils/migration');
          const result = await migrateLocalStorageToSupabase();
          
          if (result.success) {
            console.log('✅ Migration completed successfully');
            showToast('Data migration completed - using database', 'success');
          } else if (result.errors.length > 0) {
            console.error('❌ Migration errors:', result.errors);
          }
        } catch (error) {
          console.error('❌ Migration failed:', error);
        }
      }
    };

    initializeDataSources();
  }, [user]); // Run when user auth state changes

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
        if (window.innerWidth < 1024) setIsMenuOpen(false); // Close on mobile
      }}
      title={isMenuOpen ? '' : label}
      className={`group flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
        view === id 
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      {isMenuOpen && <span className="ml-3 truncate">{label}</span>}
      {!isMenuOpen && (
        <div className="absolute left-16 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {label}
        </div>
      )}
    </button>
  );

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex ${isDarkMode ? 'dark' : ''}`}>
        
        {/* COMPACT SIDEBAR */}
        <aside className={`no-print bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ${
          isMenuOpen ? 'w-64' : 'w-16'
        } fixed left-0 top-0 h-full z-50 lg:relative lg:z-0 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          
          {/* Logo and Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className={`flex items-center ${isMenuOpen ? '' : 'justify-center'}`}>
              <SlatkoIcon className="h-8 w-8 text-blue-600" />
              {isMenuOpen && <span className="ml-2 text-xl font-bold text-slate-800 dark:text-white">Slatko</span>}
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {!isMenuOpen && (
              <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-center">
                •••
              </div>
            )}
            
            {isMenuOpen && (
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Main
              </div>
            )}
            <MenuItem icon={<DashboardIcon />} label={t.navigation.dashboard} id="dashboard" />
            
            {isMenuOpen && (
              <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Production
                </div>
              </div>
            )}
            <MenuItem icon={<MaterialsIcon />} label={t.navigation.materials} id="materials" />
            <MenuItem icon={<PurchasesIcon />} label={t.navigation.purchases} id="purchases" />
            <MenuItem icon={<ProductionIcon />} label={t.navigation.production} id="production" />
            
            {isMenuOpen && (
              <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sales
                </div>
              </div>
            )}
            <MenuItem icon={<ProductsIcon />} label={t.navigation.products} id="products" />
            <MenuItem icon={<ClientsIcon />} label={t.navigation.clients} id="clients" />
            <MenuItem icon={<DeliveriesIcon />} label={t.navigation.deliveries} id="deliveries" />
            <MenuItem icon={<InventoryIcon />} label={t.navigation.inventory} id="inventory" />
            
            {isMenuOpen && (
              <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Analytics
                </div>
              </div>
            )}
            <MenuItem icon={<ReportsIcon />} label={t.navigation.reports} id="reports" />
            <MenuItem icon={<BusinessIntelligenceIcon />} label={t.navigation.businessIntelligence} id="business-intelligence" />
            <MenuItem icon={<ImportIcon />} label="Import Data" id="import" />
          </nav>
          
          {/* Bottom Settings Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-2 space-y-1">
            {isMenuOpen && (
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Settings
              </div>
            )}
            
            <button
              onClick={() => { 
                toggleLanguage(); 
                if (window.innerWidth < 1024) setIsMenuOpen(false); 
              }}
              title={isMenuOpen ? '' : (lang === 'en' ? 'Русский' : 'English')}
              className="group flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <div className="flex-shrink-0"><LanguageIcon /></div>
              {isMenuOpen && <span className="ml-3 truncate">{lang === 'en' ? 'Русский' : 'English'}</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {lang === 'en' ? 'Русский' : 'English'}
                </div>
              )}
            </button>
            
            <button
              onClick={() => { 
                toggleTheme(); 
                if (window.innerWidth < 1024) setIsMenuOpen(false); 
              }}
              title={isMenuOpen ? '' : (isDarkMode ? t.navigation.lightMode : t.navigation.darkMode)}
              className="group flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <div className="flex-shrink-0">{isDarkMode ? <SunIcon /> : <MoonIcon />}</div>
              {isMenuOpen && <span className="ml-3 truncate">{isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}
                </div>
              )}
            </button>
            
            <button
              onClick={() => {
                // Clear React Query cache
                if ((window as any).queryClient) {
                  (window as any).queryClient.clear();
                }
                // Force reload
                window.location.reload();
                if (window.innerWidth < 1024) setIsMenuOpen(false);
              }}
              title={isMenuOpen ? '' : 'Clear Cache'}
              className="group flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              {isMenuOpen && <span className="ml-3 truncate">Clear Cache</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Clear Cache
                </div>
              )}
            </button>
            
            <button
              onClick={signOut}
              title={isMenuOpen ? '' : 'Sign Out'}
              className="group flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <div className="flex-shrink-0"><LogoutIcon /></div>
              {isMenuOpen && <span className="ml-3 truncate">Sign Out</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Sign Out
                </div>
              )}
            </button>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <div className="flex-1 transition-all duration-300 lg:ml-0">
          
          {/* Top bar for mobile with toggle and alert center */}
          <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between sticky top-0 z-40">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <AlertCenter t={t} />
          </div>
          
          {/* Main content */}
          <main className="p-4 sm:p-6 lg:p-8">
            {renderView()}
          </main>
          
          {/* Alert Center for desktop - positioned absolutely */}
          <div className="hidden lg:block fixed top-4 right-4 z-30">
            <AlertCenter t={t} />
          </div>
        </div>
        
        {/* Mobile Action Button */}
        <MobileActionButton t={t} showToast={showToast} />
        
        {/* Mobile overlay */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DataProvider>
  );
}
