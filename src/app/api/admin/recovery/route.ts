import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, requireAdmin } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const context = await requireAdmin();
    const body = (await request.json()) as { userId?: unknown; timeoutMinutes?: unknown };
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const timeoutMinutes = Number(body.timeoutMinutes);
    if (
      !userId ||
      !Number.isInteger(timeoutMinutes) ||
      timeoutMinutes < 5 ||
      timeoutMinutes > 10080
    ) {
      return NextResponse.json(
        { error: 'Le délai doit être compris entre 5 minutes et 7 jours.' },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60_000).toISOString();
    const admin = getSupabaseAdmin();
    await admin
      .from('account_recovery_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('used_at', null);
    const { error } = await admin.from('account_recovery_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: context.user.id
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de générer le code.';
    return NextResponse.json(
      { error: message },
      { status: message === 'Accès administrateur requis.' ? 403 : 400 }
    );
  }
}
