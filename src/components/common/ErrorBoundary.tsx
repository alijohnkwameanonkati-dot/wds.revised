import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      let friendly = 'Something interrupted loading this section. Please reload to continue.';
      if (this.state.message.includes('Quota exceeded')) {
        friendly = 'Daily database quota has been reached. Please try again tomorrow.';
      } else if (this.state.message.includes('Missing or insufficient permissions')) {
        friendly = 'Access to this resource requires updated permissions or administrator sign-in.';
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] dark:bg-[#0B111E] px-6 py-16">
          <div className="max-w-lg w-full border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#11192A] p-8">
            <div className="flex items-center gap-3 text-[#9A3412] dark:text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-xs font-medium tracking-widest uppercase">WDS Notice</span>
            </div>
            <h1 className="text-2xl font-serif font-semibold text-[#1A1D24] dark:text-[#F1EFEA] mb-3">
              Unable to complete request
            </h1>
            <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-6">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#B68D40] dark:text-[#0B111E] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Platform
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
