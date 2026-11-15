import { NextResponse } from 'next/server';
import { getSupabaseAdmin, requireAdmin } from '@/lib/auth/server';

function publicUser(user: {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
}) {
  return {
    id: user.id,
    email: user.email ?? '',
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const ids = data.users.map((user) => user.id);
    const { data: profiles, error: profileError } = ids.length
      ? await admin.from('profiles').select('id, full_name, role').in('id', ids)
      : { data: [], error: null };
    if (profileError) throw new Error(profileError.message);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return NextResponse.json({
      users: data.users.map((user) => ({ ...publicUser(user), ...profileMap.get(user.id) }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Accès refusé.';
    return NextResponse.json(
      { error: message },
      { status: message === 'Accès administrateur requis.' ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminContext = await requireAdmin();
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      fullName?: unknown;
    };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe initial doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || null }
    });
    if (error || !data.user) throw new Error(error?.message ?? 'Impossible de créer le compte.');

    const { error: profileError } = await admin.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName || null,
      role: 'user'
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error(profileError.message);
    }

    return NextResponse.json(
      {
        user: { ...publicUser(data.user), full_name: fullName || null, role: 'user' },
        createdBy: adminContext.profile.email
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de créer le compte.';
    return NextResponse.json(
      { error: message },
      { status: message === 'Accès administrateur requis.' ? 403 : 400 }
    );
  }
}
