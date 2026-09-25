"use client";

import React from "react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Travel Guardian uses Light theme as the primary and only design identity.
    // The dark class CSS variables are mapped to the same light palette in globals.css
    // so no dark flash or styling mismatch occurs.
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
      {children}
    </ThemeProvider>

  );
}
