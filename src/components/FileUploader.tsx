'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileType } from '@/types';
import { detectFileType, validateFileSize, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/lib/utils';

interface Props { onFileSelect: (file: File, type: FileType) => void; }

export default function FileUploader({ onFileSelect }: Props) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    setError(null);
    if (rejected.length) { setError('Unsupported file type. Use image or video files.'); return; }
    if (!accepted.length) return;
    const file = accepted[0];
    const type = detectFileType(file);
    if (!type) { setError('Format not supported. Use PNG, JPG, WEBP, MP4, MOV, etc.'); return; }
    const sizeErr = validateFileSize(file, type);
    if (sizeErr) { setError(sizeErr); return; }
    onFileSelect(file, type);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, maxSize: 50 * 1024 * 1024,
    accept: { 'image/*': ALLOWED_IMAGE_TYPES, 'video/*': ALLOWED_VIDEO_TYPES },
  });

  return (
    <div>
      <div {...getRootProps()} style={{
        border: isDragActive ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
        borderRadius: 16, padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
        background: isDragActive ? '#eff6ff' : '#fafbfc',
        transition: 'all 0.2s',
      }}>
        <input {...getInputProps()} />
        <div style={{fontSize: 40, marginBottom: 12}}>{isDragActive ? '📥' : '📤'}</div>
        <p style={{fontSize: 15, fontWeight: 600, color: isDragActive ? '#2563eb' : '#555', margin: '0 0 4px'}}>
          {isDragActive ? 'Drop your file here!' : 'Drag & drop your file here'}
        </p>
        <p style={{fontSize: 13, color: '#999', margin: 0}}>
          {isDragActive ? 'Release to start' : 'or click to browse files'}
        </p>
        <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap'}}>
          {['🖼️ Images', '🎬 Videos', '📦 ≤ 50MB'].map(b => (
            <span key={b} style={{fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'white', border: '1px solid #e5e7eb', color: '#777', fontWeight: 500}}>{b}</span>
          ))}
        </div>
      </div>

      {error && (
        <div style={{marginTop: 12, padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8}}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
