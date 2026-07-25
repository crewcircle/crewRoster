import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/supabase/getTenantId';

// ---------------------------------------------------------------------------
// GET  — fetch roster + shifts for a tenant/week
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { tenantId, client } = await getTenantId();
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 });
    }

    // Find or create roster
    const { data: rosters } = await client
      .from('rosters')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('week_start', weekStart)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    let roster = rosters && rosters.length > 0 ? rosters[0] : null;

    if (!roster) {
      const { data: locations } = await client
        .from('locations')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .limit(1);

      if (!locations || locations.length === 0) {
        return NextResponse.json({ error: 'No location found for tenant' }, { status: 404 });
      }

      const locationId = locations[0].id;
      const { data: newRosters } = await client
        .from('rosters')
        .insert({ tenant_id: tenantId, location_id: locationId, week_start: weekStart, status: 'draft' })
        .select('*');

      roster = newRosters && newRosters.length > 0 ? newRosters[0] : null;
    }

    if (!roster) {
      return NextResponse.json({ error: 'Failed to create roster' }, { status: 500 });
    }

    const { data: shifts } = await client
      .from('shifts')
      .select('*')
      .eq('roster_id', roster.id)
      .is('deleted_at', null);

    return NextResponse.json({ roster, shifts: shifts ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch roster:', error);
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — publish / unpublish / copy-forward / save-shifts / update-shift / create-shift
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const { tenantId, client } = await getTenantId();
    const body = await request.json();
    const { action, weekStart, rosterId, shifts } = body;

    switch (action) {
      // -- publish ----------------------------------------------------------
      case 'publish': {
        await client
          .from('rosters')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            published_by: 'system',
          })
          .eq('id', rosterId);
        return NextResponse.json({ success: true });
      }

      // -- unpublish --------------------------------------------------------
      case 'unpublish': {
        await client
          .from('rosters')
          .update({ status: 'draft', published_at: null, published_by: null })
          .eq('id', rosterId);
        return NextResponse.json({ success: true });
      }

      // -- copy-forward -----------------------------------------------------
      case 'copy-forward': {
        const currentWeekStart = new Date(weekStart);
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(currentWeekStart.getDate() + 7);
        const newWeekStartStr = newWeekStart.toISOString().split('T')[0];

        const { data: existingRosters } = await client
          .from('rosters')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('week_start', newWeekStartStr)
          .is('deleted_at', null);

        if (existingRosters && existingRosters.length > 0) {
          return NextResponse.json({ success: true, roster: existingRosters[0] });
        }

        const { data: sourceRoster } = await client
          .from('rosters')
          .select('*')
          .eq('id', rosterId)
          .single();

        if (!sourceRoster) {
          return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
        }

        const { data: newRosters } = await client
          .from('rosters')
          .insert({
            tenant_id: tenantId,
            location_id: sourceRoster.location_id,
            week_start: newWeekStartStr,
            status: 'draft',
          })
          .select('*');

        if (!newRosters || newRosters.length === 0) {
          return NextResponse.json({ error: 'Failed to create new roster' }, { status: 500 });
        }

        const newRoster = newRosters[0];
        const { data: sourceShifts } = await client
          .from('shifts')
          .select('*')
          .eq('roster_id', rosterId)
          .is('deleted_at', null);

        if (sourceShifts) {
          for (const shift of sourceShifts) {
            const startTime = new Date(shift.start_time);
            const endTime = new Date(shift.end_time);
            startTime.setDate(startTime.getDate() + 7);
            endTime.setDate(endTime.getDate() + 7);

            await client.from('shifts').insert({
              tenant_id: shift.tenant_id,
              location_id: sourceRoster.location_id,
              roster_id: newRoster.id,
              profile_id: shift.profile_id,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              role_label: shift.role_label,
              notes: shift.notes,
            });
          }
        }

        return NextResponse.json({ success: true, roster: newRoster });
      }

      // -- save-shifts ------------------------------------------------------
      case 'save-shifts': {
        if (!rosterId || !shifts) {
          return NextResponse.json({ error: 'rosterId and shifts required' }, { status: 400 });
        }

        const { data: roster } = await client
          .from('rosters')
          .select('location_id')
          .eq('id', rosterId)
          .single();

        if (!roster) {
          return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
        }
        const locationId = roster.location_id;

        // Soft-delete: mark removed shifts, upsert current
        const currentShiftIds = shifts
          .filter((s: Record<string, unknown>) => s.id)
          .map((s: Record<string, unknown>) => s.id);

        const softDeleteQuery = client
          .from('shifts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('roster_id', rosterId);

        if (currentShiftIds.length > 0) {
          await softDeleteQuery.not('id', 'in', `(${currentShiftIds.join(',')})`);
        } else {
          await softDeleteQuery;
        }

        for (const shift of shifts) {
          await client.from('shifts').upsert(
            {
              id: shift.id || undefined,
              tenant_id: tenantId,
              location_id: locationId,
              roster_id: rosterId,
              profile_id: shift.profile_id,
              start_time: shift.start_time,
              end_time: shift.end_time,
              role_label: shift.role_label || null,
              notes: shift.notes || null,
              deleted_at: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' },
          );
        }

        return NextResponse.json({ success: true });
      }

      // -- update-shift -----------------------------------------------------
      case 'update-shift': {
        const { shiftId, profileId, startTime, endTime } = body;
        await client
          .from('shifts')
          .update({
            profile_id: profileId,
            start_time: startTime,
            end_time: endTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shiftId);
        return NextResponse.json({ success: true });
      }

      // -- create-shift -----------------------------------------------------
      case 'create-shift': {
        const { profileId, startTime, endTime, roleLabel, notes } = body;

        let locationId: string | null = null;
        if (rosterId) {
          const { data: r } = await client
            .from('rosters')
            .select('location_id')
            .eq('id', rosterId)
            .single();
          if (r) locationId = r.location_id;
        }

        const { data: newShifts } = await client
          .from('shifts')
          .insert({
            tenant_id: tenantId,
            location_id: locationId,
            roster_id: rosterId || null,
            profile_id: profileId,
            start_time: startTime,
            end_time: endTime,
            role_label: roleLabel || null,
            notes: notes || null,
          })
          .select('*');

        if (!newShifts || newShifts.length === 0) {
          return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
        }

        return NextResponse.json({ success: true, shift: newShifts[0] });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Roster API error:', error);
    return NextResponse.json({ error: 'Failed to process roster request' }, { status: 500 });
  }
}