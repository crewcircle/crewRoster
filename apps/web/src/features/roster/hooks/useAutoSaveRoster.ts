import { useEffect, useRef } from 'react';
import type { Shift } from '@/types/shift';
import * as rosterApi from '@/api/rosterApi';

interface UseAutoSaveRosterOptions {
  rosterId: string | undefined;
  shifts: Shift[];
  tenantId: string | null;
  user: unknown;
  authLoading: boolean;
  isSaving: boolean;
  isDemoMode: boolean;
  setIsSaving: (saving: boolean) => void;
}

export function useAutoSaveRoster({
  rosterId,
  shifts,
  tenantId,
  user,
  authLoading,
  isSaving,
  isDemoMode,
  setIsSaving,
}: UseAutoSaveRosterOptions): void {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authLoading || isDemoMode || !user || !tenantId) return;

    const saveRoster = async () => {
      if (isDemoMode || !rosterId) return;
      try {
        setIsSaving(true);
        await rosterApi.saveShifts({
          action: 'save-shifts',
          shifts: shifts
            .filter((s) => s.id)
            .map((s) => ({
              id: s.id!,
              profile_id: s.profile_id,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
        });
      } catch (error) {
        console.error('Failed to save roster:', error);
      } finally {
        setIsSaving(false);
      }
    };

    saveTimeoutRef.current = setTimeout(saveRoster, 5000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [shifts, rosterId, tenantId, user, authLoading, isDemoMode, isSaving, setIsSaving]);
}
