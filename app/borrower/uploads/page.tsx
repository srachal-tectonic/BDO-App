// BORROWER ROUTES TEMPORARILY DISABLED - May be re-enabled in the future
// Redirects to home page for now

import { redirect } from 'next/navigation';

export default function BorrowerUploadsPage() {
  redirect('/');
}

/* ORIGINAL CODE - COMMENTED OUT FOR FUTURE USE
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0Borrower } from '@/contexts/Auth0Context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function BorrowerUploadsPage() {
  const { userInfo, isAuthenticated, isLoading } = useAuth0Borrower();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/borrower/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Borrower Portal</span>
          </div>
          <Link href="/api/auth/logout">
            <Button variant="ghost">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-8 px-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Uploads</h1>
            <p className="text-muted-foreground">
              Welcome, {userInfo?.displayName || userInfo?.email}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload required documents for your loan application
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-6">
                Document upload functionality coming soon
              </p>
              <Button disabled>
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>
                Track the status of your loan application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Application status tracking coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
*/
