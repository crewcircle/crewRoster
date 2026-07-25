import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import Stripe from 'stripe';

const getStripe = () => {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder'
  ) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-05-27.dahlia' as const,
  });
};

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 },
    );
  }

  try {
    const { user, client } = await requireAuth();
    const { email } = await req.json();

    // Resolve tenantId from the authenticated user's profile
    const { data: profile } = await client
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'au_becs_debit'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?canceled=true`,
      metadata: {
        tenantId: profile.tenant_id,
      },
      subscription_data: {
        metadata: {
          tenantId: profile.tenant_id,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
