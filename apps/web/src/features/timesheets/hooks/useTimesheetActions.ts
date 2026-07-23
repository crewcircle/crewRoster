"use client";

import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import type { TimesheetEntry } from './useTimesheets';

export function useTimesheetActions(
  tenantId: string | undefined,
  refetch: () => void,
  entries: TimesheetEntry[]
) {
  const { isDemoMode } = useAuth();

  const handleApprove = async (profileId: string, workDate: string) => {
    if (!tenantId) return;
    try {
      await fetch('/api/timesheets/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, workDate, tenantId }),
      });
      refetch();
    } catch (error) {
      console.error('Approve error:', error);
    }
  };

  const handleApproveAll = async () => {
    if (!tenantId) return;
    const unapproved = entries.filter((e) => !e.approved_at);
    for (const entry of unapproved) {
      await handleApprove(entry.profile_id, entry.work_date);
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;

    const headers = 'Employee Name,Email,Date,Start,End,Hours,Location,Geofence,Approved\n';
    const rows = entries.map((entry) => {
      const date = entry.work_date ? format(new Date(entry.work_date), 'dd/MM/yyyy') : '';
      const clockIn = entry.clock_in ? format(new Date(entry.clock_in), 'HH:mm') : '';
      const clockOut = entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm') : 'Open';
      return [
        `"${entry.first_name} ${entry.last_name}"`,
        entry.email,
        date,
        clockIn,
        clockOut,
        entry.total_hours?.toFixed(2) || '',
        `"${entry.location_name || ''}"`,
        entry.is_within_geofence ? 'Yes' : 'No',
        entry.approved_at ? 'Yes' : 'No',
      ].join(',');
    }).join('\n');

    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    handleApprove,
    handleApproveAll,
    handleExportCSV,
    isDemoMode,
  };
}