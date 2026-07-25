import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/supabase/getTenantId';

export async function GET(request: NextRequest) {
  try {
    const { tenantId, client } = await getTenantId();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end required' }, { status: 400 });
    }

    // Fetch profiles + clock events for the tenant/date range
    const { data: profiles } = await client
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    const profileIds = profiles.map((p) => p.id);

    const { data: events } = await client
      .from('clock_events')
      .select('profile_id, type, recorded_at, is_within_geofence, approved_at, approved_by, location_id')
      .in('profile_id', profileIds)
      .gte('recorded_at', start)
      .lt('recorded_at', end)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: true });

    if (!events || events.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    // Group clock events by profile_id + work_date
    const grouped: Record<string, {
      profile_id: string;
      clock_in: string | null;
      clock_out: string | null;
      is_within_geofence: boolean;
      approved_at: string | null;
      approved_by: string | null;
      location_id: string | null;
    }> = {};

    for (const ev of events) {
      const workDate = new Date(ev.recorded_at).toISOString().split('T')[0];
      const key = `${ev.profile_id}_${workDate}`;

      if (!grouped[key]) {
        grouped[key] = {
          profile_id: ev.profile_id,
          clock_in: null,
          clock_out: null,
          is_within_geofence: false,
          approved_at: null,
          approved_by: null,
          location_id: null,
        };
      }

      if (ev.type === 'clock_in') {
        if (!grouped[key].clock_in || ev.recorded_at < grouped[key].clock_in!) {
          grouped[key].clock_in = ev.recorded_at;
        }
      } else if (ev.type === 'clock_out') {
        if (!grouped[key].clock_out || ev.recorded_at > grouped[key].clock_out!) {
          grouped[key].clock_out = ev.recorded_at;
        }
      }

      if (ev.is_within_geofence) grouped[key].is_within_geofence = true;
      if (ev.approved_at) grouped[key].approved_at = ev.approved_at;
      if (ev.approved_by) grouped[key].approved_by = ev.approved_by;
      if (ev.location_id) grouped[key].location_id = ev.location_id;
    }

    // Build response entries
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const entries = Object.values(grouped).map((g) => {
      const profile = profileMap.get(g.profile_id);
      const totalHours =
        g.clock_in && g.clock_out
          ? Math.round(((new Date(g.clock_out).getTime() - new Date(g.clock_in).getTime()) / 3600000) * 100) / 100
          : null;

      return {
        profile_id: g.profile_id,
        first_name: profile?.first_name ?? '',
        last_name: profile?.last_name ?? '',
        email: profile?.email ?? '',
        work_date: null,
        clock_in: g.clock_in,
        clock_out: g.clock_out,
        total_hours: totalHours,
        is_within_geofence: g.is_within_geofence,
        approved_at: g.approved_at,
        approved_by: g.approved_by,
        location_name: null,
      };
    }).map((e) => ({
      ...e,
      work_date: e.clock_in ? new Date(e.clock_in).toISOString().split('T')[0] : null,
    }));

    entries.sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;
      return nameA.localeCompare(nameB) || (a.work_date ?? '').localeCompare(b.work_date ?? '');
    });

    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching timesheet entries:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 });
  }
}