'use client';

import { useEffect, useState } from 'react';

/**
 * Date du jour, stable pendant le rendu (évite les calculs instables)
 * et rafraîchie toutes les heures si l'application reste ouverte.
 */
export function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return today;
}
