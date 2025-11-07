import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  theme?: 'dashboard' | 'products' | 'clients' | 'production' | 'inventory' | 'materials' | 'purchases' | 'reports' | 'admin' | 'delivery';
}

const themeConfigs = {
  dashboard: {
    gradient: 'from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400',
    bgGradient: 'from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'cyan',
    decorBgFrom: 'bg-cyan-100/30',
    decorBgTo: 'bg-blue-100/30'
  },
  products: {
    gradient: 'from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400',
    bgGradient: 'from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'purple',
    decorBgFrom: 'bg-purple-100/30',
    decorBgTo: 'bg-pink-100/30'
  },
  clients: {
    gradient: 'from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400',
    bgGradient: 'from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'blue',
    decorBgFrom: 'bg-blue-100/30',
    decorBgTo: 'bg-cyan-100/30'
  },
  production: {
    gradient: 'from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400',
    bgGradient: 'from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'green',
    decorBgFrom: 'bg-green-100/30',
    decorBgTo: 'bg-emerald-100/30'
  },
  inventory: {
    gradient: 'from-amber-600 to-yellow-600 dark:from-amber-400 dark:to-yellow-400',
    bgGradient: 'from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'amber',
    decorBgFrom: 'bg-amber-100/30',
    decorBgTo: 'bg-yellow-100/30'
  },
  materials: {
    gradient: 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400',
    bgGradient: 'from-red-50 to-rose-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'red',
    decorBgFrom: 'bg-red-100/30',
    decorBgTo: 'bg-rose-100/30'
  },
  purchases: {
    gradient: 'from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400',
    bgGradient: 'from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'indigo',
    decorBgFrom: 'bg-indigo-100/30',
    decorBgTo: 'bg-blue-100/30'
  },
  reports: {
    gradient: 'from-slate-600 to-gray-600 dark:from-slate-400 dark:to-gray-400',
    bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'slate',
    decorBgFrom: 'bg-slate-100/30',
    decorBgTo: 'bg-gray-100/30'
  },
  admin: {
    gradient: 'from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400',
    bgGradient: 'from-pink-50 to-purple-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'pink',
    decorBgFrom: 'bg-pink-100/30',
    decorBgTo: 'bg-purple-100/30'
  },
  delivery: {
    gradient: 'from-cyan-600 to-teal-600 dark:from-cyan-400 dark:to-teal-400',
    bgGradient: 'from-cyan-50 to-teal-50 dark:from-slate-800 dark:to-slate-900',
    accentColor: 'cyan',
    decorBgFrom: 'bg-cyan-100/30',
    decorBgTo: 'bg-teal-100/30'
  }
};

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  icon = '📋',
  theme = 'dashboard'
}) => {
  const config = themeConfigs[theme];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${config.bgGradient} p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6`}>
      {/* Decorative orbs background */}
      <div className="absolute top-0 right-0 w-64 h-64 -mr-32 -mt-32 pointer-events-none">
        <div className={`absolute inset-0 ${config.decorBgFrom} rounded-full blur-3xl opacity-40 animate-blob`}></div>
        <div className={`absolute inset-0 ${config.decorBgTo} rounded-full blur-2xl opacity-30 animate-blob animation-delay-2000`}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-start gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br from-current blur-lg opacity-40`}></div>
            <img 
              src="/logo/logo.png" 
              alt="Slatko Logo" 
              className="relative h-16 w-auto drop-shadow-lg"
            />
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{icon}</span>
            <h1 className={`text-2xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
              {title}
            </h1>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};
