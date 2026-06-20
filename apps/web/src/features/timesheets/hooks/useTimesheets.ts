"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '@/lib/clerk/useAuth';

export interface TimesheetEntry {
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  location_name: string | null;
  is_within_geofence: boolean | null;
  approved_at: string | null;
  approved_by: string | null;
}

interface UseTimesheetsResult {
  entries: TimesheetEntry[];
  isLoading: boolean;
  dateRange: { start: Date; end: Date };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: Date; end: Date }>>;
  groupedEntries: Record<string, TimesheetEntry[]>;
  totalHours: number;
  unapprovedCount: number;
  refetch: () => void;
}

export function useTimesheets(): UseTimesheetsResult {
  const { tenantId, authLoading } = useAuth();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  const fetchEntries = useCallback(async () => {
    if (authLoading || !tenantId) return;

    setIsLoading(true);
    try {
      const start = dateRange.start.toISOString();
      const end = dateRange.end.toISOString();

      const response = await fetch(
        `/api/timesheets?tenantId=${tenantId}&start=${start}&end=${end}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch timesheets');
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching timesheet entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, dateRange, authLoading]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const groupedEntries = useMemo(() => {
    const grouped: Record<string, TimesheetEntry[]> = {};
    entries.forEach((entry) => {
      const date = entry.work_date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(entry);
    });
    return grouped;
  }, [entries]);

  const totalHours = useMemo(() => {
    return entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  }, [entries]);

  const unapprovedCount = useMemo(() => {
    return entries.filter((e) => !e.approved_at).length;
  }, [entries]);

  return {
    entries,
    isLoading,
    dateRange,
    setDateRange,
    groupedEntries,
    totalHours,
    unapprovedCount,
    refetch: fetchEntries,
  };
}