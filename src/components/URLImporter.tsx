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
    if (!url.trim()) { setError('Please enter a URL'); return; }
    try { new URL(url); } catch { setError('Invalid URL format'); return; }

    setError(null); setLoading(true); setProgress(10);

    try {
      const response = await fetch('/api/proxy-download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (response.ok) {
        setProgress(50);
        const result = await response.json();
        if (result.success && result.data) {
          const byteString = atob(result.data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const mimeType = result.contentType || 'image/png';
          const blob = new Blob([ab], { type: mimeType });
          const filename = extractFilename(url) || `import-${Date.now()}`;
          const file = new File([blob], filename, { type: mimeType });
          const fileType = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : null;
          if (!fileType) throw new Error(`Unsupported type: ${mimeType}`);
          setProgress(100);
          setTimeout(() => onFileLoad(file, fileType), 200);
          return;
        }
        throw new Error(result.error || 'Download failed');
      }
      // Direct fallback
      setProgress(30);
      const direct = await fetch(url.trim());
      if (!direct.ok) throw new Error(`HTTP ${direct.status}`);
      const blob = await direct.blob();
      const filename = extractFilename(url) || `import-${Date.now()}`;
      const file = new File([blob], filename, { type: blob.type });
      const fileType = blob.type.startsWith('image/') ? 'image' : blob.type.startsWith('video/') ? 'video' : null;
      if (!fileType) throw new Error(`Unsupported type: ${blob.type}`);
      setProgress(100);
      setTimeout(() => onFileLoad(file, fileType), 200);
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) setUrl(text);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Import from URL</h3>
              <p className="text-xs text-slate-400">Paste any image or video link</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Image or Video URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="flex-1 input-premium"
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                autoFocus
              />
              <button onClick={handlePaste} disabled={loading} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-lg" title="Paste">
                📋
              </button>
            </div>
          </div>

          {/* Quick examples */}
          <div className="flex flex-wrap gap-2">
            {['https://picsum.photos/800/600', 'https://placehold.co/600x400'].map((ex) => (
              <button key={ex} onClick={() => setUrl(ex)} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-full text-slate-500 transition-colors">
                {ex}
              </button>
            ))}
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2 animate-fadeIn">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-400 text-center">Downloading... {progress}%</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-start gap-2 animate-fadeIn">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-slate-400">Supported: PNG, JPG, WEBP, GIF, BMP, MP4, WEBM, MOV (max 50MB)</p>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <button onClick={handleImport} disabled={loading || !url.trim()}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              {loading ? '⏳ Downloading...' : '⬇️ Import File'}
            </button>
            <button onClick={onClose} disabled={loading} className="btn-secondary">Cancel</button>
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
  } catch { return `import-${Date.now()}`; }
}
