'use client';

import { useState, useCallback } from 'react';
import { ProcessedFile, FileType } from '@/types';
import { createEmptyProcessingState } from '@/lib/utils';
import FileUploader from '@/components/FileUploader';
import URLImporter from '@/components/URLImporter';
import ImageProcessor from '@/components/ImageProcessor';
import VideoProcessor from '@/components/VideoProcessor';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [showURLImport, setShowURLImport] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File, type: FileType) => {
    setFile(selectedFile);
    setFileType(type);
    setProcessedFile({
      id: crypto.randomUUID(),
      originalName: selectedFile.name,
      fileType: type,
      originalSize: selectedFile.size,
      originalUrl: URL.createObjectURL(selectedFile),
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
              <p className="text-xs text-gray-400">AI-Powered Image &amp; Video</p>
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
            <div className="text-center mb-10 mt-6">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Remove Watermarks Automatically
              </h2>
              <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
                Upload any image or video and let AI detect &amp; remove watermarks automatically.
                Supports all major formats — <strong>free &amp; no registration</strong>.
              </p>
            </div>

            {/* ===== UPLOAD + IMPORT BUTTONS ===== */}
            <div className="max-w-2xl mx-auto mb-12">
              {/* Big Upload Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <label className="flex-1 group cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const type = f.type.startsWith('image/') ? 'image' :
                                   f.type.startsWith('video/') ? 'video' : null;
                      if (type) handleFileSelect(f, type);
                    }}
                    id="main-file-upload"
                  />
                  <div className="w-full py-5 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 group-hover:scale-[1.02] flex items-center justify-center gap-3 text-center">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    📁 Upload File
                  </div>
                </label>

                <button
                  onClick={() => setShowURLImport(true)}
                  className="flex-1 py-5 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  🌐 Import from URL
                </button>
              </div>

              {/* Or Divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-400 font-medium">or drag &amp; drop below</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Drop Zone */}
              <FileUploader onFileSelect={handleFileSelect} />
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <FeatureCard
                icon="🔍"
                title="Auto-Detect"
                description="AI automatically finds watermarks using edge detection &amp; frequency analysis — corners, center, or anywhere."
              />
              <FeatureCard
                icon="🤖"
                title="AI Inpainting"
                description="Uses LaMa AI model (via Hugging Face) to intelligently fill removed watermark areas with natural-looking content."
              />
              <FeatureCard
                icon="🎬"
                title="Video Support"
                description="Process video frames to detect &amp; remove watermarks. Download Python script for offline batch processing."
              />
            </div>

            {/* How it works */}
            <div className="mt-16 text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-6">How It Works</h3>
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6">
                <StepBadge number={1} text="Upload or Import URL" emoji="📂" />
                <Arrow />
                <StepBadge number={2} text="AI detects watermarks" emoji="🔍" />
                <Arrow />
                <StepBadge number={3} text="AI removes them" emoji="✨" />
                <Arrow />
                <StepBadge number={4} text="Download result" emoji="📥" />
              </div>
            </div>
          </>
        ) : (
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <button onClick={handleReset} className="hover:text-blue-500">← Home</button>
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

      {/* URL Import Modal */}
      {showURLImport && (
        <URLImporter
          onFileLoad={handleFileSelect}
          onClose={() => setShowURLImport(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-400">
          <p>Watermark Remover — AI-Powered tool. Processing happens in your browser with client-side fallback.</p>
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
    <div className="p-6 bg-white rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">{icon}</div>
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function StepBadge({ number, text, emoji }: { number: number; text: string; emoji: string }) {
  return (
    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <span className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
        {emoji || number}
      </span>
      <span className="text-sm text-gray-600 font-medium whitespace-nowrap">{text}</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="w-6 h-6 text-gray-300 rotate-90 md:rotate-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
