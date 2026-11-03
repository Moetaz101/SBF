import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MobileNav } from '@/features/sbf/components/mobile-nav';
import { RealtimeSync } from '@/features/sbf/components/realtime-sync';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <RealtimeSync />
      <a
        href='#main-content'
        className='bg-background ring-ring sr-only rounded-md px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:ring-2'
      >
        Aller au contenu
      </a>
      <AppSidebar />
      <SidebarInset id='main-content' tabIndex={-1} className='scroll-mt-16 pb-20 md:pb-0'>
        <Header />
        <InfobarProvider defaultOpen={false}>{children}</InfobarProvider>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}
