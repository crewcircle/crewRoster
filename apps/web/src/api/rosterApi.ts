import type { Shift } from '@/types/shift';
import type { Roster, RosterStatus } from '@/store/rosterStore';

interface ApiError {
  error: string;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

export interface PublishRosterResult {
  roster?: Roster;
}

export interface CopyForwardResult {
  roster: Roster;
}

export interface FetchRosterResult {
  roster: Roster | null;
  shifts: Shift[];
}

export interface FetchProfilesResult {
  profiles: import('@/types/profile').Profile[];
}

export async function publishRoster(rosterId: string): Promise<PublishRosterResult> {
  return apiPost<PublishRosterResult>('/api/roster', { action: 'publish', rosterId });
}

export async function unpublishRoster(rosterId: string): Promise<PublishRosterResult> {
  return apiPost<PublishRosterResult>('/api/roster', { action: 'unpublish', rosterId });
}

export async function copyForwardRoster(
  tenantId: string,
  weekStart: string,
  rosterId: string
): Promise<CopyForwardResult> {
  return apiPost<CopyForwardResult>('/api/roster', {
    action: 'copy-forward',
    tenantId,
    weekStart,
    rosterId,
  });
}

export async function fetchCurrentRoster(
  tenantId: string,
  weekStart: string
): Promise<FetchRosterResult> {
  return apiGet<FetchRosterResult>(
    `/api/roster?tenantId=${encodeURIComponent(tenantId)}&weekStart=${encodeURIComponent(weekStart)}`
  );
}

export interface CreateShiftBody {
  action: 'create-shift';
  rosterId: string;
  profileId: string;
  startTime: string;
  endTime: string;
}

export interface UpdateShiftBody {
  action: 'update-shift';
  shiftId: string;
  profileId?: string;
  startTime?: string;
  endTime?: string;
}

export interface SaveShiftsBody {
  action: 'save-shifts';
  shifts: Array<{ id: string; profile_id: string; start_time: string; end_time: string }>;
}

export async function createShift(body: CreateShiftBody): Promise<PublishRosterResult> {
  return apiPost<PublishRosterResult>('/api/roster', body);
}

export async function updateShift(body: UpdateShiftBody): Promise<PublishRosterResult> {
  return apiPost<PublishRosterResult>('/api/roster', body);
}

export async function saveShifts(body: SaveShiftsBody): Promise<PublishRosterResult> {
  return apiPost<PublishRosterResult>('/api/roster', body);
}

export async function fetchProfiles(): Promise<FetchProfilesResult> {
  return apiGet<FetchProfilesResult>('/api/profiles');
}
