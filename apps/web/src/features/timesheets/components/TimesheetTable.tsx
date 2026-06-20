"use client";

import { format } from 'date-fns';
import type { TimesheetEntry } from '../hooks/useTimesheets';

interface TimesheetTableProps {
  groupedEntries: Record<string, TimesheetEntry[]>;
  onApprove: (profileId: string, workDate: string) => void;
  isLoading: boolean;
}

export function TimesheetTable({ groupedEntries, onApprove, isLoading }: TimesheetTableProps) {
  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading timesheets...</div>;
  }

  if (Object.keys(groupedEntries).length === 0) {
    return <div className="text-center py-12 text-gray-500">No timesheet entries found for this period.</div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([date, dayEntries]) => (
        <div key={date} className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b font-medium text-sm flex justify-between items-center">
            <span>{format(new Date(date), 'EEEE, MMMM d, yyyy')}</span>
            <span className="text-gray-500">
              {dayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0).toFixed(1)}h
            </span>
          </div>
          <div className="divide-y">
            {dayEntries.map((entry) => (
              <div key={`${entry.profile_id}-${entry.work_date}`} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                    {entry.first_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {entry.first_name} {entry.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {entry.location_name || 'No location'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium">
                      {entry.clock_in && format(new Date(entry.clock_in), 'h:mm a')}
                      {entry.clock_out && ` - ${format(new Date(entry.clock_out), 'h:mm a')}`}
                      {!entry.clock_in && <span className="text-gray-400">Not clocked in</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {entry.total_hours?.toFixed(1) || '0'} hours
                      {entry.is_within_geofence && (
                        <span className="ml-2 text-green-600">✓ GPS verified</span>
                      )}
                    </p>
                  </div>
                  {entry.approved_at ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ Approved
                    </span>
                  ) : (
                    <button
                      onClick={() => onApprove(entry.profile_id, entry.work_date)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}