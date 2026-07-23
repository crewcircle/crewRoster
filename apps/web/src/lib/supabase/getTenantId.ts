import { requireAuth } from './server';

export async function getTenantId() {
  const { user, client } = await requireAuth();

  const { data: profile, error } = await client
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('Profile not found');
  }

  return { tenantId: profile.tenant_id, role: profile.role, client, userId: user.id };
}
