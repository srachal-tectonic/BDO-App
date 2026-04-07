// BORROWER ROUTES TEMPORARILY DISABLED - May be re-enabled in the future
// Redirects to home page for now

import { redirect } from 'next/navigation';

export default function BorrowerLoginPage() {
  redirect('/');
}

/* ORIGINAL CODE - COMMENTED OUT FOR FUTURE USE
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0Borrower } from '@/contexts/Auth0Context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, LogIn } from 'lucide-react';

// Declare global grecaptcha type
declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

export default function BorrowerLoginPage() {
  const { isAuthenticated, isLoading } = useAuth0Borrower();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/borrower/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async () => {
    setIsVerifying(true);
    setError('');

    try {
      // Generate reCAPTCHA token
      if (!window.grecaptcha) {
        throw new Error('reCAPTCHA not loaded');
      }

      const token = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.enterprise.ready(async () => {
          try {
            const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
            if (!siteKey) {
              reject(new Error('reCAPTCHA site key not configured'));
              return;
            }
            const token = await window.grecaptcha.enterprise.execute(siteKey, { action: 'LOGIN' });
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      });

      // Verify reCAPTCHA token on server
      const verifyResponse = await fetch('/api/recaptcha/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action: 'LOGIN' }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        throw new Error('reCAPTCHA verification failed. Please try again.');
      }

      // Redirect to Auth0 login
      window.location.href = '/api/auth/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img
            src="/images/T-Bank-1200x630-1.webp"
            alt="T Bank Logo"
            className="h-16 w-auto"
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">Borrower Portal</CardTitle>
            <CardDescription className="text-center">
              Sign in to access your SBA loan application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              className="w-full h-11 text-base"
              size="lg"
              onClick={handleLogin}
              disabled={isVerifying || isLoading}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {isVerifying ? 'Verifying...' : 'Sign In / Sign Up'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Secure Authentication
                </span>
              </div>
            </div>

            <div className="space-y-2 text-center text-xs text-muted-foreground">
              <p>
                New to the portal? Clicking "Sign In / Sign Up" will allow you to create an account.
              </p>
              <p className="font-medium">
                Powered by Auth0
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Need help? Contact your Business Development Officer</p>
        </div>
      </div>
    </div>
  );
}
*/
