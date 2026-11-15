'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

/**
 * The dialog embeds the full project form (TanStack Form + Zod + file
 * parsers). Loading it only once the user asks for it keeps that code out of
 * the dashboard's initial bundle.
 */
const NewProjectDialog = dynamic(
  () => import('./new-project-dialog').then((mod) => mod.NewProjectDialog),
  { ssr: false }
);

type NewProjectButtonProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerSize?: React.ComponentProps<typeof Button>['size'];
  showIcon?: boolean;
};

export function NewProjectButton({
  triggerLabel = 'Nouveau marché',
  triggerClassName,
  triggerVariant = 'default',
  triggerSize = 'default',
  showIcon = true
}: NewProjectButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        {showIcon && <Icons.add />}
        {triggerLabel}
      </Button>
      {mounted && (
        <NewProjectDialog
          hideTrigger
          open={open}
          onOpenChange={setOpen}
          triggerLabel={triggerLabel}
        />
      )}
    </>
  );
}
