import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { queryClient } from '../../providers/DataProvider';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🔐 AuthProvider initializing...');
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider useEffect - checking session...');
    
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Session check result:', { session: !!session, user: !!session?.user });
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // 🔥 CRITICAL: Invalidate all queries on auth changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        console.log('🔄 Auth event:', event, '- Invalidating all data queries');
        queryClient.invalidateQueries();
        
        // Clear localStorage on sign out for security
        if (event === 'SIGNED_OUT') {
          localStorage.clear();
          console.log('🧹 Cleared localStorage on sign out');
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in user:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Sign in response:', { error });
      
      if (error) {
        console.error('Supabase auth error:', error);
        return { error: error.message };
      }
      
      return {};
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      return { error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log('Attempting to sign up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          }
        }
      });

      console.log('Sign up response:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        return { error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { error: 'Please check your email for confirmation link' };
      }

      // Create user profile in public.users table
      if (data.user) {
        console.log('Creating user profile for:', data.user.id);
        
        // Try to create profile, but handle conflicts gracefully
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: data.user.id,
            username: username,
            role: 'user'
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          
          // If it's a conflict (user already exists), that's okay
          if (profileError.code !== '23505') { // 23505 is unique constraint violation
            console.warn('Profile creation failed, but continuing with signup:', profileError.message);
          } else {
            console.log('User profile already exists, continuing...');
          }
        } else {
          console.log('User profile created successfully');
        }
      }

      return {};
    } catch (error) {
      console.error('Unexpected error during sign up:', error);
      return { error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};