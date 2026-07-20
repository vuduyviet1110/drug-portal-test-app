'use client';

import React, { useEffect, useRef } from 'react';
import { BackendActivityEntry } from '../types';

interface BackendActivityPanelProps {
  title?: string;
  entries: BackendActivityEntry[];
  isActive?: boolean;
  emptyMessage?: string;
  className?: string;
  maxHeightClassName?: string;
}

function stepToType(step: string, explicit?: BackendActivityEntry['type']): BackendActivityEntry['type'] {
  if (explicit) return explicit;
  if (step === 'error' || step === 'connection_failed' || step === 'proxy_error') return 'error';
  if (
    step === 'success' ||
    step === 'validation_success' ||
    step === 'proxy_found' ||
    step === 'direct_connection_success' ||
    step === 'api_success'
  ) {
    return 'success';
  }
  if (
    step === 'direct_connection_blocked' ||
    step === 'proxy_not_found' ||
    step === 'verifying_auth_retry' ||
    step === 'retry_direct_connection'
  ) {
    return 'warn';
  }
  return 'info';
}

function formatTime(timestamp?: string) {
  if (!timestamp) return new Date().toLocaleTimeString();
  return new Date(timestamp).toLocaleTimeString();
}

export default function BackendActivityPanel({
  title = 'Nhật ký xử lý backend',
  entries,
  isActive = false,
  emptyMessage = 'Chưa có hoạt động backend nào.',
  className = '',
  maxHeightClassName = 'max-h-52',
}: BackendActivityPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isActive]);

  return (
    <div className={`results-card ${className}`}>
      <h3 className="card-title">
        <i className={`fa-solid ${isActive ? 'fa-circle-notch fa-spin' : 'fa-terminal'}`}></i>
        {title}
        {isActive && <span className="ml-2 text-[10px] font-normal text-teal-600 uppercase tracking-wide">Đang chạy...</span>}
      </h3>

      <div
        ref={scrollRef}
        className={`bg-slate-900 rounded-lg p-4 border border-slate-800 overflow-y-auto text-left font-mono text-[10px] space-y-1.5 shadow-inner ${maxHeightClassName}`}
      >
        {entries.length === 0 ? (
          <div className="text-slate-500 italic">{emptyMessage}</div>
        ) : (
          entries.map((entry, idx) => {
            const type = stepToType(entry.step, entry.type);
            return (
              <div
                key={`${entry.step}-${entry.timestamp || idx}`}
                className={`flex items-start gap-1.5 ${
                  type === 'error'
                    ? 'text-rose-400'
                    : type === 'success'
                      ? 'text-emerald-400 font-semibold'
                      : type === 'warn'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 shrink-0">[{formatTime(entry.timestamp)}]</span>
                <span className="text-slate-500 shrink-0">[{entry.step}]</span>
                <span>
                  {type === 'error' && '❌ '}
                  {type === 'success' && '✅ '}
                  {type === 'warn' && '⚠️ '}
                  {entry.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
