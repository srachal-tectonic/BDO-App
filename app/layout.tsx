import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import EnvironmentBadge from "@/components/layout/EnvironmentBadge";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
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
      <body className={`${poppins.variable} antialiased`}>
        <ThemeProvider>
          <FirebaseAuthProvider>
            {children}
            <EnvironmentBadge />
          </FirebaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
