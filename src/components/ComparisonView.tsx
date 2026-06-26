'use client';

import { ProcessedFile } from '@/types';

interface ComparisonViewProps {
  originalUrl: string;
  processedUrl: string;
  filename: string;
}

export default function ComparisonView({ originalUrl, processedUrl, filename }: ComparisonViewProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-700">Before & After</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Before</p>
          <div className="border-2 border-red-200 rounded-xl overflow-hidden">
            <img src={originalUrl} alt="Original" className="w-full h-auto" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-green-600 mb-2">After</p>
          <div className="border-2 border-green-200 rounded-xl overflow-hidden">
            <img src={processedUrl} alt="Processed" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
