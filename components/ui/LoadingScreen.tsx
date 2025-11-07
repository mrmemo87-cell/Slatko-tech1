import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  const [mascot, setMascot] = useState<'slatko' | 'slatka'>('slatko');

  useEffect(() => {
    // Alternate mascots for visual interest
    const interval = setInterval(() => {
      setMascot(prev => prev === 'slatko' ? 'slatka' : 'slatko');
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-200/30 to-transparent rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-200/30 to-transparent rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
          <img 
            src="/logo/logo.png" 
            alt="Slatko Logo" 
            className="relative h-24 w-auto drop-shadow-2xl animate-float"
          />
        </div>

        {/* Mascot */}
        <div className="relative w-32 h-32">
          <img
            src={`/mascots/${mascot === 'slatko' ? 'Slatko' : 'Slatka'}.svg`}
            alt={mascot === 'slatko' ? 'Slatko Mascot' : 'Slatka Mascot'}
            className="w-full h-full object-contain animate-bounce-slow transition-opacity duration-500"
            key={mascot}
          />
        </div>

        {/* Loading text */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-purple-500 to-pink-600 bg-clip-text text-transparent animate-gradient">
            {message}
          </h2>
          
          {/* Loading bar */}
          <div className="w-48 h-1.5 bg-gradient-to-r from-cyan-100 to-pink-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full animate-loading-bar" />
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-gray-500 animate-pulse">
          Preparing your workspace...
        </p>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-loading-bar { animation: loading-bar 1.5s ease-in-out infinite; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
};
