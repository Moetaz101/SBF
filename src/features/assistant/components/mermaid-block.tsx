'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface MermaidBlockProps {
  code: string;
  isStreaming?: boolean;
}

export function MermaidBlock({ code, isStreaming = false }: MermaidBlockProps) {
  const { resolvedTheme } = useTheme();
  const reactId = useId();
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const isDark = resolvedTheme === 'dark';
  const renderKey = `${isDark ? 'dark' : 'light'}:${code}`;

  const [svg, setSvg] = useState('');
  const [renderedKey, setRenderedKey] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<{ key: string; message: string } | null>(null);

  const error = renderError?.key === renderKey ? renderError.message : null;
  const isRendering = !isStreaming && renderedKey !== renderKey && !error;

  useEffect(() => {
    if (isStreaming) return;

    let cancelled = false;

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDark ? 'dark' : 'neutral',
          fontFamily: 'inherit'
        });
        const result = await mermaid.render(renderId, code.trim());
        if (!cancelled) {
          setSvg(result.svg);
          setRenderedKey(renderKey);
          setRenderError(null);
        }
      } catch (renderFailure) {
        if (!cancelled) {
          setRenderError({
            key: renderKey,
            message:
              renderFailure instanceof Error
                ? renderFailure.message
                : 'Le graphique Mermaid est invalide.'
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, isDark, isStreaming, renderId, renderKey]);

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'graphique-sbf.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      toast.success('Code Mermaid copié.');
    } catch {
      toast.error('Impossible de copier le code.');
    }
  };

  if (isStreaming) {
    return (
      <div className='bg-muted/30 my-4 rounded-xl border p-4' aria-busy='true'>
        <div className='mb-3 flex items-center gap-2'>
          <Icons.chartBar className='text-muted-foreground size-4' />
          <span className='text-muted-foreground shimmer text-xs font-medium'>
            Génération du graphique…
          </span>
        </div>
        <Skeleton className='h-40 w-full rounded-lg' />
      </div>
    );
  }

  if (isRendering) {
    return (
      <div className='bg-muted/30 my-4 rounded-xl border p-4' aria-busy='true'>
        <Skeleton className='h-48 w-full rounded-lg' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='border-destructive/30 bg-destructive/5 my-4 rounded-xl border p-4'>
        <div className='text-destructive mb-2 flex items-center gap-2 text-sm font-medium'>
          <Icons.warning className='size-4' />
          Graphique indisponible
        </div>
        <p className='text-muted-foreground text-xs'>
          Le modèle a produit un diagramme Mermaid invalide. Le code est conservé ci-dessous.
        </p>
        <details className='mt-3'>
          <summary className='text-muted-foreground cursor-pointer text-xs font-medium'>
            Voir le code Mermaid
          </summary>
          <pre className='bg-muted/60 mt-2 overflow-x-auto rounded-lg p-3 text-xs'>
            <code>{code}</code>
          </pre>
        </details>
      </div>
    );
  }

  return (
    <figure className='bg-card my-4 overflow-hidden rounded-xl border'>
      <figcaption className='bg-muted/30 flex items-center justify-between gap-2 border-b px-3 py-2'>
        <span className='text-muted-foreground flex items-center gap-2 text-xs font-medium'>
          <Icons.chartBar className='size-3.5' />
          Graphique Mermaid
        </span>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon-xs'
            onClick={downloadSvg}
            aria-label='Télécharger le graphique en SVG'
          >
            <Icons.download />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon-xs'
            onClick={copyCode}
            aria-label='Copier le code Mermaid'
          >
            <Icons.copy />
          </Button>
        </div>
      </figcaption>
      <div
        className='overflow-x-auto p-3 [&_svg]:mx-auto [&_svg]:max-w-full'
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </figure>
  );
}
