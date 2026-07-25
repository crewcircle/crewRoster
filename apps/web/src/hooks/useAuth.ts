'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  tenantId: string | null;
  role: string | null;
  isLoading: boolean;
  isDemoMode: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDemoMode =
    typeof window !== 'undefined' && sessionStorage.getItem('demo_mode') === 'true';

  // Single consolidated effect for auth state
  useEffect(() => {
    if (isDemoMode) {
      setTenantId(sessionStorage.getItem('demo_tenantId'));
      setRole(sessionStorage.getItem('demo_role'));
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Check current session
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser ?? null);
      if (!currentUser) {
        setIsLoading(false);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch tenantId + role when user changes
  useEffect(() => {
    if (!user || isDemoMode) return;

    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        setTenantId(data.tenantId ?? null);
        setRole(data.role ?? null);
      })
      .catch(() => {
        setTenantId(null);
        setRole(null);
      })
      .finally(() => setIsLoading(false));
  }, [user, isDemoMode]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (isDemoMode) {
      sessionStorage.removeItem('demo_mode');
      sessionStorage.removeItem('demo_email');
      sessionStorage.removeItem('demo_password');
      sessionStorage.removeItem('demo_tenantId');
      sessionStorage.removeItem('demo_role');
      setUser(null);
      setTenantId(null);
      setRole(null);
    } else {
      await supabase.auth.signOut();
    }
  }, [isDemoMode]);

  return { user, tenantId, role, isLoading, isDemoMode, signOut };
}
