import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import EnvironmentBadge from "@/components/layout/EnvironmentBadge";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SBA Loan Prequalifier",
  description: "Streamline your SBA loan application process",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} antialiased`}>
        <FirebaseAuthProvider>
          {children}
          <EnvironmentBadge />
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
