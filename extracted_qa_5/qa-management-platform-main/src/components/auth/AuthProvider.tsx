'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

const AuthContext = createContext<{ user: User | null; session: Session | null; loading: boolean }>({
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void import('@/lib/supabase/client')
      .then(({ supabase }) => {
        if (!active) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
        });
        unsubscribe = () => subscription.unsubscribe();

        return supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (!active) return;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
        });
      })
      .catch((error: unknown) => {
        console.error('Failed to initialize the authentication session:', error);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);