"use client";

import React from "react";
import { ThemeProvider } from "next-themes";

// next-themes@0.2.1 (unmaintained upstream, no release since ~March 2025)
// injects its anti-flash-of-wrong-theme snippet as a literal <script> React
// element (pacocoursey/next-themes#385, #387, #397 -- all open, no upstream
// fix). React 19 added a dev-only warning for this exact pattern:
// "Encountered a script tag while rendering React component." It is a false
// positive here: the script IS present in the real server-rendered HTML and
// the browser's own HTML parser executes it correctly on a hard page load
// (before React hydrates), which is the only case where preventing a theme
// flash actually matters. The warning only re-fires on a client-only re-render
// of ThemeProvider (e.g. remounting across a dynamic route segment), where the
// script element is inert anyway -- by then the theme class is already set
// and next-themes' own state-driven effect keeps it in sync without needing
// the script to run again. There is no prop or version bump that removes this
// (scriptProps={{type:'text/plain'}} would stop the browser from executing it
// on the real first load too, reintroducing the flash it exists to prevent).
// We filter only this exact, confirmed-benign console message rather than
// reaching for suppressHydrationWarning (a different mechanism, for a
// different class of warning) or a blanket console filter.
if (typeof window !== "undefined") {
  const NEXT_THEMES_SCRIPT_WARNING = "Encountered a script tag while rendering React component.";
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith(NEXT_THEMES_SCRIPT_WARNING)) return;
    originalConsoleError(...args);
  };
}

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
