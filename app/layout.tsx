import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "UK Supreme Court Judgment Explorer",
  description: "Read UK Supreme Court judgments with AI-powered annotations and definitions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans m-0 p-0 overflow-hidden">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
