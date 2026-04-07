// BORROWER ROUTES TEMPORARILY DISABLED - May be re-enabled in the future
// Redirects to home page for now

import { redirect } from 'next/navigation';

export default function Auth0CallbackPage() {
  redirect('/');
}

/* ORIGINAL CODE - COMMENTED OUT FOR FUTURE USE
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Auth0CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams?.get('code');
      const errorParam = searchParams?.get('error');
      const errorDescription = searchParams?.get('error_description');

      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        // Exchange the code for tokens (you'll need to implement this API route)
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange authorization code');
        }

        const data = await response.json();

        // Store tokens
        localStorage.setItem('auth0_access_token', data.access_token);
        localStorage.setItem('auth0_id_token', data.id_token);
        localStorage.setItem('auth0_token_expires_at', data.expires_at);

        // Redirect to borrower uploads
        router.push('/borrower/uploads');
      } catch (err) {
        console.error('Error during Auth0 callback:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <button
            onClick={() => router.push('/borrower/login')}
            className="text-primary underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function Auth0CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <Auth0CallbackContent />
    </Suspense>
  );
}
*/
