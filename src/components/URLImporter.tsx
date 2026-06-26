'use client';

import { useState } from 'react';

interface URLImporterProps {
  onFileLoad: (file: File, type: 'image' | 'video') => void;
  onClose: () => void;
}

export default function URLImporter({ onFileLoad, onClose }: URLImporterProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setError(null);
    setLoading(true);
    setProgress(10);

    try {
      // Try fetching via our proxy API to avoid CORS
      const response = await fetch('/api/proxy-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        // Fallback: fetch directly
        setProgress(30);
        const directResponse = await fetch(url.trim());
        if (!directResponse.ok) throw new Error(`Failed to fetch: ${directResponse.status}`);

        const contentLength = directResponse.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength) : 0;
        const contentType = directResponse.headers.get('content-type') || '';

        const reader = directResponse.body?.getReader();
        if (!reader) throw new Error('No response body');

        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) setProgress(30 + Math.round((received / total) * 60));
        }

        const blob = new Blob(chunks as BlobPart[], { type: contentType || 'application/octet-stream' });
        const filename = extractFilename(url) || 'imported-file';
        const file = new File([blob], filename, { type: contentType });

        const fileType = detectTypeFromMime(contentType);
        if (!fileType) throw new Error(`Unsupported file type: ${contentType}`);

        setProgress(100);
        onFileLoad(file, fileType);
        return;
      }

      setProgress(50);
      const result = await response.json();

      if (result.success && result.data) {
        // Convert base64 to blob
        const base64 = result.data;
        const byteString = atob(base64);
        const mimeType = result.contentType || 'image/png';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        const filename = extractFilename(url) || `imported-${Date.now()}`;
        const file = new File([blob], filename, { type: mimeType });
        const fileType = detectTypeFromMime(mimeType);

        if (!fileType) throw new Error(`Unsupported file type: ${mimeType}`);

        setProgress(100);
        onFileLoad(file, fileType);
      } else {
        throw new Error(result.error || 'Failed to download file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setUrl(text);
      }
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            🌐 Import from URL
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* URL Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image or Video URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              />
              <button
                onClick={handlePaste}
                disabled={loading}
                className="px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm text-gray-600"
                title="Paste from clipboard"
              >
                📋
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'https://picsum.photos/800/600',
                'https://placehold.co/600x400/png',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setUrl(example)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors truncate max-w-[200px]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Downloading... {progress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Supported formats hint */}
          <p className="text-xs text-gray-400">
            Supported: PNG, JPG, WEBP, BMP, GIF, MP4, WEBM, MOV (max 50MB)
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleImport}
              disabled={loading || !url.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium
                hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg shadow-blue-500/25"
            >
              {loading ? '⏳ Downloading...' : '⬇️ Import File'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) return last;
    return `import-${Date.now()}`;
  } catch {
    return `import-${Date.now()}`;
  }
}

function detectTypeFromMime(mimeType: string): 'image' | 'video' | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  // Check common extensions
  if (mimeType.includes('png') || mimeType.includes('jpg') || mimeType.includes('jpeg') ||
      mimeType.includes('webp') || mimeType.includes('gif') || mimeType.includes('bmp')) return 'image';
  if (mimeType.includes('mp4') || mimeType.includes('webm') || mimeType.includes('mov') ||
      mimeType.includes('avi') || mimeType.includes('quicktime')) return 'video';
  return null;
}
