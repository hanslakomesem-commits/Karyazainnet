/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Terminal, Loader2 } from 'lucide-react';
import { ProcessingLog } from '../types/skripsi';

interface ProcessLogsProps {
  logs: ProcessingLog[];
  isProcessing: boolean;
  progressPercent: number;
}

export const ProcessLogs: React.FC<ProcessLogsProps> = ({
  logs,
  isProcessing,
  progressPercent,
}) => {
  if (logs.length === 0 && !isProcessing) return null;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold tracking-wide">
            Log Eksekusi Engine OOXML Word
          </h3>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Memproses dokumen... {progressPercent}%</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Logs Terminal */}
      <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs max-h-64 overflow-y-auto space-y-1.5 scrollbar-thin border border-slate-800/80">
        {logs.map((log) => {
          let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
          let textColor = 'text-slate-300';

          if (log.type === 'error') {
            icon = <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />;
            textColor = 'text-rose-400 font-bold';
          } else if (log.type === 'warning') {
            icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
            textColor = 'text-amber-300';
          } else if (log.type === 'info') {
            textColor = 'text-blue-300';
          }

          return (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-slate-600 text-[10px] shrink-0">{log.timestamp}</span>
              {icon}
              <span className={textColor}>{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
