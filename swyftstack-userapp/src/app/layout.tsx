import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TopLoadingBar } from "@/components/client";

export const metadata: Metadata = {
  title: "Swyftstack",
  description: "Manage your Swyftstack apps, databases, and storage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
