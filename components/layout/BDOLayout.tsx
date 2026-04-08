'use client';

import { FloatingUserCard } from "./FloatingUserCard";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BDOLayoutProps {
  children: React.ReactNode;
  title?: string;
  stage?: string;
}

function getStageColor(stage: string): string {
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

  // Check if we're on a project detail page (Loan Application page)
  const isProjectDetailPage = pathname?.startsWith('/bdo/projects/') && pathname !== '/bdo/projects';

  // Check if we're on the projects list page
  const isProjectsListPage = pathname === '/bdo/projects';

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <header className="bg-[var(--t-color-primary)] sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/bdo/projects" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img
                src="/images/T-Bank-1200x630-1.webp"
                alt="T Bank Logo"
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            {stage && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStageColor(stage)}`}>
                {stage}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-3">
            {isProjectDetailPage && (
              <Link
                href="/bdo/projects"
                className="flex items-center gap-1 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Projects
              </Link>
            )}
            <Link
              href="/bdo/projects"
              className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                isProjectsListPage
                  ? 'text-white/90 hover:text-white bg-white/15'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Pipeline
            </Link>
            {userInfo?.role === 'Admin' && (
              <Link
                href="/bdo/admin"
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
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
