'use client';
import { Icons } from '@/components/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { SBF_CONFIG } from '@/config/sbf';
import { navGroups } from '@/config/nav-config';
import { useCurrentUserEmail } from '@/features/sbf/components/user-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function isActive(pathname: string, url: string) {
  if (url === '/dashboard') return pathname === url;
  if (url === '/dashboard/marches') {
    return pathname.startsWith(url) && pathname !== '/dashboard/marches/nouveau';
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const email = useCurrentUserEmail();

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              render={<Link href='/dashboard' aria-label={SBF_CONFIG.appName} />}
            >
              <span className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold'>
                SBF
              </span>
              <div className='grid text-left leading-tight'>
                <span className='truncate font-semibold'>{SBF_CONFIG.appName}</span>
                <span className='text-muted-foreground truncate text-xs'>
                  Marchés &amp; chiffrage
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className='py-0'>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={isActive(pathname, item.url)}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className='text-muted-foreground truncate px-2 text-xs group-data-[collapsible=icon]:hidden'>
          {email}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
