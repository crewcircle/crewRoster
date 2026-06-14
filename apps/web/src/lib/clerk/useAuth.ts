import { useUser, useClerk } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export interface AuthContext {
  user: ReturnType<typeof useUser>['user'];
  tenantId: string | null;
  role: 'owner' | 'manager' | 'employee' | null;
  isLoading: boolean;
  isDemoMode: boolean;
  signOut: () => Promise<void>;
  resetPasswordEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

function readDemoSession(): { tenantId: string; role: 'owner' | 'manager' | 'employee' } | null {
  if (typeof window === 'undefined') return null;
  const tenantId = sessionStorage.getItem('demo_tenant_id');
  const role = sessionStorage.getItem('demo_role');
  const token = sessionStorage.getItem('demo_token');
  if (tenantId && role && token) {
    return { tenantId, role: role as 'owner' | 'manager' | 'employee' };
  }
  return null;
}

export const useAuth = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [demoSession] = useState(readDemoSession);
  const isDemoMode = !!demoSession;

  const [tenantId, setTenantId] = useState<string | null>(demoSession?.tenantId ?? null);
  const [role, setRole] = useState<'owner' | 'manager' | 'employee' | null>(demoSession?.role ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!isDemoMode);

  useEffect(() => {
    if (isDemoMode) return;

    async function fetchTenantInfo() {
      if (!user) {
        setTenantId(null);
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/profile?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setTenantId(data.tenantId);
          setRole(data.role);
        } else {
          const publicMetadata = user.publicMetadata;
          if (publicMetadata?.tenantId) {
            setTenantId(publicMetadata.tenantId as string);
            setRole(publicMetadata.role as 'owner' | 'manager' | 'employee');
          } else {
            setTenantId(null);
            setRole(null);
          }
        }
      } catch (err) {
        console.error('Error fetching tenant info:', err);
        const publicMetadata = user.publicMetadata;
        if (publicMetadata?.tenantId) {
          setTenantId(publicMetadata.tenantId as string);
          setRole(publicMetadata.role as 'owner' | 'manager' | 'employee');
        }
      }
      setIsLoading(false);
    }

    if (isUserLoaded) {
      fetchTenantInfo();
    }
  }, [user, isUserLoaded, isDemoMode]);

  const signOut = async () => {
    if (isDemoMode) {
      sessionStorage.removeItem('demo_email');
      sessionStorage.removeItem('demo_role');
      sessionStorage.removeItem('demo_tenant_id');
      sessionStorage.removeItem('demo_token');
      window.location.href = '/demo';
    } else {
      await clerkSignOut();
    }
  };

  const resetPasswordEmail = async (_email: string) => {
    console.log('Password reset requested - use Clerk hosted flow');
  };

  const updatePassword = async (newPassword: string) => {
    if (isDemoMode) {
      console.log('Password update not available in demo mode');
      return;
    }
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    await user.updatePassword({ newPassword });
  };

  return {
    user,
    tenantId,
    role,
    isLoading: isDemoMode ? isLoading : !isUserLoaded || isLoading,
    isDemoMode,
    signOut,
    resetPasswordEmail,
    updatePassword,
  };
};
