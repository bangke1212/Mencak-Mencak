'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [dragActive, setDragActive] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Expose drop handler to FileUploader child via a global event
    const handler = (e: CustomEvent) => {
      const { type } = e.detail;
      if (type === 'image' || type === 'video') handleFileSelect(e.detail.file, type);
    };
    window.addEventListener('watermark:drop', handler as EventListener);
    return () => window.removeEventListener('watermark:drop', handler as EventListener);
  }, []);

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

  const handleUpdate = useCallback((updated: ProcessedFile) => setProcessedFile(updated), []);
  const handleReset = useCallback(() => {
    setFile(null); setFileType(null);
    if (processedFile?.originalUrl) URL.revokeObjectURL(processedFile.originalUrl);
    setProcessedFile(null);
  }, [processedFile]);

  // ===== PROCESSOR VIEW =====
  if (file && fileType && processedFile) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <header className="glass sticky top-0 z-50 border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <button onClick={handleReset} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand-600)] transition-colors font-medium text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent)] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{file.name}</span>
            </div>
            <div className="w-[80px]" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-6">
          {fileType === 'image' && <ImageProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />}
          {fileType === 'video' && <VideoProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />}
        </div>
      </div>
    );
  }

  // ===== HOMEPAGE =====
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative">
      {/* Ambient Background Orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ===== NAVBAR (remove.bg style - minimal) ===== */}
      <nav className="relative z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent)] rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="font-bold text-[var(--text-primary)] text-lg tracking-tight">WatermarkRemover</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="badge badge-blue">🤖 AI-Powered</span>
            <span className="badge badge-green">✨ Free</span>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-8 text-center">
        <div className="max-w-4xl mx-auto px-4">
          {/* Floating icon animation */}
          <div className="animate-float mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[var(--brand-500)] via-[var(--accent)] to-purple-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>

          {/* Headline (remove.bg style) */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] animate-fadeInUp">
            Remove Watermarks From
            <br />
            <span className="gradient-text">Images & Videos</span>
          </h1>
          <p className="mt-5 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto animate-fadeInUp stagger-1">
            100% automatically — in just a few seconds. No signup required.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs text-[var(--text-tertiary)] animate-fadeInUp stagger-2">
            {['🔒 Privacy First', '⚡ Instant Results', '🤖 LaMa AI', '📦 Up to 50MB'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MAIN ACTION AREA ===== */}
      <section className="relative z-10 max-w-3xl mx-auto px-4 pb-12 animate-fadeInUp stagger-3">
        <div className="bg-white rounded-3xl border border-[var(--border-light)] shadow-xl shadow-blue-500/5 p-6 sm:p-8 md:p-10">

          {/* === Upload + Import Buttons (remove.bg style - horizontal) === */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <label className="flex-1 cursor-pointer group">
              <input type="file" className="hidden" accept="image/*,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const type = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : null;
                  if (type) handleFileSelect(f, type);
                }}
              />
              <div className="btn btn-primary btn-lg w-full group-hover:scale-[1.02] transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload File
              </div>
            </label>

            <button onClick={() => setShowURLImport(true)} className="btn btn-secondary btn-lg flex-1 hover:scale-[1.02] transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Paste Image URL
            </button>
          </div>

          {/* Divider */}
          <div className="divider-text mb-6">OR</div>

          {/* === Drop Zone (watermarkremover.io style) === */}
          <FileUploader onFileSelect={handleFileSelect} />
        </div>
      </section>

      {/* ===== HOW IT WORKS - 3 Steps (remove.bg style) ===== */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10 animate-fadeInUp">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Remove watermark in <span className="gradient-text">3 simple steps</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', icon: '📤', title: 'Upload', desc: 'Upload your image or video, or paste a URL. Supports PNG, JPG, WEBP, MP4, MOV & more.' },
            { step: '02', icon: '🤖', title: 'AI Processing', desc: 'Our LaMa AI automatically detects and removes watermarks with stunning precision.' },
            { step: '03', icon: '📥', title: 'Download', desc: 'Get your clean, watermark-free result instantly. No registration required.' },
          ].map((s, i) => (
            <div key={s.step} className="card animate-fadeInUp" style={{ animationDelay: `${0.1 * i}s` }}>
              <span className="text-xs font-bold text-[var(--brand-500)] tracking-wider">{s.step}</span>
              <div className="text-3xl my-3">{s.icon}</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BENTO GRID FEATURES ===== */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10 animate-fadeInUp">
          <span className="badge badge-blue mb-3">✨ Features</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-3">
            Why creators love <span className="gradient-text">WatermarkRemover</span>
          </h2>
        </div>

        <div className="bento-grid">
          {/* Large card - spans 8 cols on desktop */}
          <div className="bento-card" style={{ gridColumn: 'span 8' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Automatic Watermark Detection</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  No manual selection needed. Our AI uses edge detection, frequency analysis, and deep learning to find watermarks in corners, center, or anywhere on your image. Just upload and let AI do the work — like magic.
                </p>
              </div>
            </div>
          </div>

          {/* Side card - spans 4 cols */}
          <div className="bento-card" style={{ gridColumn: 'span 4' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3 shadow-md">
              <span className="text-xl">🤖</span>
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">AI Inpainting</h3>
            <p className="text-sm text-[var(--text-secondary)]">LaMa AI fills removed areas with context-aware content — looks completely natural.</p>
          </div>

          {/* Bottom row */}
          <div className="bento-card" style={{ gridColumn: 'span 4' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-3 shadow-md">
              <span className="text-xl">🎬</span>
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Video Support</h3>
            <p className="text-sm text-[var(--text-secondary)]">Process video frames, remove watermarks frame by frame with consistent quality.</p>
          </div>

          <div className="bento-card" style={{ gridColumn: 'span 4' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-3 shadow-md">
              <span className="text-xl">⚡</span>
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">Browser-Native</h3>
            <p className="text-sm text-[var(--text-secondary)]">Processing happens in your browser. Files never leave your device for maximum privacy.</p>
          </div>

          <div className="bento-card" style={{ gridColumn: 'span 4' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-3 shadow-md">
              <span className="text-xl">📱</span>
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-1">All Devices</h3>
            <p className="text-sm text-[var(--text-secondary)]">Works on desktop, tablet, and mobile. No app install needed — just your browser.</p>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 py-12 animate-fadeInUp">
        <div className="bg-gradient-to-r from-[var(--brand-50)] via-indigo-50 to-purple-50 rounded-3xl p-8 sm:p-10 border border-[var(--brand-100)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { value: '100%', label: 'Free Forever', sub: 'No credit card required' },
              { value: '50MB', label: 'Max File Size', sub: 'High-res images & 4K video' },
              { value: '< 30s', label: 'Processing Time', sub: 'Lightning fast AI results' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-extrabold gradient-text">{stat.value}</div>
                <div className="font-semibold text-[var(--text-primary)] mt-1">{stat.label}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SUPPORTED FORMATS ===== */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 pb-12 text-center animate-fadeInUp">
        <p className="text-sm text-[var(--text-tertiary)] mb-3">Supported Formats</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {['PNG', 'JPG', 'WEBP', 'BMP', 'TIFF', 'MP4', 'WEBM', 'MOV', 'AVI', 'MKV', 'HEIC'].map((fmt) => (
            <span key={fmt} className="badge badge-gray">{fmt}</span>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 border-t border-[var(--border-light)] py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent)] rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">WatermarkRemover</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Powered by LaMa AI · Next.js · Vercel
          </p>
        </div>
      </footer>

      {/* ===== MODALS ===== */}
      {showURLImport && <URLImporter onFileLoad={handleFileSelect} onClose={() => setShowURLImport(false)} />}
    </div>
  );
}
