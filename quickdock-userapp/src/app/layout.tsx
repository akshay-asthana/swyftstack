import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quickdock",
  description: "Manage your Quickdock apps, databases, and storage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
