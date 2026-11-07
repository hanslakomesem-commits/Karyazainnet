import { appUrl } from '../utils/deploymentBridge';
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      sessionStorage.clear();
      // Keep admin credentials if set
      const adminPin = localStorage.getItem('admin_logged_in');
      const adminUser = localStorage.getItem('zain_custom_auth_user');
      localStorage.clear();
      if (adminPin) localStorage.setItem('admin_logged_in', adminPin);
      if (adminUser) localStorage.setItem('zain_custom_auth_user', adminUser);
    } catch (e) {}
    window.location.href = appUrl('/');
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d1322] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-2xl font-black">
              !
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                Pemulihan Sistem ZAIN.NET
              </span>
              <h2 className="text-xl font-bold text-white mt-2">
                Memuat Ulang Antarmuka
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Terdeteksi pembaruan versi atau kendala cache browser pada perangkat Anda.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] text-rose-300 font-mono text-left max-h-24 overflow-y-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                Muat Ulang Halaman
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                Bersihkan Cache &amp; Buka Kembali
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
