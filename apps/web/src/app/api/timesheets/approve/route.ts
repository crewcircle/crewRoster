import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { user, client } = await requireAuth();
    const body = await request.json();
    const { profileId, workDate, tenantId } = body;

    if (!profileId || !workDate || !tenantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve userId — demo mode or real auth
    let userId = user.id;
    const isDemoMode = tenantId?.startsWith('demo-');
    if (isDemoMode) {
      userId = 'demo-user';
    }

    // Update clock_events for the given profile + date
    const { error } = await client
      .from('clock_events')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq('profile_id', profileId)
      .eq('type', 'clock_in')
      .is('approved_at', null)
      .is('deleted_at', null)
      .gte('recorded_at', `${workDate}T00:00:00.000Z`)
      .lt('recorded_at', `${workDate}T23:59:59.999Z`);

    if (error) {
      console.error('Approve error:', error);
      return NextResponse.json({ error: 'Failed to approve timesheets' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
