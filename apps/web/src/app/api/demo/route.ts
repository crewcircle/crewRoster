import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

const DEMO_USERS = [
  { email: 'demo-owner@crewcircle.co', firstName: 'Maria', lastName: 'Papadopoulos', role: 'owner' },
  { email: 'demo-manager@crewcircle.co', firstName: 'Jake', lastName: 'Thompson', role: 'manager' },
  { email: 'demo-employee1@crewcircle.co', firstName: 'Sarah', lastName: 'Chen', role: 'employee' },
  { email: 'demo-employee2@crewcircle.co', firstName: 'Emma', lastName: 'Wilson', role: 'employee' },
  { email: 'demo-pilot@crewcircle.co', firstName: 'Alex', lastName: 'Rivera', role: 'owner' },
];

interface ShiftDef {
  profileEmail: string;
  dayOffset: number;
  startHour: number;
  endHour: number;
  roleLabel: string;
}

function getCurrentWeekMonday(): Date {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function POST() {
  try {
    const supabase = createAdminClient();

    // Check if demo tenant already exists
    const { data: existingTenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', 'The Daily Grind Cafe')
      .is('deleted_at', null)
      .limit(1);

    let tenantId: string;
    let isNew = false;

    if (existingTenants && existingTenants.length > 0) {
      tenantId = existingTenants[0].id;
    } else {
      isNew = true;
      const { data: tenantResult } = await supabase
        .from('tenants')
        .insert({ name: 'The Daily Grind Cafe', abn: '51824753556', timezone: 'Australia/Sydney', plan: 'free' })
        .select('id')
        .single();

      if (!tenantResult) {
        return Response.json({ error: 'Failed to create demo tenant' }, { status: 500 });
      }
      tenantId = tenantResult.id;
    }

    // Create location if it doesn't exist
    const { data: existingLocations } = await supabase
      .from('locations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', 'Main Cafe - Surry Hills')
      .is('deleted_at', null)
      .limit(1);

    let locationId: string;

    if (existingLocations && existingLocations.length > 0) {
      locationId = existingLocations[0].id;
    } else {
      const { data: locationResult } = await supabase
        .from('locations')
        .insert({
          tenant_id: tenantId,
          name: 'Main Cafe - Surry Hills',
          address: '42 Crown Street, Surry Hills NSW 2010',
          latitude: -33.8833,
          longitude: 151.2167,
          timezone: 'Australia/Sydney',
          geofence_radius_m: 150,
        })
        .select('id')
        .single();

      if (!locationResult) {
        return Response.json({ error: 'Failed to create demo location' }, { status: 500 });
      }
      locationId = locationResult.id;
    }

    // Create roster for current week
    const monday = getCurrentWeekMonday();
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const { data: existingRosters } = await supabase
      .from('rosters')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('week_start', weekStart)
      .is('deleted_at', null)
      .limit(1);

    let rosterId: string;

    if (existingRosters && existingRosters.length > 0) {
      rosterId = existingRosters[0].id;
      await supabase.from('rosters').update({ status: 'published' }).eq('id', rosterId);
    } else {
      const { data: rosterResult } = await supabase
        .from('rosters')
        .insert({ tenant_id: tenantId, location_id: locationId, week_start: weekStart, status: 'published' })
        .select('id')
        .single();

      if (!rosterResult) {
        return Response.json({ error: 'Failed to create demo roster' }, { status: 500 });
      }
      rosterId = rosterResult.id;
    }

    // Create profiles if they don't exist
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const existingEmails = new Set((existingProfiles ?? []).map((p: Record<string, string>) => p.email));
    const profileMap = new Map<string, { id: string; email: string; role: string; firstName: string; lastName: string }>();

    for (const p of existingProfiles ?? []) {
      const user = DEMO_USERS.find((u) => u.email === p.email);
      if (user) {
        profileMap.set(p.email, { id: p.id, ...user });
      }
    }

    for (const user of DEMO_USERS) {
      if (!existingEmails.has(user.email)) {
        const profileId = randomUUID();
        await supabase.from('profiles').insert({
          id: profileId,
          tenant_id: tenantId,
          role: user.role,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
        });
        profileMap.set(user.email, { id: profileId, ...user });
      }
    }

    // Create demo shifts if none exist for this roster
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('roster_id', rosterId)
      .is('deleted_at', null)
      .limit(1);

    if (!existingShifts || existingShifts.length === 0) {
      const shiftDefs: ShiftDef[] = [
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 0, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 1, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 2, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 3, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 4, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 0, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 1, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 2, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 3, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 4, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-employee1@crewcircle.co', dayOffset: 0, startHour: 8, endHour: 14, roleLabel: 'Barista' },
        { profileEmail: 'demo-employee1@crewcircle.co', dayOffset: 2, startHour: 8, endHour: 14, roleLabel: 'Barista' },
        { profileEmail: 'demo-employee1@crewcircle.co', dayOffset: 4, startHour: 8, endHour: 14, roleLabel: 'Barista' },
        { profileEmail: 'demo-employee2@crewcircle.co', dayOffset: 1, startHour: 10, endHour: 16, roleLabel: 'Waitstaff' },
        { profileEmail: 'demo-employee2@crewcircle.co', dayOffset: 3, startHour: 10, endHour: 16, roleLabel: 'Waitstaff' },
        { profileEmail: 'demo-employee2@crewcircle.co', dayOffset: 5, startHour: 10, endHour: 16, roleLabel: 'Waitstaff' },
      ];

      for (const shift of shiftDefs) {
        const profile = profileMap.get(shift.profileEmail);
        if (!profile) continue;

        const shiftDate = new Date(monday);
        shiftDate.setDate(shiftDate.getDate() + shift.dayOffset);
        const shiftDateStr = shiftDate.toISOString().split('T')[0];

        const startTime = new Date(`${shiftDateStr}T${String(shift.startHour).padStart(2, '0')}:00:00+10:00`);
        const endTime = new Date(`${shiftDateStr}T${String(shift.endHour).padStart(2, '0')}:00:00+10:00`);

        await supabase.from('shifts').insert({
          tenant_id: tenantId,
          location_id: locationId,
          roster_id: rosterId,
          profile_id: profile.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          role_label: shift.roleLabel,
        });
      }
    }

    // Create availability for all demo profiles
    const availabilityDefs = [
      { email: 'demo-owner@crewcircle.co', days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' },
      { email: 'demo-manager@crewcircle.co', days: [1, 2, 3, 4, 5], start: '07:00', end: '16:00' },
      { email: 'demo-employee1@crewcircle.co', days: [1, 3, 5], start: '08:00', end: '15:00' },
      { email: 'demo-employee2@crewcircle.co', days: [2, 4, 6], start: '10:00', end: '17:00' },
    ];

    for (const avail of availabilityDefs) {
      const profile = profileMap.get(avail.email);
      if (!profile) continue;

      for (const dayOfWeek of avail.days) {
        await supabase.from('availability').upsert(
          {
            tenant_id: tenantId,
            profile_id: profile.id,
            day_of_week: dayOfWeek,
            start_time: avail.start,
            end_time: avail.end,
            is_available: true,
          },
          { onConflict: 'tenant_id,profile_id,day_of_week' },
        );
      }
    }

    return Response.json({
      success: true,
      message: isNew ? 'Demo organization created successfully' : 'Demo organization ready',
      tenantId,
    });
  } catch (error) {
    console.error('Error setting up demo:', error);
    return Response.json({
      error: 'Failed to set up demo: ' + (error instanceof Error ? error.message : 'Unknown error'),
    }, { status: 500 });
  }
}
