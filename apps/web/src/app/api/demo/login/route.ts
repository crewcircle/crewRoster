import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEMO_EMAILS = [
  'demo-owner@crewcircle.co',
  'demo-manager@crewcircle.co',
  'demo-employee1@crewcircle.co',
  'demo-employee2@crewcircle.co',
  'demo-pilot@crewcircle.co',
];

const DEMO_PASSWORD = 'crewcircle-demo-2026';

export async function POST(request: NextRequest) {
  try {
    const { email, role, tenantId } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    if (!DEMO_EMAILS.includes(email)) {
      return NextResponse.json({ error: 'Not a demo user' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Ensure the demo user exists in Supabase Auth
    try {
      await adminClient.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { role, tenant_id: tenantId },
      });
    } catch (err) {
      // User likely already exists — that's fine
    }

    // Return credentials for client-side login
    return NextResponse.json({
      success: true,
      email,
      password: DEMO_PASSWORD,
      userId: `demo_${email.split('@')[0]}`,
      role,
      tenantId,
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({
      error: 'Failed to process demo login. ' + (error instanceof Error ? error.message : 'Unknown error'),
    }, { status: 500 });
  }
}
