import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as rosterApi from '@/api/rosterApi';

describe('rosterApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchCurrentRoster', () => {
    it('calls GET /api/roster with tenantId and weekStart', async () => {
      const mockResponse = { roster: { id: 'r1' }, shifts: [] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await rosterApi.fetchCurrentRoster('tenant-1', '2026-01-01');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/roster?tenantId=tenant-1&weekStart=2026-01-01'
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      await expect(rosterApi.fetchCurrentRoster('tenant-1', '2026-01-01'))
        .rejects.toThrow('Not found');
    });
  });

  describe('fetchProfiles', () => {
    it('calls GET /api/profiles', async () => {
      const mockResponse = { profiles: [{ id: 'p1' }] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await rosterApi.fetchProfiles();

      expect(global.fetch).toHaveBeenCalledWith('/api/profiles');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('publishRoster', () => {
    it('calls POST /api/roster with publish action', async () => {
      const mockResponse = { roster: { id: 'r1', status: 'published' } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await rosterApi.publishRoster('roster-1');

      expect(global.fetch).toHaveBeenCalledWith('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', rosterId: 'roster-1' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('unpublishRoster', () => {
    it('calls POST /api/roster with unpublish action', async () => {
      const mockResponse = { roster: { id: 'r1', status: 'draft' } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await rosterApi.unpublishRoster('roster-1');

      expect(global.fetch).toHaveBeenCalledWith('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish', rosterId: 'roster-1' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('copyForwardRoster', () => {
    it('calls POST /api/roster with copy-forward action', async () => {
      const mockResponse = { roster: { id: 'r2' } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await rosterApi.copyForwardRoster('tenant-1', '2026-01-01', 'roster-1');

      expect(global.fetch).toHaveBeenCalledWith('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy-forward',
          tenantId: 'tenant-1',
          weekStart: '2026-01-01',
          rosterId: 'roster-1',
        }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createShift', () => {
    it('calls POST /api/roster with create-shift action', async () => {
      const mockResponse = { success: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await rosterApi.createShift({
        action: 'create-shift',
        rosterId: 'r1',
        profileId: 'p1',
        startTime: '2026-01-01T09:00:00Z',
        endTime: '2026-01-01T17:00:00Z',
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-shift',
          rosterId: 'r1',
          profileId: 'p1',
          startTime: '2026-01-01T09:00:00Z',
          endTime: '2026-01-01T17:00:00Z',
        }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateShift', () => {
    it('calls POST /api/roster with update-shift action', async () => {
      const mockResponse = { success: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await rosterApi.updateShift({
        action: 'update-shift',
        shiftId: 's1',
        profileId: 'p1',
        startTime: '2026-01-01T10:00:00Z',
        endTime: '2026-01-01T18:00:00Z',
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-shift',
          shiftId: 's1',
          profileId: 'p1',
          startTime: '2026-01-01T10:00:00Z',
          endTime: '2026-01-01T18:00:00Z',
        }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('saveShifts', () => {
    it('calls POST /api/roster with save-shifts action', async () => {
      const mockResponse = { success: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const shifts = [
        { id: 's1', profile_id: 'p1', start_time: '2026-01-01T09:00:00Z', end_time: '2026-01-01T17:00:00Z' },
      ];
      const result = await rosterApi.saveShifts({ action: 'save-shifts', shifts });

      expect(global.fetch).toHaveBeenCalledWith('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-shifts', shifts }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('throws on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(rosterApi.fetchCurrentRoster('tenant-1', '2026-01-01'))
        .rejects.toThrow('Network error');
    });

    it('throws with server error message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      await expect(rosterApi.publishRoster('roster-1'))
        .rejects.toThrow('Internal server error');
    });
  });
});