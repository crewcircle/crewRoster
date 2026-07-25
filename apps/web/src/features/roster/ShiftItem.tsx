import React from 'react';
import { Shift } from '@/types/shift';
import { Profile } from '@/types/profile';

interface Props {
  shift: Shift;
  employee: Profile;
  isReadOnly: boolean;
}

export default function ShiftItem({ shift, employee, isReadOnly }: Props) {
  const startTime = new Date(shift.start_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(shift.end_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const durationHours =
    (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) /
    (1000 * 60 * 60);

  return (
    <div
      id={`shift-${shift.id}`}
      role="option"
      aria-label={`Shift for ${employee.first_name} ${employee.last_name} from ${startTime} to ${endTime}`}
      className={`shift-item p-2 bg-blue-50 border border-blue-200 rounded ${isReadOnly ? 'cursor-default' : 'cursor-grab'}`}
    >
      <div className="font-medium text-xs">
        {employee.first_name} {employee.last_name}
      </div>
      <div className="text-xs text-gray-600">
        {startTime} - {endTime}
      </div>
      {shift.role_label && (
        <div className="text-xs text-blue-600 italic">{shift.role_label}</div>
      )}
      <div className="text-xs text-gray-400">{durationHours.toFixed(1)}h</div>
    </div>
  );
}
