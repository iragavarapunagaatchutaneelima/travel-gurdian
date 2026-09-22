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
        {/* PWA & App Meta */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Travel Guardian" />
        <meta name="description" content="Travel Guardian — Your Smart Travel Companion. Travel Safe • Explore More • Stay Together." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className="min-h-full flex flex-col overflow-x-hidden"
        style={{
          fontFamily: "'Poppins', system-ui, -apple-system, Arial, sans-serif",
          backgroundColor: "#F8FAFC",
          color: "#0F172A",
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
