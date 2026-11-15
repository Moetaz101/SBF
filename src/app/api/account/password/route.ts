import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthContext, getSupabaseAdmin } from '@/lib/auth/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context?.user.email)
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    const body = (await request.json()) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }

    const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: verifyError } = await publicClient.auth.signInWithPassword({
      email: context.user.email,
      password: currentPassword
    });
    if (verifyError) {
      return NextResponse.json({ error: 'Le mot de passe actuel est incorrect.' }, { status: 400 });
    }

    const { error } = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await getSupabaseAdmin().auth.admin.updateUserById(context.user.id, {
          password: newPassword
        })
      : await (await getSupabaseServer()).auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impossible de modifier le mot de passe.' },
      { status: 500 }
    );
  }
}
