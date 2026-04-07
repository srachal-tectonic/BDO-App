import { Auth0Provider } from '@/contexts/Auth0Context';

export default function BorrowerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Auth0Provider>{children}</Auth0Provider>;
}
