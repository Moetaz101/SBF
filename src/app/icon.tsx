import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** Icône de l'application (générée, pas besoin de fichier image) */
export default function Icon() {
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
        fontSize: 190,
        fontWeight: 800,
        letterSpacing: -6
      }}
    >
      SBF
    </div>,
    size
  );
}
