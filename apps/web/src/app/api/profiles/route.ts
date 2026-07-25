import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/supabase/getTenantId';

export async function GET(_request: NextRequest) {
  try {
    const { tenantId, client } = await getTenantId();

    const { data: profiles, error } = await client
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      console.error('Failed to fetch profiles:', error);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    return NextResponse.json({ profiles: profiles ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}