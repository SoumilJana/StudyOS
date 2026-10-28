import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { AuthModal } from '../components/auth/AuthModal';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalReason: string | null;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  requireAuth: (actionDescription?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      setIsLoading(false);
    });

    // 2. Realtime auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuthModal = (reason?: string) => {
    setAuthModalReason(
      reason || 'You must log in first before making changes or adding records to the database.'
    );
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthModalReason(null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  /**
   * Action guard:
   * Returns true if authenticated.
   * If unauthenticated, displays the AuthModal with the specified reason and returns false.
   */
  const requireAuth = (actionDescription?: string): boolean => {
    if (user) return true;

    const reason = actionDescription
      ? `You must log in first to ${actionDescription}.`
      : 'You must log in first before making changes or adding anything to the database.';
    openAuthModal(reason);
    return false;
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    authModalOpen,
    authModalReason,
    openAuthModal,
    closeAuthModal,
    signOut,
    requireAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Global Auth Modal automatically accessible anywhere via openAuthModal / requireAuth */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        reason={authModalReason}
        onSuccess={() => {
          closeAuthModal();
        }}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
