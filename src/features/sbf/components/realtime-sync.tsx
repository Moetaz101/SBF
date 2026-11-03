'use client';

import { useRealtimeSync } from '@/lib/sbf/api';

/** Monté une fois dans le layout : garde toutes les données synchronisées en direct. */
export function RealtimeSync() {
  useRealtimeSync();
  return null;
}
