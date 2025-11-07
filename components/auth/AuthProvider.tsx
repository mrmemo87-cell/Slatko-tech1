import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { queryClient as exportedQueryClient } from '../../providers/DataProvider';

interface AuthUser extends User {
  role?: string;
  username?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Prefer exported QueryClient but guard in case of circular import in dev
  const queryClient = exportedQueryClient ?? (typeof window !== 'undefined' ? (window as any).queryClient : undefined);

  // Guard StrictMode double-mount
  const didInit = useRef(false);
  const hadSessionCheck = useRef(false);       // track whether getSession completed (not timed out)
  const userRef = useRef<AuthUser | null>(null);
  useEffect(() => { userRef.current = user }, [user]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    let isMounted = true;
    
    // Mark that we're starting session check (before getSession promise)
    // This prevents INITIAL_SESSION event from duplicating our work
    hadSessionCheck.current = true;

    // Robust session check: race supabase.getSession against a timeout so we don't hang
    const sessionCheck = async () => {
      console.log('🔐🔐🔐 SESSION CHECK STARTED 🔐🔐🔐');
      const TIMEOUT_MS = 15000; // Increased from 5000ms to 15000ms
      try {
        const resultPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ _timedOut: true }), TIMEOUT_MS));
        const res: any = await Promise.race([resultPromise, timeoutPromise]);

        if (res && res._timedOut) {
          console.warn(`⚠️ Auth session check timed out after ${TIMEOUT_MS}ms - proceeding without session`);
          if (isMounted) {
            setLoading(false);
            setUser(null); // Ensure user is null on timeout
          }
          return;
        }

        const { data, error } = res;
        if (error) {
          console.error('❌ Session error:', error);
          if (isMounted) {
            setLoading(false);
            setUser(null);
          }
          return;
        }

        const authUser = data?.session?.user ?? null;
        console.log('✅ Got auth user:', authUser?.email || 'none');
        if (!authUser) { if (isMounted) setUser(null); return; }

        // Fetch profile directly from users table
        console.log('🔐 Fetching profile for auth_user_id:', authUser.id);
        let finalRole: string | undefined;
        let finalUsername: string | undefined;

        try {
          console.log('🔐 About to query supabase users table...');
          const query = supabase
            .from('users')
            .select('id, username, role, auth_user_id')
            .eq('auth_user_id', authUser.id)
            .single();
          
          console.log('🔐 Query object created:', query);
          
          const { data: profile, error } = await query;

          console.log('🔐🔐🔐 PROFILE QUERY COMPLETE:', { 
            profile, 
            error, 
            authUserId: authUser.id,
            hasProfile: !!profile,
            hasError: !!error
          });

          if (error) {
            console.warn('⚠️ Profile query error:', error);
            finalRole = undefined;
            finalUsername = (authUser.user_metadata as any)?.username || authUser.email || '';
          } else if (profile) {
            console.log('✅ GOT PROFILE:', profile);
            finalRole = typeof profile.role === 'string' ? profile.role.toLowerCase() : undefined;
            finalUsername = profile.username;
            console.log('✅ SET finalRole to:', finalRole);
          } else {
            console.warn('⚠️ No profile found in database');
            finalRole = undefined;
            finalUsername = (authUser.user_metadata as any)?.username || authUser.email || '';
          }
        } catch (profileErr) {
          console.error('🔐 Profile query exception:', profileErr);
          finalRole = undefined;
          finalUsername = (authUser.user_metadata as any)?.username || authUser.email || '';
        }
        
        console.log('🔐 BEFORE SETUSER - Final role and username:', { finalRole, finalUsername });

        if (isMounted) {
          setUser(prev => {
            const next = { ...authUser, role: finalRole, username: finalUsername } as AuthUser;
            // Detailed logging of update
            console.log('🔐 sessionCheck setUser called:', {
              hasRole: !!finalRole,
              role: finalRole,
              username: finalUsername,
              prevRole: prev?.role,
              prevUsername: prev?.username
            });
            // dedupe
            if (prev?.id === next.id && prev?.role === next.role && prev?.username === next.username) {
              console.log('🔐 User unchanged in sessionCheck');
              return prev;
            }
            console.log('🔐🔐🔐 sessionCheck updating user with role:', finalRole);
            return next;
          });
        }
      } catch (err) {
        console.error('session check failed:', err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    sessionCheck();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐🔐🔐 AUTH STATE CHANGE:', event);
      // Allow INITIAL_SESSION only if sessionCheck didn't complete (timed out)
      if (event === 'INITIAL_SESSION' && hadSessionCheck.current) {
        console.log('🔐 Skipping INITIAL_SESSION because sessionCheck already ran');
        return;
      }

      // Don't refetch profile on token refresh
      if (event === 'TOKEN_REFRESHED') return;

      const authUser = session?.user ?? null;
      console.log('🔐 Auth state change - authUser:', authUser?.email);
      if (authUser) {
        try {
          console.log('🔐 Fetching profile in onAuthStateChange for:', authUser.id);
          const { data: profile, error } = await (supabase
            .from('users')
            .select('username, role, auth_user_id')
            .eq('auth_user_id', authUser.id)
            .single() as any);

          console.log('🔐 Profile from onAuthStateChange:', { profile, error, authUserId: authUser.id });

          let role: string | undefined;
          let username: string | undefined;

          if (!error && profile) {
            role = typeof (profile as any)?.role === 'string' ? (profile as any).role.toLowerCase() : undefined;
            username = (profile as any)?.username;
            console.log('🔐🔐🔐 SET role from DB profile in onAuthStateChange:', role);
          } else {
            role = (authUser.user_metadata as any)?.role?.toLowerCase?.();
            username = (authUser.user_metadata as any)?.username ?? authUser.email ?? '';
            console.log('🔐 Fell back to metadata in onAuthStateChange, role:', role);
          }

          console.log('🔐🔐🔐 CALLING setUser with enriched user:', { role, username, email: authUser.email });
          
          if (isMounted) {
            setUser(prev => {
              const next = { ...authUser, role, username } as AuthUser;
              if (prev?.id === next.id && prev?.role === next.role && prev?.username === next.username) {
                console.log('🔐 User unchanged, skipping update');
                return prev;
              }
              console.log('🔐 User updated:', { oldRole: prev?.role, newRole: next.role });
              return next;
            });
          }
        } catch (err) {
          console.error('🔐 Exception in onAuthStateChange:', err);
          const username = (authUser.user_metadata as any)?.username ?? authUser.email ?? '';
          if (isMounted) {
            setUser({ ...authUser, username });
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
        }
      }

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        try { await queryClient?.invalidateQueries(); } catch {}
        if (event === 'SIGNED_OUT') {
          // only remove your keys, not everything
          try {
            Object.keys(localStorage)
              .filter(k => k.startsWith('slatko:') || k.startsWith('bh-') || k.startsWith('supabase.'))
              .forEach(k => localStorage.removeItem(k));
          } catch {}
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting to sign in user:', email);
      
      // Clear any existing session first to avoid conflicts
      try {
        await supabase.auth.signOut();
        console.log('🧹 Cleared any existing session');
      } catch (clearErr) {
        console.warn('Could not clear session:', clearErr);
      }
      
      // Add timeout to signIn to prevent hanging indefinitely
      const SIGNIN_TIMEOUT = 10000; // 10 seconds
      
      console.log('🔑 Calling signInWithPassword...');
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in request timed out')), SIGNIN_TIMEOUT)
      );
      
      const res: any = await Promise.race([signInPromise, timeoutPromise]);
      
      console.log('🔐 Sign in response:', {
        hasSession: !!res.data?.session,
        hasUser: !!res.data?.user,
        error: res.error,
      });

      const { data, error } = res;

      if (error) {
        console.error('❌ Supabase auth error:', error);
        // Provide user-friendly error messages
        if (error.message?.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password' };
        }
        if (error.message?.includes('Email not confirmed')) {
          return { error: 'Please verify your email address' };
        }
        return { error: error.message || 'Sign in failed' };
      }

      // If session is present immediately, update optimistically; listener will also fire
      if (data?.session?.user) {
        console.log('✅ Sign in successful, user:', data.session.user.email);
        
        // Fetch profile immediately to enrich user with role
        try {
          console.log('🔐 Fetching profile in signIn for:', data.session.user.id);
          const { data: profile, error } = await supabase
            .from('users')
            .select('username, role, auth_user_id')
            .eq('auth_user_id', data.session.user.id)
            .single();

          let role: string | undefined;
          let username: string | undefined;

          if (!error && profile) {
            role = typeof (profile as any)?.role === 'string' ? (profile as any).role.toLowerCase() : undefined;
            username = (profile as any)?.username;
            console.log('✅ Got role from DB in signIn:', role);
          } else {
            username = (data.session.user.user_metadata as any)?.username ?? data.session.user.email ?? '';
            console.log('⚠️ No profile found in signIn');
          }

          const enrichedUser = { ...data.session.user, role, username } as AuthUser;
          console.log('🔐🔐🔐 Setting user in signIn with role:', role);
          setUser(enrichedUser);
        } catch (err) {
          console.error('🔐 Error fetching profile in signIn:', err);
          setUser(data.session.user as AuthUser);
        }
      } else {
        console.warn('⚠️ Sign in succeeded but no session returned');
      }

      return {};
    } catch (error: any) {
      console.error('❌ Unexpected error during sign in:', error);
      
      // Specific timeout handling
      if (error?.message?.includes('timed out')) {
        return { error: 'Connection timeout - please check your internet connection and try again' };
      }
      
      return { error: `Connection error: ${error?.message ?? 'Please check your internet connection'}` };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log('🔐 Attempting to sign up user:', email);
      const res = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      console.log('🔐 Sign up response:', {
        hasUser: !!res.data?.user,
        hasSession: !!res.data?.session,
        error: res.error,
      });

      const { data, error } = res;

      if (error) {
        console.error('❌ Supabase auth error:', error);
        if (error.message?.includes('already registered')) {
          return { error: 'This email is already registered' };
        }
        return { error: error.message || 'Sign up failed' };
      }

      if (data.user) {
        // Create profile (ignore unique conflict)
        const { error: profileError } = await (supabase.from('users') as any).insert({
          auth_user_id: data.user.id,
          username,
          role: 'user',
        });
        if (profileError && (profileError as any).code !== '23505') {
          console.warn('⚠️ Profile creation failed:', (profileError as any).message);
        } else {
          console.log('✅ User profile created successfully');
        }
      }

      // If email confirmation required, user exists but no session
      if (data.user && !data.session) {
        return { error: 'Please check your email for confirmation link' };
      }

      console.log('✅ Sign up successful');
      return {};
    } catch (error: any) {
      console.error('❌ Unexpected error during sign up:', error);
      return { error: `Connection error: ${error?.message ?? 'Please check your internet connection'}` };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    try {
      await queryClient?.clear();
    } catch {}
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
