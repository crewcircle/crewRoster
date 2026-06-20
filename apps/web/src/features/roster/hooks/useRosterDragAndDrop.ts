import { useState, useCallback } from 'react';
import {
  PointerSensor,
  useSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Shift } from '@/types/shift';
import type { Profile } from '@/types/profile';
import * as rosterApi from '@/api/rosterApi';

interface UseRosterDragAndDropOptions {
  shifts: Shift[];
  profiles: Profile[];
  setShifts: (shifts: Shift[]) => void;
  selectedWeekStart: string;
  isReadOnly: boolean;
  renderShiftItem: (shift: Shift, profile: Profile) => React.ReactNode;
}

interface UseRosterDragAndDropReturn {
  activeId: string | null;
  dragOverlay: React.ReactNode | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  pointerSensor: ReturnType<typeof useSensor>;
  keyboardSensor: ReturnType<typeof useSensor>;
}

export function useRosterDragAndDrop({
  shifts,
  profiles,
  setShifts,
  selectedWeekStart,
  isReadOnly,
  renderShiftItem,
}: UseRosterDragAndDropOptions): UseRosterDragAndDropReturn {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverlay, setDragOverlay] = useState<React.ReactNode | null>(null);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (isReadOnly) return;
      const shiftId = String(event.active.id);
      setActiveId(shiftId);
      const shift = shifts.find((s) => s.id === shiftId);
      if (shift) {
        const employee = profiles.find((p) => p.id === shift.profile_id);
        if (employee) {
          setDragOverlay(renderShiftItem(shift, employee));
        }
      }
    },
    [isReadOnly, shifts, profiles, renderShiftItem]
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // handled in dragEnd
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (isReadOnly) return;
      const { active, over } = event;
      if (!over || String(active.id) === String(over.id)) {
        setActiveId(null);
        setDragOverlay(null);
        return;
      }

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      if (activeIdStr.startsWith('shift-') && overIdStr.startsWith('cell-')) {
        const shiftId = activeIdStr.split('-')[1];
        const [, targetEmployeeId, targetDayIndexStr] = overIdStr.split('-');
        const targetDayIndex = parseInt(targetDayIndexStr, 10);

        const shiftIndex = shifts.findIndex((s) => s.id === shiftId);
        if (shiftIndex !== -1) {
          const shift = shifts[shiftIndex];
          const originalStart = new Date(shift.start_time);
          const originalEnd = new Date(shift.end_time);
          const durationMs = originalEnd.getTime() - originalStart.getTime();

          const weekStartDate = new Date(selectedWeekStart);
          weekStartDate.setDate(weekStartDate.getDate() + targetDayIndex);
          const targetDateStr = weekStartDate.toISOString().split('T')[0];

          const newStartTime = new Date(targetDateStr + 'T' + originalStart.toISOString().split('T')[1]);
          const newEndTime = new Date(newStartTime.getTime() + durationMs);

          const updatedShift = {
            ...shift,
            profile_id: targetEmployeeId,
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString(),
          };

          const newShifts = [...shifts];
          newShifts[shiftIndex] = updatedShift;
          setShifts(newShifts);

          try {
            await rosterApi.updateShift({
              action: 'update-shift',
              shiftId,
              profileId: targetEmployeeId,
              startTime: newStartTime.toISOString(),
              endTime: newEndTime.toISOString(),
            });
          } catch (err) {
            console.error('Failed to update shift:', err);
          }
        }
      }

      setActiveId(null);
      setDragOverlay(null);
    },
    [isReadOnly, shifts, selectedWeekStart, setShifts]
  );

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);

  return {
    activeId,
    dragOverlay,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    pointerSensor,
    keyboardSensor,
  };
}
