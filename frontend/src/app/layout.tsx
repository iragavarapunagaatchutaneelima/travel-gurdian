"use client";

import React from "react";
import "./globals.css";
import { Providers } from "./providers";
import { PwaManager } from "./components/PwaManager";
import { OfflineBootStatus } from "./components/OfflineBootStatus";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        {/* Poppins Font — Travel Guardian primary typeface */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <title>Travel Guardian | Your Smart Travel Companion</title>
        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        {/* PWA & App Meta */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Travel Guardian" />
        <meta name="description" content="Travel Guardian — Your Smart Travel Companion. Multi-profile route intelligence, live safe havens, fail-safe check-in, and emergency SOS dispatch." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className="min-h-full flex flex-col overflow-x-hidden transition-colors duration-200"
        style={{
          fontFamily: "'Poppins', system-ui, -apple-system, Arial, sans-serif",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >

        <Providers>
          <OfflineBootStatus />
          <PwaManager />
          <div className="min-h-screen flex flex-col overflow-x-hidden">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </Providers>
      </body>
    </html>
  );
}
