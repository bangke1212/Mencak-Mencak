'use client';

import { useState, useCallback } from 'react';
import { ProcessedFile, FileType } from '@/types';
import { createEmptyProcessingState } from '@/lib/utils';
import FileUploader from '@/components/FileUploader';
import ImageProcessor from '@/components/ImageProcessor';
import VideoProcessor from '@/components/VideoProcessor';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);

  const handleFileSelect = useCallback((file: File, type: FileType) => {
    setFile(file);
    setFileType(type);
    setProcessedFile({
      id: crypto.randomUUID(),
      originalName: file.name,
      fileType: type,
      originalSize: file.size,
      originalUrl: URL.createObjectURL(file),
      watermarkRegions: [],
      processingState: createEmptyProcessingState(),
      createdAt: new Date(),
    });
  }, []);

  const handleUpdate = useCallback((updated: ProcessedFile) => {
    setProcessedFile(updated);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setFileType(null);
    if (processedFile?.originalUrl) {
      URL.revokeObjectURL(processedFile.originalUrl);
    }
    setProcessedFile(null);
  }, [processedFile]);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Watermark Remover</h1>
              <p className="text-xs text-gray-400">AI-Powered Image & Video</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="px-3 py-1.5 bg-gray-100 rounded-full">
              🤖 AI Detection + Inpainting
            </span>
            <span className="px-3 py-1.5 bg-gray-100 rounded-full">
              📦 Max 50 MB
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!file ? (
          <>
            {/* Hero */}
            <div className="text-center mb-12 mt-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Remove Watermarks Automatically
              </h2>
              <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
                Upload any image or video and let AI detect & remove watermarks automatically.
                Supports all major formats — <strong>free & no registration</strong>.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <FeatureCard
                icon="🔍"
                title="Auto-Detect"
                description="AI automatically finds watermarks in corners, center, or anywhere in your image/video."
              />
              <FeatureCard
                icon="🤖"
                title="AI Inpainting"
                description="Uses LaMa AI model to intelligently fill removed watermark areas with natural content."
              />
              <FeatureCard
                icon="🎬"
                title="Video Support"
                description="Process video frames to remove watermarks. Download offline script for full processing."
              />
            </div>

            {/* Uploader */}
            <FileUploader onFileSelect={handleFileSelect} />

            {/* How it works */}
            <div className="mt-16 text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-6">How It Works</h3>
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
                <StepBadge number={1} text="Upload file" />
                <Arrow />
                <StepBadge number={2} text="AI detects watermarks" />
                <Arrow />
                <StepBadge number={3} text="AI removes them" />
                <Arrow />
                <StepBadge number={4} text="Download result" />
              </div>
            </div>
          </>
        ) : (
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <button onClick={handleReset} className="hover:text-blue-500">Home</button>
              <span>/</span>
              <span className="text-gray-600 font-medium truncate">{file.name}</span>
            </div>

            {/* Processor */}
            {fileType === 'image' && processedFile && (
              <ImageProcessor
                file={file}
                processedFile={processedFile}
                onUpdate={handleUpdate}
                onReset={handleReset}
              />
            )}
            {fileType === 'video' && processedFile && (
              <VideoProcessor
                file={file}
                processedFile={processedFile}
                onUpdate={handleUpdate}
                onReset={handleReset}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-400">
          <p>Watermark Remover — AI-Powered tool. Processing happens in your browser or via free Hugging Face API.</p>
          <p className="mt-1">
            Built with Next.js · Deploy on Vercel · Powered by LaMa Inpainting AI
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function StepBadge({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-gray-200 shadow-sm">
      <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </span>
      <span className="text-sm text-gray-600 font-medium">{text}</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="w-6 h-6 text-gray-300 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
