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
  variant?: 'default' | 'sidebar';
}

function stepToType(step: string, explicit?: BackendActivityEntry['type']): BackendActivityEntry['type'] {
  if (explicit) return explicit;
  if (step === 'error' || step === 'connection_failed' || step === 'proxy_error') return 'error';
  if (
    step === 'success' ||
    step === 'validation_success' ||
    step === 'proxy_found' ||
    step === 'direct_connection_success' ||
    step === 'api_success' ||
    step === 'reusing_saved_proxy' ||
    step === 'proxy_saved'
  ) {
    return 'success';
  }
  if (
    step === 'direct_connection_blocked' ||
    step === 'proxy_not_found' ||
    step === 'verifying_auth_retry' ||
    step === 'retry_direct_connection' ||
    step === 'saved_proxy_expired'
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
  maxHeightClassName = '',
  variant = 'default',
}: BackendActivityPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSidebar = variant === 'sidebar';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isActive]);

  return (
    <div className={`results-card backend-activity-panel ${isSidebar ? 'backend-activity-sidebar' : ''} ${className}`}>
      <h3 className="card-title">
        <i className={`fa-solid ${isActive ? 'fa-circle-notch fa-spin' : 'fa-terminal'}`}></i>
        <span>{title}</span>
        {isActive && <span className="backend-activity-status">Đang chạy...</span>}
      </h3>

      <div
        ref={scrollRef}
        className={`backend-activity-log ${
          isSidebar ? 'backend-activity-log-sidebar' : 'backend-activity-log-default'
        } ${maxHeightClassName}`}
      >
        {entries.length === 0 ? (
          <div className="backend-activity-empty">{emptyMessage}</div>
        ) : (
          entries.map((entry, idx) => {
            const type = stepToType(entry.step, entry.type);

            return (
              <article
                key={`${entry.step}-${entry.timestamp || idx}`}
                className={`backend-activity-entry backend-activity-entry--${type}`}
              >
                <div className="backend-activity-entry-meta">
                  <time className="backend-activity-entry-time">{formatTime(entry.timestamp)}</time>
                  <span className="backend-activity-step-badge" title={entry.step}>
                    [{entry.step}]
                  </span>
                </div>
                <p className="backend-activity-entry-message">
                  {type === 'error' && <span className="backend-activity-entry-icon">❌ </span>}
                  {type === 'success' && <span className="backend-activity-entry-icon">✅ </span>}
                  {type === 'warn' && <span className="backend-activity-entry-icon">⚠️ </span>}
                  {entry.message}
                </p>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
