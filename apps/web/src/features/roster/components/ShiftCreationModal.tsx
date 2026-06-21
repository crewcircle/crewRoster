"use client";

import React, { useState } from 'react';
import { z } from 'zod';
import type { Profile } from '@/types/profile';

export interface ShiftFormData {
  employeeId: string;
  startTime: string;
  endTime: string;
  roleLabel: string;
  notes: string;
}

const shiftCreationSchema = z.object({
  employeeId: z.string(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start time'),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end time'),
  roleLabel: z.string().optional(),
  notes: z.string().optional(),
});

interface ShiftCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (shiftData: z.infer<typeof shiftCreationSchema>) => void;
  employees: Profile[];
}

const ShiftCreationModal: React.FC<ShiftCreationModalProps> = ({
  open,
  onClose,
  onSave,
  employees,
}) => {
  const [formData, setFormData] = useState<ShiftFormData>({
    employeeId: '',
    startTime: '',
    endTime: '',
    roleLabel: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors?.[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsed = shiftCreationSchema.parse(formData);
      onSave(parsed);
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMap: Record<string, string> = {};
        err.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            errorMap[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(errorMap);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add Shift</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee</label>
            <select
              value={formData.employeeId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
            {errors?.employeeId && (
              <p className="text-red-500 text-sm mt-1">{errors.employeeId}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            {errors?.startTime && (
              <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            {errors?.endTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role Label (optional)</label>
            <input
              type="text"
              value={formData.roleLabel}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || !formData.employeeId || !formData.startTime || !formData.endTime}
            >
              {isSubmitting ? 'Saving...' : 'Save Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftCreationModal;
