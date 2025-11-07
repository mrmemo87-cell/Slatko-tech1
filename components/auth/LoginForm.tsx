import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { SlatkoIcon } from '../ui/Icons';
import { testConnection } from '../../config/supabase';

interface LoginFormProps {
  t: any;
}

export const LoginForm: React.FC<LoginFormProps> = ({ t }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 LoginForm: Starting sign-in process');
    console.log('📧 Email:', email);

    try {
      let result;
      if (isSignUp) {
        console.log('📝 Attempting sign up...');
        result = await signUp(email, password, username);
      } else {
        console.log('🔑 Attempting sign in...');
        result = await signIn(email, password);
      }

      console.log('📋 Auth result:', result);

      if (result.error) {
        console.error('❌ Auth failed:', result.error);
        setError(result.error);
      } else {
        console.log('✅ Auth succeeded');
      }
    } catch (err) {
      console.error('💥 Unexpected error in handleSubmit:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      console.log('🏁 Sign-in process complete');
    }
  };

  const handleTestConnection = async () => {
    console.log('Testing Supabase connection...');
    const result = await testConnection();
    console.log('Connection result:', result);
    if (result.success) {
      setError('✅ Connection successful! Supabase is working.');
    } else {
      setError(`❌ Connection failed: ${result.error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* DRAMATIC Gradient Background with Animation */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-600 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-pink-500/40 via-purple-500/40 to-cyan-500/40 animate-gradient-y"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-purple-900/20 to-black/40"></div>
      </div>
      
      {/* Animated Mesh Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-cyan-400/30 via-transparent to-transparent rounded-full blur-3xl animate-spin-slow"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-pink-400/30 via-transparent to-transparent rounded-full blur-3xl animate-spin-reverse"></div>
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* STUNNING Glassmorphism Card */}
        <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,208,232,0.4),0_0_80px_rgba(255,45,145,0.3)] border-2 border-white/20 p-10 relative overflow-hidden transform hover:scale-[1.02] transition-all duration-500">
          {/* Animated Border Gradient */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50 blur-xl animate-pulse"></div>
          
          {/* Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* DRAMATIC Mascot Header */}
            <div className="text-center relative mb-8">
              <div className="flex justify-center mb-6 relative">
                {/* Multi-layer Glow Effect */}
                <div className="relative group cursor-pointer">
                  {/* Outermost Glow - Largest */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-70 group-hover:opacity-100 transition-all duration-700 animate-pulse scale-150"></div>
                  
                  {/* Second Glow Layer */}
                  <div className="absolute -inset-6 bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 rounded-full blur-2xl opacity-60 animate-spin-slow scale-125"></div>
                  
                  {/* Third Glow Layer */}
                  <div className="absolute -inset-4 bg-gradient-to-tl from-cyan-300 to-pink-300 rounded-full blur-xl opacity-50 animate-pulse-delayed"></div>
                  
                  {/* Mascot Container with Dramatic Effects */}
                  <div className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 p-6 rounded-full shadow-[0_0_60px_rgba(0,208,232,0.6),0_0_100px_rgba(255,45,145,0.4)] border-4 border-white/60 dark:border-slate-600/60 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <img 
                      src="/mascots/Slatko.svg" 
                      alt="Slatko Mascot" 
                      className="h-28 w-28 object-contain drop-shadow-[0_0_15px_rgba(0,208,232,0.8)]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const icon = e.currentTarget.nextElementSibling;
                        if (icon) icon.classList.remove('hidden');
                      }}
                    />
                    <SlatkoIcon className="h-28 w-28 text-cyan-400 drop-shadow-[0_0_15px_rgba(0,208,232,0.8)] hidden" />
                  </div>
                  
                  {/* Sparkles and Stars */}
                  <div className="absolute -top-4 -right-4 w-6 h-6 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full animate-ping shadow-[0_0_20px_rgba(255,45,145,0.8)]"></div>
                  <div className="absolute -bottom-4 -left-4 w-5 h-5 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full animate-ping shadow-[0_0_20px_rgba(0,208,232,0.8)]" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-0 right-12 w-3 h-3 bg-purple-400 rounded-full animate-bounce shadow-[0_0_15px_rgba(168,85,247,0.8)]" style={{ animationDelay: '0.3s' }}></div>
                  <div className="absolute bottom-0 left-12 w-4 h-4 bg-pink-300 rounded-full animate-bounce shadow-[0_0_15px_rgba(255,45,145,0.6)]" style={{ animationDelay: '0.7s' }}></div>
                </div>
              </div>
              
              {/* BOLD Title with Animated Gradient */}
              <h2 className="text-5xl font-black mb-4 relative">
                <span className="relative inline-block">
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 blur-2xl opacity-70 animate-pulse"></span>
                  <span className="relative bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,208,232,0.5)] animate-gradient-x">
                    {isSignUp ? '🌟 Join Slatko' : '✨ Welcome Back'}
                  </span>
                </span>
              </h2>
              
              {/* Subtitle with Glow */}
              <p className="text-lg font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {isSignUp 
                  ? '🍰 Create your sweet confectionery account'
                  : '🚀 Sign in to manage your delicious business'
                }
              </p>
            </div>
        
        <form className="mt-8 space-y-6 relative" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {isSignUp && (
              <div className="relative group">
                <label htmlFor="username" className="block text-sm font-bold text-white drop-shadow-lg mb-2 ml-1">
                  👤 Username
                </label>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required={isSignUp}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="relative block w-full px-5 py-4 border-0 placeholder-gray-400 dark:placeholder-gray-400 text-gray-900 dark:text-white font-semibold rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl focus:outline-none focus:ring-4 focus:ring-cyan-400/50 focus:shadow-[0_0_30px_rgba(0,208,232,0.4)] transition-all duration-300 shadow-2xl text-base"
                    placeholder="Choose your username"
                  />
                </div>
              </div>
            )}
            
            <div className="relative group">
              <label htmlFor="email-address" className="block text-sm font-bold text-white drop-shadow-lg mb-2 ml-1">
                ✉️ Email address
              </label>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="relative block w-full px-5 py-4 border-0 placeholder-gray-400 dark:placeholder-gray-400 text-gray-900 dark:text-white font-semibold rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl focus:outline-none focus:ring-4 focus:ring-pink-400/50 focus:shadow-[0_0_30px_rgba(255,45,145,0.4)] transition-all duration-300 shadow-2xl text-base"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            
            <div className="relative group">
              <label htmlFor="password" className="block text-sm font-bold text-white drop-shadow-lg mb-2 ml-1">
                🔒 Password
              </label>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative block w-full px-5 py-4 border-0 placeholder-gray-400 dark:placeholder-gray-400 text-gray-900 dark:text-white font-semibold rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-300 shadow-2xl text-base"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur opacity-50 animate-pulse"></div>
              <div className="relative rounded-2xl bg-gradient-to-r from-red-500/90 to-pink-500/90 p-5 border-2 border-white/30 shadow-[0_0_30px_rgba(255,45,145,0.5)]">
                <div className="text-base font-bold text-white drop-shadow-lg flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  {error}
                </div>
              </div>
            </div>
          )}

          <div className="relative group pt-2">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500 animate-gradient-xy"></div>
            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex justify-center py-5 px-8 border-0 text-lg font-black rounded-2xl text-white overflow-hidden transition-all duration-500 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-[0_10px_50px_-10px_rgba(0,208,232,0.6),0_0_30px_rgba(255,45,145,0.4)]"
              style={{
                background: 'linear-gradient(135deg, #00d0e8 0%, #a855f7 50%, #ff2d91 100%)',
              }}
            >
              {/* Animated Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Pulse Animation */}
              <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
              
              <span className="relative z-10 flex items-center justify-center gap-3 drop-shadow-lg">
                {loading ? (
                  <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin shadow-lg"></div>
                ) : (
                  <>
                    <span className="text-2xl">{isSignUp ? '✨' : '🚀'}</span>
                    <span className="tracking-wide">{isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN NOW'}</span>
                  </>
                )}
              </span>
            </button>
          </div>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setEmail('');
                setPassword('');
                setUsername('');
              }}
              className="relative font-bold text-lg text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] hover:text-cyan-300 transition-all duration-300 group inline-block"
            >
              <span className="relative z-10">
                {isSignUp 
                  ? '👉 Already have an account? Sign in'
                  : '🌟 Need an account? Sign up'
                }
              </span>
              <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-cyan-400 to-pink-400 group-hover:w-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(0,208,232,0.8)]"></span>
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={handleTestConnection}
              className="text-sm font-semibold text-white/80 hover:text-white drop-shadow-lg underline decoration-dotted decoration-white/50 underline-offset-4 hover:decoration-solid hover:decoration-cyan-400 transition-all duration-300"
            >
              🔌 Test Database Connection
            </button>
          </div>
        </form>
        
        {/* Demo credentials with STUNNING styling */}
        <div className="mt-8 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
          <div className="relative p-6 bg-gradient-to-br from-white/90 to-white/70 dark:from-slate-800/90 dark:to-slate-900/70 rounded-2xl border-2 border-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,208,232,0.3)]">
            {/* Decorative corner glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-pink-400/30 to-transparent rounded-bl-full blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/30 to-transparent rounded-tr-full blur-xl"></div>
            
            <h3 className="text-base font-black bg-gradient-to-r from-cyan-600 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center gap-2 relative z-10">
              <span className="text-2xl drop-shadow-lg">💡</span> 
              <span className="drop-shadow-sm">Demo Credentials</span>
            </h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold leading-relaxed relative z-10">
              You can create a new account or use demo credentials once set up. Perfect for testing!
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
};

