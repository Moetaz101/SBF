import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase côté navigateur (composants 'use client').
 * Une seule instance est partagée pour garder une seule connexion temps réel.
 */
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return client;
}
