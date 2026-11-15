import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      token?: unknown;
      newPassword?: unknown;
    };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!email || !token || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'E-mail, code et nouveau mot de passe requis.' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Code de récupération invalide ou expiré.' },
        { status: 400 }
      );
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: recovery, error: recoveryError } = await admin
      .from('account_recovery_tokens')
      .select('id, user_id, expires_at')
      .eq('token_hash', tokenHash)
      .eq('user_id', profile.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (recoveryError || !recovery) {
      return NextResponse.json(
        { error: 'Code de récupération invalide ou expiré.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(recovery.user_id, {
      password: newPassword
    });
    if (updateError) throw new Error(updateError.message);
    const { error: consumeError } = await admin
      .from('account_recovery_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', recovery.id);
    if (consumeError) throw new Error(consumeError.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impossible de récupérer le compte.' },
      { status: 500 }
    );
  }
}
