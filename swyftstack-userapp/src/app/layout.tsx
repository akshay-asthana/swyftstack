import "./globals.css";
import "@/styles/theme.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TopLoadingBar } from "@/components/client";

export const metadata: Metadata = {
  title: "Swyftstack",
  description: "Manage your Swyftstack apps, databases, and storage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-console-theme="dark" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("swyftstack:console-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.consoleTheme=t;}}catch(e){}`,
          }}
        />
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
