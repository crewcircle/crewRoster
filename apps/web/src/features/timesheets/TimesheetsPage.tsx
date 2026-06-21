"use client";

import { useCallback } from 'react';
import { format } from 'date-fns';
import { useTimesheets } from './hooks/useTimesheets';
import { useTimesheetActions } from './hooks/useTimesheetActions';
import { TimesheetTable } from './components/TimesheetTable';

export default function TimesheetsPage() {
  const {
    entries,
    isLoading,
    dateRange,
    setDateRange,
    groupedEntries,
    totalHours,
    unapprovedCount,
    refetch,
  } = useTimesheets();

  const { handleApprove, handleApproveAll, handleExportCSV, isDemoMode } = useTimesheetActions(
    undefined,
    refetch,
    entries
  );

  const handlePrevWeek = useCallback(() => {
    setDateRange({
      start: new Date(dateRange.start.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(dateRange.end.getTime() - 7 * 24 * 60 * 60 * 1000),
    });
  }, [dateRange, setDateRange]);

  const handleNextWeek = useCallback(() => {
    setDateRange({
      start: new Date(dateRange.start.getTime() + 7 * 24 * 60 * 60 * 1000),
      end: new Date(dateRange.end.getTime() + 7 * 24 * 60 * 60 * 1000),
    });
  }, [dateRange, setDateRange]);

  if (isDemoMode) {
    return <div className="p-6">Demo mode - timesheets not available</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Timesheets</h1>
        <div className="flex gap-2">
          <button
            onClick={handlePrevWeek}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            ← Previous Week
          </button>
          <button
            onClick={handleNextWeek}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Next Week →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold">Total: {totalHours.toFixed(1)} hours</span>
            <div className="flex gap-2">
              {unapprovedCount > 0 && (
                <button
                  onClick={handleApproveAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Approve All ({unapprovedCount})
                </button>
              )}
              <button
                onClick={handleExportCSV}
                disabled={entries.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <TimesheetTable
        groupedEntries={groupedEntries}
        onApprove={handleApprove}
        isLoading={isLoading}
      />
    </div>
  );
}