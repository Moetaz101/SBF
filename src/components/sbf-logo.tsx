import { cn } from '@/lib/utils';

type SbfLogoProps = {
  /** Taille du logo : sm (mobile header), md (barre latérale), lg (page de connexion) */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/** Logo SBF (PNG) remplaçant l'ancien badge texte « SBF ». */
export function SbfLogo({ size = 'md', className }: SbfLogoProps) {
  return (
    <span
      role='img'
      aria-label='SBF'
      className={cn(
        'bg-muted inline-block shrink-0 rounded-lg bg-cover bg-center ring-1 ring-foreground/10',
        size === 'sm' && 'size-7',
        size === 'md' && 'size-8',
        size === 'lg' && 'size-14 rounded-2xl',
        className
      )}
      style={{ backgroundImage: "url('/sbf-logo.png')" }}
    />
  );
}
