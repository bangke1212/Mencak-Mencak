'use client';

import { useState, useCallback, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

  // --- PROCESSOR VIEW ---
  if (file && fileType && processedFile) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        {/* Mini Header */}
        <header className="glass sticky top-0 z-50 border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <button onClick={handleReset} className="flex items-center gap-2 text-slate-500 hover:text-indigo-500 transition-colors font-medium text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{file.name}</span>
            </div>
            <div className="w-[100px]" />
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {fileType === 'image' && (
            <ImageProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />
          )}
          {fileType === 'video' && (
            <VideoProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />
          )}
        </div>
      </div>
    );
  }

  // --- HOMEPAGE ---
  return (
    <div className="min-h-screen bg-[#f8fafc] overflow-hidden">
      {/* ======== AMBIENT BACKGROUND ======== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/10 via-purple-400/8 to-pink-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-blue-400/10 via-cyan-400/8 to-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-violet-400/5 via-transparent to-rose-400/5 rounded-full blur-3xl" />
      </div>

      {/* ======== NAVIGATION ======== */}
      <nav className={`relative z-40 transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Watermark Remover</h1>
              <p className="text-[11px] text-slate-400 font-medium">AI-Powered Tool</p>
            </div>
          </div>

          {/* Badges */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="badge badge-primary">🤖 AI Detection</span>
            <span className="badge badge-success">⚡ Free &amp; Fast</span>
            <span className="badge border border-slate-200 bg-white text-slate-500">📦 Max 50MB</span>
          </div>
        </div>
      </nav>

      {/* ======== HERO ======== */}
      <section className={`relative z-10 pt-12 pb-8 text-center transition-all duration-700 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="max-w-4xl mx-auto px-4">
          {/* Floating Icon */}
          <div className="animate-float inline-block mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 rotate-3 hover:rotate-0 transition-transform duration-500">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>

          <h2 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
            <span className="gradient-text">Remove Watermarks</span>
            <br />
            <span className="text-slate-800">Like Magic ✨</span>
          </h2>
          <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Upload any image or video — our AI automatically detects and removes watermarks
            with <span className="font-semibold text-slate-700">stunning precision</span>.
            No signup. No watermark. Completely free.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">🔒 Privacy First</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="flex items-center gap-1.5">⚡ Browser-Native</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="flex items-center gap-1.5">🎯 LaMa AI Powered</span>
          </div>
        </div>
      </section>

      {/* ======== ACTION BUTTONS ======== */}
      <section className={`relative z-10 max-w-2xl mx-auto px-4 pb-8 transition-all duration-700 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="glass-card rounded-3xl p-8 md:p-10 glow">
          <h3 className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Choose Input Method
          </h3>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Upload Button */}
            <label className="flex-1 group cursor-pointer">
              <input
                type="file"
                className="hidden"
                id="hero-upload"
                accept="image/*,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const type = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : null;
                  if (type) handleFileSelect(f, type);
                }}
              />
              <div className="w-full p-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white text-center cursor-pointer transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-indigo-500/30 group-active:scale-95">
                <div className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="font-bold text-lg">Upload File</div>
                <div className="text-sm text-white/70 mt-1">From your device</div>
              </div>
            </label>

            {/* Import URL Button */}
            <button
              onClick={() => setShowURLImport(true)}
              className="flex-1 p-6 bg-white border-2 border-slate-200 hover:border-indigo-300 rounded-2xl text-center cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10 active:scale-95 group"
            >
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center group-hover:from-indigo-50 group-hover:to-purple-50 transition-colors">
                <svg className="w-7 h-7 text-slate-600 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="font-bold text-lg text-slate-700">Import from URL</div>
              <div className="text-sm text-slate-400 mt-1">Paste any image/video link</div>
            </button>
          </div>

          {/* Divider */}
          <div className="divider my-6">or</div>

          {/* Drop Zone */}
          <FileUploader onFileSelect={handleFileSelect} />
        </div>
      </section>

      {/* ======== FEATURES ======== */}
      <section className={`relative z-10 max-w-5xl mx-auto px-4 py-12 transition-all duration-700 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="text-center mb-10">
          <span className="badge badge-primary mb-4">✨ Features</span>
          <h3 className="text-3xl font-bold text-slate-800 mt-4">Why Choose Our Tool?</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '🔍',
              gradient: 'from-amber-400 to-orange-500',
              title: 'Auto-Detect',
              desc: 'AI scans your entire image using edge detection &amp; frequency analysis to find watermarks automatically.',
            },
            {
              icon: '🤖',
              gradient: 'from-indigo-500 to-purple-600',
              title: 'AI Inpainting',
              desc: 'LaMa AI model fills removed areas with context-aware content — looks completely natural.',
            },
            {
              icon: '🎬',
              gradient: 'from-emerald-400 to-teal-500',
              title: 'Video Ready',
              desc: 'Extract frames, remove watermarks, and rebuild. Download Python script for batch processing.',
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group cursor-default"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">{feature.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======== HOW IT WORKS ======== */}
      <section className={`relative z-10 max-w-4xl mx-auto px-4 py-12 transition-all duration-700 delay-400 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="text-center mb-10">
          <span className="badge border border-slate-200 bg-white text-slate-500 mb-4">⚡ 4 Simple Steps</span>
          <h3 className="text-3xl font-bold text-slate-800 mt-4">How It Works</h3>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-0">
          {[
            { emoji: '📂', label: 'Upload File' },
            { emoji: '🔍', label: 'AI Detects' },
            { emoji: '✨', label: 'AI Removes' },
            { emoji: '📥', label: 'Download' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-default">
                  {step.emoji}
                </div>
                <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                <span className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
              </div>
              {i < 3 && (
                <div className="hidden md:block mx-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ======== STATS ======== */}
      <section className={`relative z-10 max-w-4xl mx-auto px-4 py-12 transition-all duration-700 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="glass-card rounded-3xl p-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { value: '100%', label: 'Browser-Based', sub: 'Your files never leave your device' },
            { value: '50MB', label: 'Max File Size', sub: 'Works with high-res images &amp; 4K video' },
            { value: '∞', label: 'Free Forever', sub: 'No limits, no registration required' },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="text-3xl font-extrabold gradient-text">{stat.value}</div>
              <div className="font-semibold text-slate-700">{stat.label}</div>
              <div className="text-xs text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="relative z-10 border-t border-slate-200/60 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="font-bold text-slate-700 text-sm">Watermark Remover</span>
          </div>
          <p className="text-xs text-slate-400">
            Built with ❤️ using Next.js · Deployed on Vercel · Powered by LaMa AI
          </p>
        </div>
      </footer>

      {/* ======== URL IMPORT MODAL ======== */}
      {showURLImport && (
        <URLImporter
          onFileLoad={handleFileSelect}
          onClose={() => setShowURLImport(false)}
        />
      )}
    </div>
  );
}
