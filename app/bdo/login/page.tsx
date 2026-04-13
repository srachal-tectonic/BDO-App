'use client';

// TODO: Implement Microsoft Entra ID (MSAL) login flow.
// - Remove email/password form once Entra ID SSO is wired up.
// - Replace "Sign in with Microsoft" button onClick with MSAL loginRedirect/loginPopup.

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

function BDOLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // signIn is stubbed - it will throw until Entra ID is integrated.
  const { signIn, isLoading: authLoading } = useFirebaseAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with Microsoft Entra ID / MSAL authentication.
      await signIn(email, password);
      router.push('/bdo/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = () => {
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=/bdo/projects';
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">BDO Portal</CardTitle>
            <CardDescription className="text-center">
              Sign in to your BDO account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary sign-in: Microsoft Entra ID (placeholder) */}
            <Button
              type="button"
              className="w-full"
              onClick={handleMicrosoftSignIn}
              disabled={isLoading}
            >
              Sign in with Microsoft
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or use email</span>
              </div>
            </div>

            {/* Email / password form - kept for dev convenience; stub until auth is wired */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in with email'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginLoadingFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

export default function BDOLoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <BDOLoginContent />
    </Suspense>
  );
}
