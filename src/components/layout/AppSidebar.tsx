"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar'; // Assuming this path is correct for your sidebar component
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, BarChart3, User, Backpack, Trophy, Settings, HelpCircle } from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { href: '/', label: 'Chrono Chamber', icon: Home },
  { href: '/stats', label: 'Timeline Stats', icon: BarChart3 },
  { href: '/character', label: 'Current Self', icon: User },
  { href: '/inventory', label: 'Item Stash', icon: Backpack },
  { href: '/achievements', label: 'Milestones', icon: Trophy },
  { href: '/settings', label: 'Temporal Controls', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <Image src="https://placehold.co/40x40.png" alt="ChronoClicker Logo" width={32} height={32} className="rounded-md" data-ai-hint="abstract time" />
          <h1 className="font-headline text-xl font-semibold text-primary">ChronoClicker</h1>
        </Link>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <ScrollArea className="flex-1">
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={{children: item.label, side: "right"}}
                    className="justify-start"
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
      <SidebarFooter className="p-4 mt-auto border-t">
        <Button variant="ghost" className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center">
          <HelpCircle className="h-5 w-5" />
          <span className="group-data-[collapsible=icon]:hidden">Help & Info</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
