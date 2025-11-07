import React, { useState, useMemo, useEffect, useRef } from 'react';
import './styles/mobile-optimizations.css';
import { DashboardView } from './components/views/DashboardView';
import { AllOrderRecordsView } from './components/views/AllOrderRecordsView';
import { ProductsView } from './components/views/ProductsView';
import { ClientsView } from './components/views/ClientsView';
import { ProductionView } from './components/views/ProductionView';
// Removed unused: DeliveriesView
import { ReportsView } from './components/views/ReportsView';
import { InventoryView } from './components/views/InventoryView';
import { MaterialsView } from './components/views/MaterialsView';
import { PurchasesView } from './components/views/PurchasesView';
import { BulkImport } from './components/views/BulkImport';
import {
  SlatkoIcon,
  DashboardIcon,
  ProductsIcon,
  ClientsIcon,
  ProductionIcon,
  DeliveriesIcon,
  ReportsIcon,
  LanguageIcon,
  SunIcon,
  MoonIcon,
  InventoryIcon,
  MaterialsIcon,
  PurchasesIcon,
  BusinessIntelligenceIcon,
  LogoutIcon,
  ImportIcon,
} from './components/ui/Icons';
import { AlertCenter } from './components/ui/AlertCenter';
import { QuickOrderButton } from './components/ui/QuickOrderButton';
import { MobileTabNav } from './components/ui/MobileTabNav';
import { UnifiedDeliveryPortal } from './components/portals/UnifiedDeliveryPortal';
import { UnifiedProductionPortal } from './components/portals/UnifiedProductionPortal';
import { UnifiedAdminPortal } from './components/views/UnifiedAdminPortal';
// Removed unused: UnifiedOrderTracking
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { LoginForm } from './components/auth/LoginForm';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { DataProvider } from './providers/DataProvider';
import { translations } from './i18n/translations';
import { subscribeToToasts, getCurrentToasts } from './utils/toast';
import { ToastContainer } from './components/ui/Toast';
import { Toast } from './types';
import { generateId } from './utils';

// App views type
export type View =
  | 'dashboard'
  | 'products'
  | 'clients'
  | 'production'
  | 'inventory'
  | 'reports'
  | 'materials'
  | 'purchases'
  | 'import'
  | 'production-portal'
  | 'delivery-portal'
  | 'admin-portal'
  | 'all-payments';

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [lang, setLang] = useState<'en' | 'ru' | 'ar'>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authLoadingTimeout, setAuthLoadingTimeout] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);

  const t = useMemo(() => translations[lang], [lang]);

  // Memoize role check to avoid spam and redundant work
  const isWorker = useMemo(() => {
    // Try multiple ways to get the role
    const roleFromProp = user?.role;
    const roleFromMetadata = (user as any)?.user_metadata?.role;
    const roleFromAppMetadata = (user as any)?.app_metadata?.role;
    
    const role = (roleFromProp || roleFromMetadata || roleFromAppMetadata || '').toString().toLowerCase();
    
    console.log('🔍 CHECKING ROLE:', {
      roleFromProp,
      roleFromMetadata, 
      roleFromAppMetadata,
      finalRole: role,
      userKeys: Object.keys(user || {})
    });
    
    const result = role.includes('worker') || role.includes('production');
    console.log('✅ isWorker:', result);
    return result;
  }, [user?.role, user?.user_metadata, user?.app_metadata]);

  // Safety timeout for loading state - if stuck for 3 seconds, force proceed
  useEffect(() => {
    if (!loading) {
      setAuthLoadingTimeout(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('⏱️ Auth loading timeout (3s) - forcing UI');
      setAuthLoadingTimeout(true);
    }, 3000); // Reduced from 5000 to 3000

    return () => clearTimeout(timeout);
  }, [loading]);

  // CRITICAL: Force workers to production portal ONLY
  // This prevents workers from accessing other views even if they try to manually navigate
  useEffect(() => {
    if (isWorker) {
      if (view !== 'production-portal') {
        console.warn(`🔒 FORCING WORKER BACK: Current view is "${view}", forcing to "production-portal"`);
        setView('production-portal');
        showToast('⚠️ You can only access the Production Portal', 'error');
      }
    }
  }, [isWorker, view]);

  // Initialize theme from storage or system preference; keep <html> as single source of truth
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = saved ? saved === 'dark' : prefersDark;
      setIsDarkMode(initialDark);
      document.documentElement.classList.toggle('dark', initialDark);
    } catch {
      // no-op
    }
  }, []);

  // Listen for global toasts from unified components
  useEffect(() => {
    const unsubscribe = subscribeToToasts((globalToasts) => {
      setToasts((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newToasts = globalToasts.filter((t) => !existingIds.has(t.id));
        return [...prev, ...newToasts];
      });
    });

    // Initialize with existing global toasts (de-duped)
    const existingGlobalToasts = getCurrentToasts();
    if (existingGlobalToasts.length > 0) {
      setToasts((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        const fresh = existingGlobalToasts.filter((t) => !ids.has(t.id));
        return [...prev, ...fresh];
      });
    }

    return unsubscribe;
  }, []);

  // Close sidebar/menu when clicking outside (single effect)
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!isMenuOpen) return;
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isMenuOpen]);

  // One-time migration and setup - CRITICAL for data source consistency
  useEffect(() => {
    const initializeDataSources = async () => {
      if (!user) return;

      const userKey = (user as any)?.id || (user as any)?.email || (user as any)?.username || 'default';
      const migrationKey = `migration_completed:${userKey}`;

      // Check if migration already completed (per user on this device)
      const migrationComplete = localStorage.getItem(migrationKey);
      if (migrationComplete === 'true') {
        return;
      }

      try {
        // Import migration utilities lazily
        const { migrateLocalStorageToSupabase } = await import('./utils/migration');
        const result = await migrateLocalStorageToSupabase();

        if ((result as any)?.success) {
          showToast('Data migration completed - using database', 'success');
          localStorage.setItem(migrationKey, 'true');
        } else if ((result as any)?.errors?.length > 0) {
          console.error('❌ Migration errors:', (result as any).errors);
        }
      } catch (error) {
        console.error('❌ Migration failed:', error);
      }
    };

    initializeDataSources();
  }, [user]); // Run when user auth state changes

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Show loading screen while authentication is being checked
  if (loading && !authLoadingTimeout) {
    return <LoadingScreen />;
  }

  // Show login form if user is not authenticated
  if (!user) {
    return <LoginForm t={t} />;
  }

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // no-op
    }
  };

  const toggleLanguage = () => {
    setLang((prev) => {
      if (prev === 'en') return 'ru';
      if (prev === 'ru') return 'ar';
      return 'en';
    });
  };

  /*
  SALES PORTAL
  - Create order → state='created', production_stage=null, delivery_stage=null

  PRODUCTION PORTAL (3 steps)
  - received      → rpc_production_set_stage(orderId,'received')
  - preparing     → rpc_production_set_stage(orderId,'preparing')
  - ready_to_pick → rpc_production_set_stage(orderId,'ready_to_pick')
                    → then Delivery portal sees it as 'ready_for_pick'

  DELIVERY PORTAL (3 steps + settlement)
  - ready_for_pick → visible to all couriers
  - on_route       → courier taps "Pick" → rpc_delivery_set_stage(orderId,'on_route', assign=true)
  - settlement     → rpc_delivery_set_stage(orderId,'settlement')

     Inside 'on_route' or right before settlement:
     - Adjust Delivered Items:
         rpc_delivery_adjust_items(orderId, deliveredItems, reason?)
         (delivered_total auto-computed)
     - (Optional) Confirm actual delivery → move to 'settlement'

  SETTLEMENT MODAL
  Section A: Previous invoice
  - Show previous_invoice_balance
  - If returns exist → rpc_settlement_apply_returns(orderId, returns, note?)
  - Result updates previous_invoice_balance and returns_deducted

  Section B: Current order payment
  - Choose method: SRAZU / LATER_CASH / LATER_BANK → rpc_payment_choose
  - If SRAZU and paid immediately, you may also upload proof (optional)

  COMPLETE
  - rpc_order_complete(orderId)
  - Badge color:
     payment_status='paid'   → green
     otherwise               → red (with Attach Proof CTA)

  UNPAID → upload proof:
  - rpc_payment_upload_proof(orderId, filePath, mime, size, note, autoApprove=true|false)
  - If autoApprove=true → instantly Paid (green)
  - If autoApprove=false → shows "awaiting confirmation" style, reviewer uses approve/reject RPCs
  */

  const renderView = () => {
    const props = { t, showToast };
    
    // CRITICAL SECURITY: Enforce production-only UI for worker accounts
    // This is a hard barrier - workers CANNOT access any other view
    if (isWorker) {
      console.log('🔒 Worker detected - rendering ONLY Production Portal. Current view:', view);
      if (view !== 'production-portal') {
        console.error(`🚨 SECURITY BREACH ATTEMPT: Worker trying to render view: ${view}`);
        // Force the view back to production portal
        setView('production-portal');
      }
      // ALWAYS return production portal for workers, never anything else
      return <UnifiedProductionPortal />;
    }
    
    // Non-workers get full access
    switch (view) {
      case 'dashboard':
        return <DashboardView t={t} showToast={showToast} />;
      case 'materials':
        return <MaterialsView {...props} />;
      case 'purchases':
        return <PurchasesView {...props} />;
      case 'production':
        return <ProductionView {...props} />;
      case 'inventory':
        return <InventoryView t={t} />;
      case 'products':
        return <ProductsView {...props} />;
      case 'clients':
        return <ClientsView {...props} />;
      case 'reports':
        return <ReportsView t={t} />;
      case 'import':
        return <BulkImport {...props} />;
      case 'production-portal':
        return <UnifiedProductionPortal />;
      case 'delivery-portal':
        return <UnifiedDeliveryPortal />;
      case 'admin-portal':
        return <UnifiedAdminPortal />;
      case 'all-payments':
        return <AllOrderRecordsView {...props} />;
      default:
        return <DashboardView t={t} />;
    }
  };

  const MenuItem = ({
    icon,
    label,
    id,
  }: {
    icon: React.ReactElement;
    label: string;
    id: View;
  }) => {
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchMovedRef = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
      touchMovedRef.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      const t = e.touches[0];
      const s = touchStartRef.current;
      if (s) {
        if (Math.abs(t.clientY - s.y) > 10 || Math.abs(t.clientX - s.x) > 10) {
          touchMovedRef.current = true;
        }
      }
    };

    const navigateSafely = () => {
      if (isWorker) {
        // Workers ONLY get production portal - strict enforcement
        if (id !== 'production-portal') {
          console.warn(`🔒 SECURITY: Worker attempted to access "${id}" - blocking and forcing production portal`);
          setView('production-portal');
          showToast('❌ Access denied: Workers can only access Production Portal', 'error');
        } else {
          setView(id);
        }
      } else {
        // Non-workers can access any view (unless further restricted in renderView)
        setView(id);
      }
      if (window.innerWidth < 1024) setIsMenuOpen(false);
    };

    const handleTouchEnd = () => {
      if (!touchMovedRef.current) {
        navigateSafely();
      }
      touchStartRef.current = null;
      touchMovedRef.current = false;
    };

    return (
      <button
        onClick={navigateSafely}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateSafely();
          }
        }}
        title={isMenuOpen ? '' : label}
        className={`group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
          view === id
            ? 'bg-gradient-to-r from-cyan-100 to-pink-100 dark:from-cyan-900/40 dark:to-pink-900/40 text-cyan-700 dark:text-cyan-300 shadow-lg scale-105'
            : 'text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-pink-50 dark:hover:from-cyan-900/20 dark:hover:to-pink-900/20 hover:scale-102'
        }`}
      >
        <div className="flex-shrink-0">{icon}</div>
        {isMenuOpen && <span className="ml-3 truncate font-semibold">{label}</span>}
        {!isMenuOpen && (
          <div className="absolute left-16 ml-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-pink-600 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl whitespace-nowrap">
            {label}
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      {/* Root container: do NOT add 'dark' class here; managed on <html> */}
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex`}>
        {/* COMPACT SIDEBAR */}
        <aside
          ref={sidebarRef}
          className={`no-print glass-sidebar border-r-2 border-cyan-200/30 dark:border-cyan-800/30 transition-all duration-300 ${
            isMenuOpen ? 'w-64' : 'w-16'
          } fixed left-0 top-0 h-full z-50 lg:relative lg:z-0 ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } flex flex-col shadow-2xl`}
        >
          {/* Logo and Toggle with Gradient */}
          <div className="flex items-center justify-between p-4 border-b-2 border-cyan-200/30 dark:border-cyan-800/30 flex-shrink-0 bg-gradient-to-r from-cyan-50/50 to-pink-50/50 dark:from-cyan-900/20 dark:to-pink-900/20">
            <div className={`flex items-center ${isMenuOpen ? '' : 'justify-center'}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-pink-500 rounded-lg blur-lg opacity-50 animate-pulse"></div>
                <SlatkoIcon className="relative h-8 w-8 text-cyan-600 dark:text-cyan-400 drop-shadow-lg" />
              </div>
              {isMenuOpen && (
                <div className="ml-3">
                  <div className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-pink-600 dark:from-cyan-400 dark:to-pink-400 bg-clip-text text-transparent">Slatko</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{user?.username || (user as any)?.full_name || ''}</span>
                    {isWorker && (
                      <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-md">
                        🏭 WORKER
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gradient-to-r hover:from-cyan-100 hover:to-pink-100 dark:hover:from-cyan-900/40 dark:hover:to-pink-900/40 transition-all duration-300">
              <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Navigation Container */}
          <div className="flex-1 overflow-y-auto">
            {/* Navigation Menu */}
            <nav className="p-2 space-y-1">
              {!isMenuOpen && (
                <div className="px-2 py-2 text-xs font-bold text-transparent bg-gradient-to-r from-cyan-500 to-pink-500 bg-clip-text uppercase text-center">• • •</div>
              )}

              {/* For workers: Only show Production Portal */}
              {isWorker ? (
                <>
                  {isMenuOpen && (
                    <div className="px-3 py-2 text-xs font-bold text-transparent bg-gradient-to-r from-cyan-600 to-pink-600 bg-clip-text uppercase tracking-wider">
                      Your Portal
                    </div>
                  )}
                  <MenuItem icon={<ProductionIcon />} label="🏭 Production Portal" id="production-portal" />
                </>
              ) : (
                <>
                  {/* Full navigation for non-workers */}
                  {isMenuOpen && (
                    <div className="px-3 py-2 text-xs font-bold text-transparent bg-gradient-to-r from-cyan-600 to-pink-600 bg-clip-text uppercase tracking-wider">Main</div>
                  )}
                  <MenuItem icon={<DashboardIcon />} label={t.navigation.dashboard} id="dashboard" />

                  {isMenuOpen && (
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Production</div>
                    </div>
                  )}
                  <MenuItem icon={<MaterialsIcon />} label={t.navigation.materials} id="materials" />
                  <MenuItem icon={<PurchasesIcon />} label={t.navigation.purchases} id="purchases" />
                  <MenuItem icon={<ProductionIcon />} label={t.navigation.production} id="production" />
                  <MenuItem icon={<ProductionIcon />} label="🏭 Production Portal" id="production-portal" />

                  {isMenuOpen && (
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sales</div>
                    </div>
                  )}
                  <MenuItem icon={<ProductsIcon />} label={t.navigation.products} id="products" />
                  <MenuItem icon={<ClientsIcon />} label={t.navigation.clients} id="clients" />
                  <MenuItem icon={<InventoryIcon />} label={t.navigation.inventory} id="inventory" />

                  {isMenuOpen && (
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Analytics</div>
                    </div>
                  )}
                  <MenuItem icon={<ReportsIcon />} label={t.navigation.reports} id="reports" />
                  <MenuItem icon={<ImportIcon />} label="Import Data" id="import" />
                  <MenuItem icon={<DeliveriesIcon />} label={t.navigation.allPayments} id="all-payments" />
                </>
              )}
            </nav>

            {/* Workflow Portals Section - Hide for workers since they're already in the portal */}
            {!isWorker && (
              <div className="px-1 mt-6">
                {isMenuOpen && (
                  <div className="px-2 py-2 text-xs font-bold text-transparent bg-gradient-to-r from-cyan-600 to-pink-600 bg-clip-text uppercase tracking-wider">Workflow Portals</div>
                )}
                <nav className="space-y-1">
                  <MenuItem icon={<ProductionIcon />} label="🏭 Production Portal" id="production-portal" />
                  <MenuItem icon={<DeliveriesIcon />} label="🚚 Delivery Portal" id="delivery-portal" />
                  <MenuItem icon={<BusinessIntelligenceIcon />} label="👑 Admin Portal" id="admin-portal" />
                </nav>
              </div>
            )}
          </div>

          {/* Bottom Settings Section */}
          <div className="border-t-2 border-cyan-200/30 dark:border-cyan-800/30 p-2 space-y-1 flex-shrink-0 mt-auto bg-gradient-to-r from-cyan-50/30 to-pink-50/30 dark:from-cyan-900/10 dark:to-pink-900/10">
            {isMenuOpen && (
              <div className="px-3 py-2 text-xs font-bold text-transparent bg-gradient-to-r from-cyan-600 to-pink-600 bg-clip-text uppercase tracking-wider">Settings</div>
            )}

            <button
              onClick={() => {
                toggleLanguage();
                if (window.innerWidth < 1024) setIsMenuOpen(false);
              }}
              title={isMenuOpen ? '' : (lang === 'en' ? 'Русский' : lang === 'ru' ? 'العربية' : 'English')}
              className="group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-cyan-100 hover:to-pink-100 dark:hover:from-cyan-900/40 dark:hover:to-pink-900/40 hover:scale-102"
            >
              <div className="flex-shrink-0">
                <LanguageIcon />
              </div>
              {isMenuOpen && <span className="ml-3 truncate font-semibold">{lang === 'en' ? 'Русский' : lang === 'ru' ? 'العربية' : 'English'}</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-pink-600 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl whitespace-nowrap">
                  {lang === 'en' ? 'Русский' : lang === 'ru' ? 'العربية' : 'English'}
                </div>
              )}
            </button>

            <button
              onClick={() => {
                toggleTheme();
                if (window.innerWidth < 1024) setIsMenuOpen(false);
              }}
              title={isMenuOpen ? '' : isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}
              className="group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-cyan-100 hover:to-pink-100 dark:hover:from-cyan-900/40 dark:hover:to-pink-900/40 hover:scale-102"
            >
              <div className="flex-shrink-0">{isDarkMode ? <SunIcon /> : <MoonIcon />}</div>
              {isMenuOpen && <span className="ml-3 truncate font-semibold">{isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-pink-600 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl whitespace-nowrap">
                  {isDarkMode ? t.navigation.lightMode : t.navigation.darkMode}
                </div>
              )}
            </button>

            <button
              onClick={() => {
                // Clear React Query cache if present
                if ((window as any).queryClient) {
                  (window as any).queryClient.clear();
                }
                // Force reload
                window.location.reload();
                if (window.innerWidth < 1024) setIsMenuOpen(false);
              }}
              title={isMenuOpen ? '' : 'Clear Cache'}
              className="group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 text-cyan-600 dark:text-cyan-400 hover:bg-gradient-to-r hover:from-cyan-100 hover:to-blue-100 dark:hover:from-cyan-900/40 dark:hover:to-blue-900/40 hover:scale-102"
            >
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              {isMenuOpen && <span className="ml-3 truncate font-semibold">Clear Cache</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl whitespace-nowrap">
                  Clear Cache
                </div>
              )}
            </button>

            <button
              onClick={signOut}
              title={isMenuOpen ? '' : 'Sign Out'}
              className="group relative flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/40 dark:hover:to-pink-900/40 hover:scale-102"
            >
              <div className="flex-shrink-0">
                <LogoutIcon />
              </div>
              {isMenuOpen && <span className="ml-3 truncate font-semibold">Sign Out</span>}
              {!isMenuOpen && (
                <div className="absolute left-16 ml-2 px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl whitespace-nowrap">
                  Sign Out
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 transition-all duration-300 lg:ml-0">
          {/* Top bar for mobile with STUNNING gradient and effects */}
          <div className="lg:hidden glass-header border-b-2 border-cyan-200/30 dark:border-cyan-800/30 p-4 flex items-center justify-between sticky top-0 z-40 shadow-[0_4px_20px_rgba(0,208,232,0.2)]">
            <button onClick={() => setIsMenuOpen(true)} className="p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-cyan-100 hover:to-pink-100 dark:hover:from-cyan-900/40 dark:hover:to-pink-900/40 transition-all duration-300 transform hover:scale-110">
              <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">{user?.username || (user as any)?.full_name || ''}</div>
              {isWorker && (
                <span className="px-3 py-1.5 text-xs font-black bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg animate-pulse-slow">
                  🏭 WORKER
                </span>
              )}
              <AlertCenter t={t} />
            </div>
          </div>

          {/* Main content with gradient background */}
          <main className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-pink-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">{renderView()}</main>

          {/* Alert Center for desktop - positioned absolutely */}
          <div className="hidden lg:block fixed top-4 right-4 z-30">
            <AlertCenter t={t} />
          </div>
        </div>

        {/* Quick Order Floating Button */}
        <QuickOrderButton t={t} showToast={showToast} />

        {/* Mobile overlay */}
        {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsMenuOpen(false)} />}
      </div>
    </>
  );
};

export default function App() {
  // Provider order: auth → data, so data can use auth context if needed
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
