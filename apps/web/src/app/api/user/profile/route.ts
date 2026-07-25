import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { user, client } = await requireAuth();

    const { data: profile, error } = await client
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({
        tenantId: null,
        role: null,
      });
    }

    return NextResponse.json({
      tenantId: profile.tenant_id,
      role: profile.role,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
