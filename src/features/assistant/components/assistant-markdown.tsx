'use client';
// oxlint-disable next/no-img-element
import { createContext, useContext, useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MermaidBlock } from './mermaid-block';

const MarkdownStreamingContext = createContext(false);

type ExtraProps = { node?: unknown };

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copié.');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Impossible de copier le code.');
    }
  };

  return (
    <div className='bg-muted/30 my-3 overflow-hidden rounded-lg border'>
      <div className='bg-muted/40 text-muted-foreground flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs'>
        <span>{language ?? 'code'}</span>
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          onClick={copy}
          aria-label='Copier le code'
        >
          {copied ? <Icons.check /> : <Icons.copy />}
        </Button>
      </div>
      <pre className='overflow-x-auto p-3 text-xs leading-relaxed'>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownH1({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'h1'> & ExtraProps) {
  return (
    <h1 className={cn('mt-4 mb-2 text-lg font-semibold first:mt-0', className)} {...props}>
      {children}
    </h1>
  );
}

function MarkdownH2({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'h2'> & ExtraProps) {
  return (
    <h2 className={cn('mt-4 mb-2 text-base font-semibold first:mt-0', className)} {...props}>
      {children}
    </h2>
  );
}

function MarkdownH3({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'h3'> & ExtraProps) {
  return (
    <h3 className={cn('mt-3 mb-1.5 text-sm font-semibold first:mt-0', className)} {...props}>
      {children}
    </h3>
  );
}

function MarkdownP({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'p'> & ExtraProps) {
  return (
    <p className={cn('my-2 leading-relaxed first:mt-0 last:mb-0', className)} {...props}>
      {children}
    </p>
  );
}

function MarkdownUl({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'ul'> & ExtraProps) {
  return (
    <ul className={cn('my-2 list-disc space-y-1 pl-5', className)} {...props}>
      {children}
    </ul>
  );
}

function MarkdownOl({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'ol'> & ExtraProps) {
  return (
    <ol className={cn('my-2 list-decimal space-y-1 pl-5', className)} {...props}>
      {children}
    </ol>
  );
}

function MarkdownLi({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'li'> & ExtraProps) {
  return (
    <li className={cn('pl-0.5 leading-relaxed', className)} {...props}>
      {children}
    </li>
  );
}

function MarkdownStrong({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'strong'> & ExtraProps) {
  return (
    <strong className={cn('font-semibold', className)} {...props}>
      {children}
    </strong>
  );
}

function MarkdownA({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'a'> & ExtraProps) {
  return (
    <a
      className={cn(
        'text-primary font-medium underline underline-offset-3 hover:opacity-80',
        className
      )}
      target='_blank'
      rel='noreferrer noopener'
      {...props}
    >
      {children}
    </a>
  );
}

function MarkdownBlockquote({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'blockquote'> & ExtraProps) {
  return (
    <blockquote
      className={cn(
        'border-primary/40 text-muted-foreground my-3 border-l-2 pl-3 italic',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}

function MarkdownHr({ className, node: _node, ...props }: React.ComponentProps<'hr'> & ExtraProps) {
  return <hr className={cn('border-border my-4', className)} {...props} />;
}

function MarkdownTable({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'table'> & ExtraProps) {
  return (
    <div className='my-3 overflow-x-auto rounded-lg border'>
      <table className={cn('w-full border-collapse text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

function MarkdownThead({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'thead'> & ExtraProps) {
  return (
    <thead className={cn('bg-muted/50', className)} {...props}>
      {children}
    </thead>
  );
}

function MarkdownTh({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'th'> & ExtraProps) {
  return (
    <th
      className={cn(
        'border-b px-3 py-2 text-left text-xs font-semibold whitespace-nowrap',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

function MarkdownTd({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'td'> & ExtraProps) {
  return (
    <td
      className={cn('border-b px-3 py-2 align-top text-sm last:border-b-0', className)}
      {...props}
    >
      {children}
    </td>
  );
}

function MarkdownTr({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'tr'> & ExtraProps) {
  return (
    <tr className={cn('even:bg-muted/20', className)} {...props}>
      {children}
    </tr>
  );
}

function MarkdownCode({
  className,
  children,
  node: _node,
  ...props
}: React.ComponentProps<'code'> & ExtraProps) {
  const isStreaming = useContext(MarkdownStreamingContext);
  const language = /language-([\w-]+)/.exec(className ?? '')?.[1]?.toLowerCase();
  const code = String(children).replace(/\n$/, '');

  if (language === 'mermaid') {
    return <MermaidBlock code={code} isStreaming={isStreaming} />;
  }

  if (!language && !code.includes('\n')) {
    return (
      <code className='bg-muted rounded px-1 py-0.5 text-[0.85em] font-medium' {...props}>
        {children}
      </code>
    );
  }

  return <CodeBlock code={code} language={language} />;
}

function MarkdownPre({ children }: React.ComponentProps<'pre'> & ExtraProps) {
  return <>{children}</>;
}

function MarkdownImg({
  className,
  alt,
  node: _node,
  ...props
}: React.ComponentProps<'img'> & ExtraProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className={cn('border-border my-3 max-w-full rounded-lg border', className)}
      alt={alt ?? ''}
      {...props}
    />
  );
}

const MARKDOWN_COMPONENTS: Components = {
  h1: MarkdownH1,
  h2: MarkdownH2,
  h3: MarkdownH3,
  p: MarkdownP,
  ul: MarkdownUl,
  ol: MarkdownOl,
  li: MarkdownLi,
  strong: MarkdownStrong,
  a: MarkdownA,
  blockquote: MarkdownBlockquote,
  hr: MarkdownHr,
  table: MarkdownTable,
  thead: MarkdownThead,
  th: MarkdownTh,
  td: MarkdownTd,
  tr: MarkdownTr,
  code: MarkdownCode,
  pre: MarkdownPre,
  img: MarkdownImg
};

interface AssistantMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function AssistantMarkdown({ content, isStreaming = false }: AssistantMarkdownProps) {
  return (
    <MarkdownStreamingContext.Provider value={isStreaming}>
      <div className='max-w-none text-sm leading-relaxed'>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {content}
        </ReactMarkdown>
      </div>
    </MarkdownStreamingContext.Provider>
  );
}
