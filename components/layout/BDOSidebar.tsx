'use client';

import * as React from "react";
import {
  Home,
  FileText,
  LogOut,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Navigation items for BDO users
const bdoNavMain = [
  {
    title: "Projects",
    url: "/bdo/projects",
    icon: DollarSign,
  },
];

// Navigation items for PQ Committee users
const pqCommitteeNavMain = [
  {
    title: "Review Queue",
    url: "/bdo/projects",
    icon: FileText,
  },
];

export function BDOSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { userInfo, logout } = useFirebaseAuth();

  const handleLogout = async () => {
    await logout();
  };

  const userData = {
    name: userInfo?.displayName || userInfo?.email?.split('@')[0] || 'User',
    email: userInfo?.email || 'No email',
    avatar: userInfo?.photoURL || '',
  };

  const navSecondaryWithLogout = [
    {
      title: "Logout",
      url: "#",
      icon: LogOut,
      onClick: handleLogout,
    },
  ];

  // Determine which navigation items to show based on user role
  const userRole = userInfo?.role || 'BDO';
  const navMainItems = userRole === 'PQ Committee' ? pqCommitteeNavMain : bdoNavMain;

  // Determine the application title based on role
  const appTitle = userRole === 'PQ Committee' ? 'PQ Committee Portal' : 'BDO Loan Tool';

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <Link href="/bdo/projects" className="flex items-center gap-2">
                  <img
                    src="/images/TBank-logo.png"
                    alt="T Bank Logo"
                    className="h-6 w-auto"
                  />
                  {userRole === 'PQ Committee' && <span className="text-base font-semibold">{appTitle}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
        <NavSecondary items={navSecondaryWithLogout} className="mt-auto" />
      </SidebarFooter>
    </Sidebar>
  );
}
