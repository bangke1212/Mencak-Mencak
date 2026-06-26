'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileType } from '@/types';
import { detectFileType, validateFileSize, formatFileSize, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelect: (file: File, type: FileType) => void;
}

export default function FileUploader({ onFileSelect }: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError('File type not supported. Please upload an image or video file.');
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const type = detectFileType(file);

      if (!type) {
        setError(
          `Unsupported file type: ${file.type || file.name}. Supported: PNG, JPG, WEBP, BMP, TIFF, MP4, WEBM, MOV, AVI, MKV`
        );
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
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-300 text-center
          ${
            isDragActive
              ? 'border-blue-400 bg-blue-50/50 scale-[1.02]'
              : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
          }`}
      >
        <input {...getInputProps()} />

        {/* Upload Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        </div>

        {isDragActive ? (
          <div>
            <p className="text-xl font-semibold text-blue-600">Drop your file here</p>
            <p className="text-sm text-blue-400 mt-2">Release to start processing</p>
          </div>
        ) : (
          <div>
            <p className="text-xl font-semibold text-gray-700">
              Drag & drop your file here
            </p>
            <p className="text-sm text-gray-400 mt-2">or click to browse</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="px-3 py-1.5 bg-gray-100 rounded-full">🖼️ Images</span>
          <span className="px-3 py-1.5 bg-gray-100 rounded-full">🎬 Videos</span>
          <span className="px-3 py-1.5 bg-gray-100 rounded-full">Max 50 MB</span>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          PNG, JPG, WEBP, BMP, TIFF, MP4, WEBM, MOV, AVI, MKV
        </p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
