import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server';

export type AccountRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AccountRole;
  created_at: string;
  updated_at: string;
}

export interface AuthContext {
  user: User;
  profile: Profile;
}

const DEFAULT_ADMIN_EMAIL = 'Ahmedelfaleh1999@gmail.com';

function configuredAdminEmail() {
  return (process.env.SBF_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('La configuration serveur Supabase est incomplète.');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const browserSafeClient = await getSupabaseServer();
  const {
    data: { user },
    error
  } = await browserSafeClient.auth.getUser();
  if (error || !user?.email) return null;

  const profileClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? getSupabaseAdmin()
    : browserSafeClient;
  const { data: existing, error: profileError } = await profileClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  const isConfiguredAdmin = user.email.toLowerCase() === configuredAdminEmail();
  let profile = existing as Profile | null;

  if (!profile) {
    const { data: created, error: createError } = await profileClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? null,
        role: isConfiguredAdmin ? 'admin' : 'user'
      })
      .select('*')
      .single();
    if (createError) throw new Error(createError.message);
    profile = created as Profile;
  } else if (isConfiguredAdmin && profile.role !== 'admin') {
    const { data: promoted, error: promoteError } = await profileClient
      .from('profiles')
      .update({ email: user.email, role: 'admin' })
      .eq('id', user.id)
      .select('*')
      .single();
    if (promoteError) throw new Error(promoteError.message);
    profile = promoted as Profile;
  }

  return { user, profile };
}

export async function requireAdmin(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context || context.profile.role !== 'admin') {
    throw new Error('Accès administrateur requis.');
  }
  return context;
}
