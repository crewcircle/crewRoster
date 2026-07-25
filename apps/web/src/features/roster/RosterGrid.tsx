'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  KeyboardSensor,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRosterStore } from '@/store/rosterStore';
import type { Shift } from '@/types/shift';
import type { Profile } from '@/types/profile';
import type { Roster } from '@/store/rosterStore';
import { Availability, detectConflicts } from '@packages/validators';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { shiftSchema } from '@/lib/validators/shift';
import { format } from 'date-fns';
import { useRosterRealtime } from './hooks/useRosterRealtime';
import ShiftCreationModal from './ShiftCreationModal';
import ShiftItem from './ShiftItem';
import RosterHeader, { DAYS_OF_WEEK } from './RosterHeader';

// Zod schema for shift creation
const shiftCreationSchema = z.object({
  employeeId: z.string(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start time'),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end time'),
  roleLabel: z.string().optional(),
  notes: z.string().optional(),
});

// Helper: get day-of-week index from timestamp in Sydney timezone
function getDayFromTimestamp(timestamp: string): number {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Australia/Sydney', weekday: 'short' });
  const dayName = formatter.format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayName);
}

export default function RosterGrid() {
  const store = useRosterStore();
  const profiles = store.profiles;
  const shifts = store.shifts;
  const setShifts = store.setShifts;
  const selectedWeekStart = store.selectedWeekStart;
  const setSelectedWeekStart = store.setSelectedWeekStart;
  const loading = store.loading;
  const roster = store.roster;
  const publishRoster = store.publishRoster;
  const unpublishRoster = store.unpublishRoster;
  const copyForwardRoster = store.copyForwardRoster;
  const operationError = store.operationError;
  const isOperating = store.isOperating;
  const setOperationError = store.setOperationError;
  const fetchCurrentRoster = store.fetchCurrentRoster;
  const setProfiles = store.setProfiles;

  const { user, tenantId, isLoading: authLoading, isDemoMode } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverlay, setDragOverlay] = useState<React.ReactNode | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isReadOnly = roster?.status === 'published';

  // Fetch roster + profiles on mount
  useEffect(() => {
    if (authLoading || !tenantId) return;
    fetchCurrentRoster(selectedWeekStart);
    fetch('/api/profiles')
      .then((res) => res.json())
      .then((data) => setProfiles(data.profiles as Profile[]))
      .catch(console.error);
  }, [tenantId, selectedWeekStart, authLoading, fetchCurrentRoster, setProfiles]);

  useRosterRealtime(tenantId);

  // Virtual rows for employee list
  const rowVirtualizer = useVirtualizer({
    count: profiles.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Auto-save draft roster (debounced 5s)
  useEffect(() => {
    if (authLoading || isDemoMode || !user || !tenantId) return;
    const saveTimeout = setTimeout(async () => {
      if (!roster?.id) return;
      try {
        setIsSaving(true);
        const response = await fetch('/api/roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-shifts',
            tenantId,
            rosterId: roster.id,
            shifts: shifts.map((s) => ({
              profile_id: s.profile_id,
              start_time: s.start_time,
              end_time: s.end_time,
              role_label: s.role_label,
              notes: s.notes,
            })),
          }),
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Save failed');
      } catch (error) {
        console.error('Failed to save roster:', error);
      } finally {
        setIsSaving(false);
      }
    }, 5000);
    return () => clearTimeout(saveTimeout);
  }, [shifts, tenantId, user, authLoading, isDemoMode, roster?.id]);

  // --- Drag & drop handlers ---
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const keyboardSensor = useSensor(KeyboardSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (isReadOnly) return;
    const shiftId = String(event.active.id);
    setActiveId(shiftId);
    const shift = shifts.find((s) => s.id === shiftId);
    const employee = shift ? profiles.find((p) => p.id === shift.profile_id) : undefined;
    if (shift && employee) {
      setDragOverlay(<ShiftItem shift={shift} employee={employee} isReadOnly={false} />);
    }
  }, [isReadOnly, shifts, profiles]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over || String(active.id) === String(over.id)) {
      setActiveId(null);
      setDragOverlay(null);
      return;
    }
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (!activeIdStr.startsWith('shift-') || !overIdStr.startsWith('cell-')) {
      setActiveId(null);
      setDragOverlay(null);
      return;
    }
    const shiftId = activeIdStr.split('-')[1];
    const [, targetEmployeeId, targetDayIndexStr] = overIdStr.split('-');
    const targetDayIndex = parseInt(targetDayIndexStr, 10);
    const shiftIndex = shifts.findIndex((s) => s.id === shiftId);
    if (shiftIndex === -1) return;
    const shift = shifts[shiftIndex];
    const durationMs = new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime();
    const weekStartDate = new Date(selectedWeekStart);
    weekStartDate.setDate(weekStartDate.getDate() + targetDayIndex);
    const targetDateStr = weekStartDate.toISOString().split('T')[0];
    const newStartTime = new Date(targetDateStr + 'T' + new Date(shift.start_time).toISOString().split('T')[1]);
    const newEndTime = new Date(newStartTime.getTime() + durationMs);
    const updatedShift = { ...shift, profile_id: targetEmployeeId, start_time: newStartTime.toISOString(), end_time: newEndTime.toISOString() };
    const newShifts = [...shifts];
    newShifts[shiftIndex] = updatedShift;
    setShifts(newShifts);
    try {
      await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-shift', shiftId, profileId: targetEmployeeId, startTime: newStartTime.toISOString(), endTime: newEndTime.toISOString() }),
      });
    } catch (err) {
      console.error('Failed to update shift:', err);
    }
    setActiveId(null);
    setDragOverlay(null);
  }, [isReadOnly, shifts, selectedWeekStart, setShifts]);

  // --- Shift creation ---
  const handleSaveShift = async (shiftData: z.infer<typeof shiftCreationSchema>) => {
    if (isReadOnly) { alert('Cannot add shifts to a published roster.'); return; }
    if (isDemoMode) { alert('Shift creation is disabled in demo mode.'); setOpenShiftModal(false); return; }
    try {
      shiftSchema.parse({ ...shiftData, tenant_id: tenantId || '', profile_id: shiftData.employeeId });
      const availability: Availability[] = [];
      const weeklyHoursMap = new Map<string, { profile_id: string; week_start: string; total_hours: number }>();
      const conflictResult = detectConflicts(
        { ...shiftData, tenant_id: tenantId || '', profile_id: shiftData.employeeId } as any,
        shifts, availability, weeklyHoursMap, null,
      );
      if (conflictResult.hasConflict && !window.confirm(`Conflict: ${conflictResult.message}\n\nContinue?`)) return;
      const response = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-shift', rosterId: roster?.id ?? null, profileId: shiftData.employeeId, startTime: shiftData.startTime, endTime: shiftData.endTime, roleLabel: shiftData.roleLabel || null, notes: shiftData.notes || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setShifts([...shifts, result.shift as Shift]);
      setOpenShiftModal(false);
    } catch (error) {
      console.error('Failed to save shift:', error);
      alert('Failed to save shift. Please try again.');
    }
  };

  // --- Week nav ---
  const weekStart = new Date(selectedWeekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const dateRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  const goToPreviousWeek = () => { const d = new Date(selectedWeekStart); d.setDate(d.getDate() - 7); setSelectedWeekStart(d.toISOString().split('T')[0]); };
  const goToNextWeek = () => { const d = new Date(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(d.toISOString().split('T')[0]); };
  const handlePublish = async () => { if (window.confirm('Publish this roster? Shifts become read-only.')) { const ok = await publishRoster(); if (!ok && operationError) alert(operationError); } };
  const handleUnpublish = async () => { if (window.confirm('Unpublish? Shifts become editable.')) { const ok = await unpublishRoster(); if (!ok && operationError) alert(operationError); } };
  const handleCopyForward = async () => { if (isDemoMode) return; if (window.confirm('Copy shifts to next week?')) { const ok = await copyForwardRoster(); if (!ok && operationError) alert(operationError); } };

  // --- Render helpers ---
  const renderCell = (employeeId: string, dayIndex: number) => {
    const dayShifts = shifts.filter(
      (s) => s.profile_id === employeeId && !s.deleted_at && getDayFromTimestamp(s.start_time) === dayIndex,
    );
    const shift = dayShifts[0];
    const employee = profiles.find((p) => p.id === employeeId);
    if (!employee) return null;
    return (
      <div
        key={`${employeeId}-${dayIndex}`}
        id={`cell-${employeeId}-${dayIndex}`}
        role="option"
        aria-label={`Cell for ${employee.first_name} ${employee.last_name} on ${DAYS_OF_WEEK[dayIndex]}`}
        className={`cell h-full border border-gray-200 rounded flex flex-col items-center justify-center p-2 ${activeId === `cell-${employeeId}-${dayIndex}` ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
        data-day={dayIndex}
        data-employee-id={employeeId}
      >
        {shift ? (
          <ShiftItem shift={shift} employee={employee} isReadOnly={isReadOnly} />
        ) : (
          <button
            onClick={() => { if (!isReadOnly) { setOpenShiftModal(true); } }}
            className={`add-shift-btn p-1 rounded border border-dashed border-gray-400 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            disabled={isReadOnly}
          >
            +
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="roster-grid p-4">
      <RosterHeader
        selectedWeekStart={selectedWeekStart}
        dateRange={dateRange}
        isReadOnly={isReadOnly}
        isOperating={isOperating}
        operationError={operationError}
        isSaving={isSaving}
        rosterStatus={roster?.status ?? null}
        goToPreviousWeek={goToPreviousWeek}
        goToNextWeek={goToNextWeek}
        handlePublish={handlePublish}
        handleUnpublish={handleUnpublish}
        handleCopyForward={handleCopyForward}
        setOperationError={setOperationError}
      />

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading roster...</p>
        </div>
      )}

      {!loading && (
        <DndContext
          sensors={[pointerSensor, keyboardSensor]}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div ref={scrollContainerRef} className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 max-h-[600px] overflow-auto">
            <div className="font-semibold p-2 bg-gray-100 rounded sticky top-0 z-10">Employee</div>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="font-semibold p-2 bg-gray-100 text-center rounded sticky top-0 z-10">
                {day}
              </div>
            ))}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const profile = profiles[virtualRow.index];
              return (
                <React.Fragment key={profile.id}>
                  <div className="p-2 bg-gray-50 border-t flex items-center sticky left-0 z-[1]" style={{ height: `${virtualRow.size}px` }}>
                    <div className="font-medium">{profile.first_name} {profile.last_name}</div>
                  </div>
                  {DAYS_OF_WEEK.map((_, dayIndex) => (
                    <div key={`${profile.id}-${dayIndex}`} className="min-h-[80px]" style={{ height: `${virtualRow.size}px` }}>
                      {renderCell(profile.id, dayIndex)}
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
          <DragOverlay>{dragOverlay}</DragOverlay>
        </DndContext>
      )}

      <ShiftCreationModal open={openShiftModal} onClose={() => setOpenShiftModal(false)} onSave={handleSaveShift} employees={profiles} />
    </div>
  );
}
