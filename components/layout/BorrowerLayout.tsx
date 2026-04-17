'use client';

import { FloatingUserCard } from "./FloatingUserCard";
import { useAuth0Borrower } from "@/contexts/Auth0Context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import tbankLogo from "@/public/images/TBank-logo.png";

interface BorrowerLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function BorrowerLayout({ children, title }: BorrowerLayoutProps) {
  const { userInfo, isLoading, isAuthenticated } = useAuth0Borrower();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/borrower/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    // Redirect to Auth0 logout endpoint
    window.location.href = '/api/auth/logout';
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-16 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/borrower/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image
                src={tbankLogo}
                alt="T Bank Logo"
                className="h-10 w-auto"
                height={40}
              />
              <span className="text-sm text-[color:var(--t-color-text-secondary)]">Borrower Portal</span>
            </Link>
            {title && <span className="text-muted-foreground">•</span>}
            {title && <h1 className="text-sm text-[color:var(--t-color-text-secondary)]">{title}</h1>}
          </div>
          <div className="flex items-center gap-4">
            <FloatingUserCard user={userData} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-4 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
