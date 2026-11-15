import type { MetadataRoute } from 'next';

/** Permet d'installer SBF Pulse sur l'écran d'accueil du téléphone (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SBF Pulse',
    short_name: 'SBF Pulse',
    description: 'Suivi des marchés, chiffrages et chantiers SBF',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#09090b',
    lang: 'fr',
    icons: [
      { src: '/icon.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '128x128', type: 'image/png' }
    ]
  };
}
