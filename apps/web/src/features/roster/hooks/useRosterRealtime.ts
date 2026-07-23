import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRosterStore } from '@/store/rosterStore';

export function useRosterRealtime(tenantId: string | null) {
  const roster = useRosterStore((s) => s.roster);
  const selectedWeekStart = useRosterStore((s) => s.selectedWeekStart);
  const fetchCurrentRoster = useRosterStore((s) => s.fetchCurrentRoster);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!roster?.id || !tenantId) return;

    const supabase = createClient();

    // Supabase Realtime: subscribe to shift changes for this roster
    const channel = supabase
      .channel(`roster-${roster.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts', filter: `roster_id=eq.${roster.id}` },
        () => {
          fetchCurrentRoster(tenantId, selectedWeekStart);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roster?.id, tenantId, selectedWeekStart, fetchCurrentRoster]);

  // Fallback polling (30s) — keeps data fresh even if realtime is unavailable
  useEffect(() => {
    if (!roster?.id || !tenantId) return;

    pollRef.current = setInterval(() => {
      fetchCurrentRoster(tenantId, selectedWeekStart);
    }, 30_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roster?.id, tenantId, selectedWeekStart, fetchCurrentRoster]);
}
