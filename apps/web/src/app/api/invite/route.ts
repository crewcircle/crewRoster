import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { user, client } = await requireAuth();
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Verify the inviter has owner/manager role
    const { data: profile } = await client
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = profile.tenant_id;

    // Check free tier limits
    const { data: tenant } = await client
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    if (tenant && tenant.plan !== 'starter') {
      const { count } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (count !== null && count >= 5) {
        return NextResponse.json(
          { error: 'Free tier limit reached (5 employees). Please upgrade to add more.' },
          { status: 403 },
        );
      }
    }

    // Create invited user via Supabase Admin API
    const adminClient = createAdminClient();

    const { data: existingUser } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const { data: newUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role,
          tenant_id: tenantId,
          invited_by: user.id,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
      },
    );

    if (inviteError) {
      console.error('Invite error:', inviteError);
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }

    // Create a placeholder profile for the invited user
    if (newUser?.user) {
      await adminClient.from('profiles').insert({
        id: newUser.user.id,
        tenant_id: tenantId,
        email,
        role: role,
      });

      await adminClient.from('tenant_members').insert({
        tenant_id: tenantId,
        profile_id: newUser.user.id,
        role: role,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
