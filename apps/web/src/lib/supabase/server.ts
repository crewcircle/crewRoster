import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // Server Component — read-only context. Middleware handles cookie refresh.
          }
        },
      },
    }
  );
}

export async function requireAuth(): Promise<{ user: User; client: SupabaseClient }> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { user, client };
}
