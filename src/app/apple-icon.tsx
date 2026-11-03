import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Icône pour « Ajouter à l'écran d'accueil » sur iPhone */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
        color: '#ffffff',
        fontSize: 66,
        fontWeight: 800,
        letterSpacing: -2
      }}
    >
      SBF
    </div>,
    size
  );
}
