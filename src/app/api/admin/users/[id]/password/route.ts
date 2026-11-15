import { NextResponse } from 'next/server';
import { getSupabaseAdmin, requireAdmin } from '@/lib/auth/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }
    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(id, { password });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Impossible de réinitialiser le mot de passe.';
    return NextResponse.json(
      { error: message },
      { status: message === 'Accès administrateur requis.' ? 403 : 400 }
    );
  }
}
