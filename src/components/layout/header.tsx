import { Breadcrumbs } from '../breadcrumbs';
import { ThemeModeToggle } from '../themes/theme-mode-toggle';
import { Separator } from '../ui/separator';
import { SidebarTrigger } from '../ui/sidebar';
import { UserMenu } from '@/features/sbf/components/user-menu';

export default function Header() {
  return (
    <header className='bg-background/60 sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 pt-[env(safe-area-inset-top)] backdrop-blur-md'>
      <div className='flex min-w-0 items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1 hidden md:inline-flex' />
        <Separator
          orientation='vertical'
          className='mr-2 hidden h-4 data-vertical:self-center md:block'
        />
        <span className='bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg text-[10px] font-bold md:hidden'>
          SBF
        </span>
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-2 px-4'>
        <ThemeModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
