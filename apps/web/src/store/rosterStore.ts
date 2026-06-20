import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Profile } from '@/types/profile';
import type { Shift } from '@/types/shift';
import * as rosterApi from '@/api/rosterApi';

export type RosterStatus = 'draft' | 'published' | 'archived';

export interface Roster {
  id: string;
  tenant_id: string;
  location_id: string;
  week_start: string;
  status: RosterStatus;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface RosterState {
  profiles: Profile[];
  shifts: Shift[];
  roster: Roster | null;
  selectedWeekStart: string;
  loading: boolean;
  operationError: string | null;
  isOperating: boolean;
  setProfiles: (profiles: Profile[]) => void;
  setShifts: (shifts: Shift[]) => void;
  setRoster: (roster: Roster | null) => void;
  setSelectedWeekStart: (date: string) => void;
  setLoading: (loading: boolean) => void;
  setOperationError: (error: string | null) => void;
  setIsOperating: (isOperating: boolean) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (profile: Partial<Profile> & { id: string }) => void;
  removeProfile: (id: string) => void;
  addShift: (shift: Shift) => void;
  updateShift: (shift: Partial<Shift> & { id: string }) => void;
  removeShift: (id: string) => void;
  publishRoster: () => Promise<boolean>;
  unpublishRoster: () => Promise<boolean>;
  copyForwardRoster: () => Promise<boolean>;
  fetchCurrentRoster: (tenantId: string, weekStart: string) => Promise<void>;
}

function getMonday(): string {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export const useRosterStore = create<RosterState>()(
  immer((set, get) => ({
    profiles: [],
    shifts: [],
    roster: null,
    selectedWeekStart: getMonday(),
    loading: true,
    operationError: null,
    isOperating: false,

    setProfiles: (profiles) => set({ profiles }),
    setShifts: (shifts) => set({ shifts }),
    setRoster: (roster) => set({ roster }),
    setSelectedWeekStart: (date) => set({ selectedWeekStart: date }),
    setLoading: (loading) => set({ loading }),
    setOperationError: (error) => set({ operationError: error }),
    setIsOperating: (isOperating) => set({ isOperating }),

    addProfile: (profile) =>
      set((state) => {
        state.profiles.push(profile);
      }),
    updateProfile: (updatedProfile) =>
      set((state) => {
        const index = state.profiles.findIndex((p) => p.id === updatedProfile.id);
        if (index !== -1) {
          state.profiles[index] = { ...state.profiles[index], ...updatedProfile };
        }
      }),
    removeProfile: (id) =>
      set((state) => {
        state.profiles = state.profiles.filter((p) => p.id !== id);
      }),
    addShift: (shift) =>
      set((state) => {
        state.shifts.push(shift);
      }),
    updateShift: (updatedShift) =>
      set((state) => {
        const index = state.shifts.findIndex((s) => s.id === updatedShift.id);
        if (index !== -1) {
          state.shifts[index] = { ...state.shifts[index], ...updatedShift };
        }
      }),
    removeShift: (id) =>
      set((state) => {
        state.shifts = state.shifts.filter((s) => s.id !== id);
      }),

    publishRoster: async () => {
      const { roster } = get();
      if (!roster) {
        set({ operationError: 'No roster selected' });
        return false;
      }
      set({ isOperating: true, operationError: null });
      try {
        const { roster: updated } = await rosterApi.publishRoster(roster.id);
        if (updated) {
          set({ roster: { ...roster, ...updated } });
        } else {
          set({
            roster: { ...roster, status: 'published' as const, published_at: new Date().toISOString() },
          });
        }
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        set({ operationError: `Failed to publish roster: ${errorMessage}` });
        return false;
      } finally {
        set({ isOperating: false });
      }
    },

    unpublishRoster: async () => {
      const { roster } = get();
      if (!roster) {
        set({ operationError: 'No roster selected' });
        return false;
      }
      set({ isOperating: true, operationError: null });
      try {
        await rosterApi.unpublishRoster(roster.id);
        set({
          roster: { ...roster, status: 'draft' as const, published_at: null, published_by: null },
        });
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        set({ operationError: `Failed to unpublish roster: ${errorMessage}` });
        return false;
      } finally {
        set({ isOperating: false });
      }
    },

    copyForwardRoster: async () => {
      const { roster } = get();
      if (!roster || roster.status !== 'published') {
        set({ operationError: 'Can only copy forward from a published roster' });
        return false;
      }
      set({ isOperating: true, operationError: null });
      try {
        const result = await rosterApi.copyForwardRoster(
          roster.tenant_id,
          roster.week_start,
          roster.id
        );
        set({ roster: result.roster });
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        set({ operationError: `Unexpected error: ${errorMessage}` });
        return false;
      } finally {
        set({ isOperating: false });
      }
    },

    fetchCurrentRoster: async (tenantId: string, weekStart: string) => {
      set({ loading: true });
      try {
        const result = await rosterApi.fetchCurrentRoster(tenantId, weekStart);
        set({ roster: result.roster, shifts: result.shifts, loading: false });
      } catch (error) {
        console.error('Failed to fetch roster:', error);
        set({ loading: false });
      }
    },
  }))
);
