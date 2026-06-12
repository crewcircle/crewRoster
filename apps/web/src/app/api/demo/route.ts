import { sql } from '@/lib/neon/client';
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
    // Check if demo tenant already exists
    const existingTenants = await sql`
      SELECT id FROM tenants WHERE name = 'The Daily Grind Cafe' AND deleted_at IS NULL LIMIT 1
    `;
    let tenantId: string;
    let isNew = false;

    if (existingTenants.length > 0) {
      tenantId = existingTenants[0].id;
    } else {
      isNew = true;
      const tenantResult = await sql`
        INSERT INTO tenants (name, abn, timezone, plan)
        VALUES ('The Daily Grind Cafe', '51824753556', 'Australia/Sydney', 'free')
        RETURNING id
      `;
      tenantId = tenantResult[0].id;
    }

    // Create location if it doesn't exist
    const existingLocations = await sql`
      SELECT id FROM locations WHERE tenant_id = ${tenantId} AND name = 'Main Cafe - Surry Hills' AND deleted_at IS NULL LIMIT 1
    `;
    let locationId: string;

    if (existingLocations.length > 0) {
      locationId = existingLocations[0].id;
    } else {
      const locationResult = await sql`
        INSERT INTO locations (tenant_id, name, address, latitude, longitude, timezone, geofence_radius_m)
        VALUES (${tenantId}, 'Main Cafe - Surry Hills', '42 Crown Street, Surry Hills NSW 2010', -33.8833, 151.2167, 'Australia/Sydney', 150)
        RETURNING id
      `;
      locationId = locationResult[0].id;
    }

    // Create roster for current week
    const monday = getCurrentWeekMonday();
    // Use local date string to avoid UTC date shift (AEST → UTC is -1 day)
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const existingRosters = await sql`
      SELECT id FROM rosters WHERE tenant_id = ${tenantId} AND week_start = ${weekStart} AND deleted_at IS NULL LIMIT 1
    `;
    let rosterId: string;

    if (existingRosters.length > 0) {
      rosterId = existingRosters[0].id;
      // Ensure the roster is published (roster API may have created it as draft)
      await sql`UPDATE rosters SET status = 'published' WHERE id = ${rosterId}`;
    } else {
      const rosterResult = await sql`
        INSERT INTO rosters (tenant_id, location_id, week_start, status)
        VALUES (${tenantId}, ${locationId}, ${weekStart}, 'published')
        RETURNING id
      `;
      rosterId = rosterResult[0].id;
    }

    // Create profiles if they don't exist
    const existingProfiles = await sql`
      SELECT id, email FROM profiles WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
    `;
    const existingEmails = new Set(existingProfiles.map((p: any) => p.email));
    const profileMap = new Map<string, { id: string; email: string; role: string; firstName: string; lastName: string }>();

    for (const p of existingProfiles) {
      const user = DEMO_USERS.find((u) => u.email === p.email);
      if (user) {
        profileMap.set(p.email, { id: p.id, ...user });
      }
    }

    for (const user of DEMO_USERS) {
      if (!existingEmails.has(user.email)) {
        const profileId = randomUUID();
        await sql`
          INSERT INTO profiles (id, tenant_id, role, first_name, last_name, email)
          VALUES (${profileId}, ${tenantId}, ${user.role}, ${user.firstName}, ${user.lastName}, ${user.email})
        `;
        profileMap.set(user.email, { id: profileId, ...user });
      }
    }

    // Create demo shifts if none exist for this roster
    const existingShifts = await sql`
      SELECT id FROM shifts WHERE roster_id = ${rosterId} AND deleted_at IS NULL LIMIT 1
    `;

    if (existingShifts.length === 0) {
      const shiftDefs: ShiftDef[] = [
        // Maria (owner) - Mon-Fri 9am-5pm
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 0, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 1, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 2, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 3, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        { profileEmail: 'demo-owner@crewcircle.co', dayOffset: 4, startHour: 9, endHour: 17, roleLabel: 'Owner' },
        // Jake (manager) - Mon-Fri 7am-3pm
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 0, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 1, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 2, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 3, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        { profileEmail: 'demo-manager@crewcircle.co', dayOffset: 4, startHour: 7, endHour: 15, roleLabel: 'Manager' },
        // Sarah (employee barista) - Mon, Wed, Fri 8am-2pm
        { profileEmail: 'demo-employee1@crewcircle.co', dayOffset: 0, startHour: 8, endHour: 14, roleLabel: 'Barista' },
        { profileEmail: 'demo-employee1@crewcircle.co', dayOffset: 2, startHour: 8, endHour: 14, roleLabel: 'Barista' },
        { profileEmail: 'demo-employee1@crewcircle.co', dayOffset: 4, startHour: 8, endHour: 14, roleLabel: 'Barista' },
        // Emma (employee waitstaff) - Tue, Thu, Sat 10am-4pm
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

        // Use AEST (+10:00) for Sydney cafe shifts
        const startTime = new Date(`${shiftDateStr}T${String(shift.startHour).padStart(2, '0')}:00:00+10:00`);
        const endTime = new Date(`${shiftDateStr}T${String(shift.endHour).padStart(2, '0')}:00:00+10:00`);

        await sql`
          INSERT INTO shifts (tenant_id, location_id, roster_id, profile_id, start_time, end_time, role_label)
          VALUES (${tenantId}, ${locationId}, ${rosterId}, ${profile.id}, ${startTime.toISOString()}, ${endTime.toISOString()}, ${shift.roleLabel})
        `;
      }
      }

      // Create clock events for today's shifts (if weekday)
      const today = new Date();
      // Calculate today's date in Australia/Sydney timezone
      const todaySydney = today.toLocaleString('en-US', { timeZone: 'Australia/Sydney', hour12: false });
      const [todayMonth, todayDay, todayYear] = todaySydney.split(',')[0].split('/').map(Number);
      const todayDateStr = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
      const todayDayOfWeek = new Date(`${todayDateStr}T00:00:00+10:00`).getDay(); // 0=Sun, 1=Mon...

      if (todayDayOfWeek >= 1 && todayDayOfWeek <= 5) {
        // Get today's shifts for this roster (match Sydney date)
        const todaysShifts = await sql`
          SELECT id, profile_id, start_time, end_time FROM shifts
          WHERE roster_id = ${rosterId} AND DATE(start_time AT TIME ZONE 'Australia/Sydney') = ${todayDateStr}
          AND deleted_at IS NULL
        `;

        for (const shift of todaysShifts) {
          const clockInTime = new Date(shift.start_time);
          const clockOutTime = new Date(shift.end_time);

          // Clock in event with idempotency_key (random UUID - ON CONFLICT DO NOTHING for re-runs)
          await sql`
            INSERT INTO clock_events (tenant_id, location_id, profile_id, shift_id, type, recorded_at, latitude, longitude, accuracy_m, is_within_geofence, source, idempotency_key)
            VALUES (${tenantId}, ${locationId}, ${shift.profile_id}, ${shift.id}, 'clock_in', ${clockInTime.toISOString()}, -33.8833, 151.2167, 10, true, 'mobile', gen_random_uuid())
            ON CONFLICT (idempotency_key) DO NOTHING
          `;

          // Clock out event with idempotency_key
          await sql`
            INSERT INTO clock_events (tenant_id, location_id, profile_id, shift_id, type, recorded_at, latitude, longitude, accuracy_m, is_within_geofence, source, idempotency_key)
            VALUES (${tenantId}, ${locationId}, ${shift.profile_id}, ${shift.id}, 'clock_out', ${clockOutTime.toISOString()}, -33.8833, 151.2167, 10, true, 'mobile', gen_random_uuid())
            ON CONFLICT (idempotency_key) DO NOTHING
          `;
        }
      }

      // Create availability for all demo profiles
      const availabilityDefs = [
        // Maria (owner) - available Mon-Fri 9am-6pm
        { email: 'demo-owner@crewcircle.co', days: [1,2,3,4,5], start: '09:00', end: '18:00' },
        // Jake (manager) - available Mon-Fri 7am-4pm
        { email: 'demo-manager@crewcircle.co', days: [1,2,3,4,5], start: '07:00', end: '16:00' },
        // Sarah (barista) - available Mon, Wed, Fri 8am-3pm
        { email: 'demo-employee1@crewcircle.co', days: [1,3,5], start: '08:00', end: '15:00' },
        // Emma (waitstaff) - available Tue, Thu, Sat 10am-5pm
        { email: 'demo-employee2@crewcircle.co', days: [2,4,6], start: '10:00', end: '17:00' },
      ];

      for (const avail of availabilityDefs) {
        const profile = profileMap.get(avail.email);
        if (!profile) continue;

        for (const dayOfWeek of avail.days) {
          await sql`
            INSERT INTO availability (tenant_id, profile_id, day_of_week, start_time, end_time, is_available)
            VALUES (${tenantId}, ${profile.id}, ${dayOfWeek}, ${avail.start}, ${avail.end}, true)
            ON CONFLICT (tenant_id, profile_id, day_of_week) DO UPDATE SET
              start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              is_available = EXCLUDED.is_available
          `;
        }
      }

      return Response.json({
      success: true,
      message: isNew ? 'Demo organization created successfully' : 'Demo organization ready',
      tenantId,
    });
  } catch (error) {
    console.error('Error setting up demo:', error);
    return Response.json({ error: 'Failed to set up demo: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}
