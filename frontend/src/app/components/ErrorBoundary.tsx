"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert, PhoneCall } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught component error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <section 
          aria-label="Component Recovery View"
          className="p-6 my-4 bg-slate-900 border border-rose-500/30 rounded-2xl text-white shadow-xl max-w-xl mx-auto"
        >
          <div className="flex items-center gap-3 text-rose-400 mb-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="font-bold text-lg">
              {this.props.fallbackTitle || "Component Temporarily Unavailable"}
            </h3>
          </div>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            An unexpected error occurred in this view. Your offline survival data, Safety Check-In, and Emergency 112 services remain completely accessible.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              Reload View
            </button>
            <a
              href="/emergency"
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md"
            >
              <PhoneCall className="w-4 h-4" />
              Open Emergency Hub (112)
            </a>
            <a
              href="/offline-mode"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              Offline Survival Card
            </a>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
