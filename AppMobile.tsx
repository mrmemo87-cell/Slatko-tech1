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
import { SlatkoIcon, LanguageIcon, SunIcon, MoonIcon, LogoutIcon } from './components/ui/Icons';
import { MobileTabNav } from './components/ui/MobileTabNav';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const t = useMemo(() => translations[lang], [lang]);

  // Detect screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className={`flex flex-col h-screen w-screen ${isDarkMode ? 'dark' : ''}`}>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />

        {/* Mobile Header */}
        <header className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20`}>
          <div className="flex items-center">
            <SlatkoIcon className="h-8 w-8 text-blue-600" />
            <h1 className={`ml-3 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Slatko</h1>
          </div>
          
          {/* Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title={lang === 'en' ? 'Switch to Russian' : 'Switch to English'}
            >
              <LanguageIcon className="h-5 w-5" />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <button
              onClick={signOut}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-slate-100 text-red-500'}`}
              title="Sign Out"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mobile Content Area - with padding for bottom nav */}
        <main className={`flex-1 overflow-y-auto pb-20 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="p-4">
            {renderView()}
          </div>
        </main>

        {/* Mobile Action Button */}
        <MobileActionButton t={t} showToast={showToast} />

        {/* Bottom Tab Navigation */}
        <MobileTabNav currentView={view} onViewChange={setView} isDarkMode={isDarkMode} />
      </div>
    );
  }

  // Desktop Layout (unchanged)
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
            {/* Navigation items would go here */}
          </nav>
          
          <div className="mt-auto space-y-2">
            <button onClick={toggleLanguage} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
              <LanguageIcon />
              <span className="ml-3">{lang === 'en' ? 'Русский' : 'English'}</span>
            </button>
            <button onClick={toggleTheme} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
              <span className="ml-3">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button onClick={signOut} className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
              <LogoutIcon />
              <span className="ml-3">Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
          <div className="p-4 sm:p-6 md:p-8">
            {renderView()}
          </div>
        </main>

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