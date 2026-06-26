'use client';

import { ProcessingState } from '@/types';

interface ProgressBarProps {
  state: ProcessingState;
}

export default function ProgressBar({ state }: ProgressBarProps) {
  const { status, progress, message, estimatedTime } = state;

  if (status === 'idle') return null;

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
      case 'detecting':
        return 'from-blue-500 to-blue-600';
      case 'removing':
      case 'processing':
        return 'from-purple-500 to-pink-500';
      case 'done':
        return 'from-green-500 to-emerald-500';
      case 'error':
        return 'from-red-500 to-red-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'done':
        return '✅';
      case 'error':
        return '❌';
      case 'detecting':
        return '🔍';
      case 'removing':
        return '🔄';
      default:
        return '⏳';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 flex items-center gap-2">
          {getStatusIcon()} {message || status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <span className="text-gray-400">{progress}%</span>
      </div>

      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getStatusColor()} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {estimatedTime && status === 'removing' && (
        <p className="text-xs text-gray-400">
          Estimated time: ~{estimatedTime} seconds
        </p>
      )}
    </div>
  );
}
