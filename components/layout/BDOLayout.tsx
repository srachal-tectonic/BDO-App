'use client';

import { FloatingUserCard } from "./FloatingUserCard";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import tbankLogo from "@/public/images/TBank-logo.png";

interface BDOLayoutProps {
  children: React.ReactNode;
  title?: string;
  stage?: string;
}

export function getStageColor(stage: string): string {
  switch (stage) {
    case 'Leads':
      return 'bg-[#d0dbe9] text-[#133c7f]';
    case 'PQ Prep':
      return 'bg-[#a1b3d2] text-[#133c7f]';
    case 'PQ Advance':
      return 'bg-[#718bbc] text-white';
    case 'PQ Reject':
      return 'bg-[#e7edf4] text-[#133c7f]';
    case 'UW':
      return 'bg-[#4362a5] text-white';
    case 'Closing':
      return 'bg-[#133c7f] text-white';
    case 'Withdraw | Decline':
      return 'bg-[#e7edf4] text-[#133c7f]';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function BDOLayout({ children, title, stage }: BDOLayoutProps) {
  const { userInfo, currentUser, isLoading, logout } = useFirebaseAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/bdo/login');
    }
  }, [currentUser, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/bdo/login');
  };

  const userData = {
    name: userInfo?.displayName || userInfo?.email?.split('@')[0] || 'User',
    email: userInfo?.email || 'No email',
    avatar: userInfo?.photoURL || '',
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const appTitle = userInfo?.role === 'PQ Committee' ? 'PQ Committee Portal' : 'BDO Loan Tool';

  // Highlight Projects tab on the list page and any project detail page (/bdo/projects/[id]/...)
  const isProjectsSection = pathname === '/bdo/projects' || pathname.startsWith('/bdo/projects/');

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <header className="bg-[var(--t-color-primary)] sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 py-3 laptop:py-1.5 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/bdo/projects" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image
                src={tbankLogo}
                alt="T Bank Logo"
                className="h-10 laptop:h-7 w-auto brightness-0 invert"
                height={40}
                priority
              />
            </Link>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/bdo/projects"
              className={`px-4 py-2 laptop:py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                isProjectsSection
                  ? 'text-white/90 hover:text-white bg-white/15'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Pipeline
            </Link>
            {userInfo?.role === 'Admin' && (
              <Link
                href="/bdo/admin"
                className={`px-4 py-2 laptop:py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                  pathname === '/bdo/admin'
                    ? 'text-white/90 hover:text-white bg-white/15'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Settings
              </Link>
            )}
            <FloatingUserCard user={userData} onLogout={handleLogout} />
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-[var(--t-color-page-bg)]">
        <div className="max-w-[1280px] mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
