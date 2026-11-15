import { NextResponse } from 'next/server';
import { getAuthContext, getSupabaseAdmin } from '@/lib/auth/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    return NextResponse.json({ profile: context.profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impossible de charger le profil.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    const body = (await request.json()) as { fullName?: unknown };
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    if (fullName.length > 120) {
      return NextResponse.json({ error: 'Le nom est trop long.' }, { status: 400 });
    }

    const client = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? getSupabaseAdmin()
      : await getSupabaseServer();
    const { data, error } = await client
      .from('profiles')
      .update({ full_name: fullName || null })
      .eq('id', context.user.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impossible de modifier le profil.' },
      { status: 500 }
    );
  }
}
