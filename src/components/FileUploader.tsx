'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileType } from '@/types';
import { detectFileType, validateFileSize, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelect: (file: File, type: FileType) => void;
}

export default function FileUploader({ onFileSelect }: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError('Unsupported file type. Please upload an image or video file.');
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const type = detectFileType(file);

      if (!type) {
        setError('Unsupported format. Supports: PNG, JPG, WEBP, BMP, TIFF, MP4, WEBM, MOV, AVI, MKV');
        return;
      }

      const sizeError = validateFileSize(file, type);
      if (sizeError) {
        setError(sizeError);
        return;
      }

      onFileSelect(file, type);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ALLOWED_IMAGE_TYPES,
      'video/*': ALLOWED_VIDEO_TYPES,
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 text-center
          ${isDragActive
            ? 'border-indigo-400 bg-indigo-50/60 scale-[1.01] shadow-lg shadow-indigo-500/10'
            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60'
          }`}
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <div className="py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-2xl flex items-center justify-center animate-bounce">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-bold text-indigo-600">Drop it here!</p>
            <p className="text-sm text-indigo-400 mt-1">Release to start processing</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-500">
              Drag &amp; drop your file here
            </p>
            <p className="text-sm text-slate-400 mt-1">
              or click anywhere to browse
            </p>
          </div>
        )}

        {/* Format badges */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {['🖼️ Images', '🎬 Videos', '📦 ≤ 50MB'].map((badge) => (
            <span key={badge} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-500 font-medium">
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-start gap-3 animate-fadeIn">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
