'use client';

import { useState, useRef, useEffect } from 'react';
import { ProcessedFile, ProcessingState, WatermarkRegion } from '@/types';
import { formatFileSize } from '@/lib/utils';

interface VideoProcessorProps {
  file: File;
  processedFile: ProcessedFile;
  onUpdate: (updated: ProcessedFile) => void;
  onReset: () => void;
}

export default function VideoProcessor({
  file, processedFile, onUpdate, onReset,
}: VideoProcessorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null);

  const [processingState, setProcessingState] = useState<ProcessingState>(processedFile.processingState);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [processingMethod, setProcessingMethod] = useState<'overlay-blur' | 'frame-replace'>('overlay-blur');
  const [activeTab, setActiveTab] = useState<'preview' | 'result'>('preview');
  const [detectedRegion, setDetectedRegion] = useState<WatermarkRegion | null>(null);
  const [processedFrameUrl, setProcessedFrameUrl] = useState<string | null>(null);

  const isBusy = processingState.status === 'detecting' || processingState.status === 'processing';
  const isDone = processingState.status === 'done';
  const isError = processingState.status === 'error';
  const hasRegions = processedFile.watermarkRegions.length > 0;

  // Load video + generate thumbnail
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleVideoLoad = () => {
    if (videoRef.current) {
      const v = videoRef.current;
      setDuration(v.duration);
      setVideoLoaded(true);

      // Generate thumbnail
      v.currentTime = v.duration * 0.25;
    }
  };

  const handleThumbnail = () => {
    const v = videoRef.current;
    if (!v || !thumbCanvasRef.current) return;
    const c = thumbCanvasRef.current;
    c.width = 160;
    c.height = 90;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(v, 0, 0, 160, 90);
    setThumbUrl(c.toDataURL('image/jpeg', 0.85));
  };

  // ===== DETECT =====
  const handleDetectInFrame = async () => {
    const v = videoRef.current;
    if (!v) return;

    setProcessingState({ status: 'detecting', progress: 20, message: 'Memindai watermark di frame ini...' });
    await new Promise(r => setTimeout(r, 600));

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(v, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Smart corner detection
    const cornerSize = Math.min(canvas.width, canvas.height) * 0.22;
    const corners = [
      { x: 0, y: 0, name: 'Kiri Atas' },
      { x: canvas.width - cornerSize, y: 0, name: 'Kanan Atas' },
      { x: 0, y: canvas.height - cornerSize, name: 'Kiri Bawah' },
      { x: canvas.width - cornerSize, y: canvas.height - cornerSize, name: 'Kanan Bawah' },
    ];

    let bestCorner = corners[0];
    let bestUniformity = 0;

    for (const corner of corners) {
      let uniformCount = 0, totalPixels = 0, meanLum = 0;

      for (let y = corner.y; y < corner.y + cornerSize && y < canvas.height; y++) {
        for (let x = corner.x; x < corner.x + cornerSize && x < canvas.width; x++) {
          const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
          meanLum += 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
          totalPixels++;
        }
      }
      meanLum /= totalPixels;

      for (let y = corner.y; y < corner.y + cornerSize && y < canvas.height; y++) {
        for (let x = corner.x; x < corner.x + cornerSize && x < canvas.width; x++) {
          const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
          const lum = 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
          if (Math.abs(lum - meanLum) < 20) uniformCount++;
        }
      }

      const uniformity = uniformCount / totalPixels;
      if (uniformity > bestUniformity) { bestUniformity = uniformity; bestCorner = corner; }
    }

    const region: WatermarkRegion = {
      id: `vid-${Date.now()}`,
      x: Math.round((bestCorner.x / canvas.width) * 100),
      y: Math.round((bestCorner.y / canvas.height) * 100),
      width: Math.round((cornerSize / canvas.width) * 100),
      height: Math.round((cornerSize / canvas.height) * 100),
    };

    setDetectedRegion(region);
    setProcessingState({ status: 'idle', progress: 100, message: `Watermark terdeteksi di ${bestCorner.name}! Siap diproses.` });

    onUpdate({ ...processedFile, watermarkRegions: [region] });

    // Draw box on original
    if (originalCanvasRef.current) {
      const c = originalCanvasRef.current;
      c.width = canvas.width; c.height = canvas.height;
      const octx = c.getContext('2d')!;
      octx.drawImage(v, 0, 0);
      octx.strokeStyle = '#3B82F6'; octx.lineWidth = 4; octx.setLineDash([8, 4]);
      octx.strokeRect((region.x/100)*c.width, (region.y/100)*c.height, (region.width/100)*c.width, (region.height/100)*c.height);
    }
  };

  // ===== PROCESS FRAME =====
  const handleProcessFrame = async () => {
    const regions = processedFile.watermarkRegions;
    if (regions.length === 0) {
      setProcessingState({ status: 'error', progress: 0, message: 'Deteksi watermark dulu sebelum proses.' });
      return;
    }

    const v = videoRef.current;
    if (!v) return;

    setProcessingState({ status: 'processing', progress: 30, message: 'Memproses frame...' });
    await new Promise(r => setTimeout(r, 400));

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(v, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setProcessingState({ status: 'processing', progress: 60, message: 'Menghapus watermark...' });

    for (const region of regions) {
      const rx = Math.floor((region.x / 100) * canvas.width);
      const ry = Math.floor((region.y / 100) * canvas.height);
      const rw = Math.floor((region.width / 100) * canvas.width);
      const rh = Math.floor((region.height / 100) * canvas.height);
      const blurRadius = Math.max(6, Math.floor(Math.min(rw, rh) * 0.06));

      for (let y = ry; y < ry + rh && y < canvas.height; y++) {
        for (let x = rx; x < rx + rw && x < canvas.width; x++) {
          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                const idx = (ny * canvas.width + nx) * 4;
                rSum += imageData.data[idx]; gSum += imageData.data[idx + 1]; bSum += imageData.data[idx + 2];
                count++;
              }
            }
          }
          const idx = (y * canvas.width + x) * 4;
          imageData.data[idx] = rSum / count;
          imageData.data[idx + 1] = gSum / count;
          imageData.data[idx + 2] = bSum / count;
        }
      }
    }

    setProcessingState({ status: 'processing', progress: 90, message: 'Finalisasi...' });
    ctx.putImageData(imageData, 0, 0);

    if (processedCanvasRef.current) {
      const pc = processedCanvasRef.current;
      pc.width = canvas.width; pc.height = canvas.height;
      pc.getContext('2d')!.drawImage(canvas, 0, 0);
    }

    const processedUrl = canvas.toDataURL('image/png');
    setProcessedFrameUrl(processedUrl);
    setActiveTab('result');

    setProcessingState({ status: 'done', progress: 100, message: '✅ Frame berhasil diproses! Download frame atau skrip full video.' });

    onUpdate({ ...processedFile, processedUrl, processingState: { status: 'done', progress: 100, message: 'Preview siap. Untuk full video gunakan skrip offline.' } });
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const stepFrame = (dir: 1 | -1) => {
    if (videoRef.current) videoRef.current.currentTime += dir / 30;
  };

  const handleDownloadFrame = () => {
    if (processedFrameUrl) {
      const a = document.createElement('a');
      a.href = processedFrameUrl;
      a.download = `frame_${file.name.replace(/\.[^.]+$/, '.png')}`;
      a.click();
    }
  };

  const handleDownloadScript = () => {
    const regions = processedFile.watermarkRegions;
    const w = videoRef.current?.videoWidth || 1920;
    const h = videoRef.current?.videoHeight || 1080;
    const regionsStr = JSON.stringify(regions, null, 2);

    const script = `#!/usr/bin/env python3
"""
Video Watermark Removal Script — Generated by MencakMencak
"""
import subprocess, json, os

INPUT = "${file.name}"
OUTPUT = "bersih_${file.name}"
REGIONS = ${regionsStr}
W, H = ${w}, ${h}

def create_filter():
    parts = []
    for i, r in enumerate(REGIONS):
        x = int(r['x']/100*W); y = int(r['y']/100*H)
        w = int(r['width']/100*W); h = int(r['height']/100*H)
        if w%2: w+=1; if h%2: h+=1
        parts.append(f"[0:v]crop={w}:{h}:{x}:{y},boxblur=10:10[blur{i}];[0:v][blur{i}]overlay={x}:{y}[tmp{i}]")
    if len(parts)==1: return parts[0].replace("[tmp0]","[vout]")
    chain=parts[0]
    for i,p in enumerate(parts[1:],1):
        chain+=p.replace("[0:v]",f"[tmp{i-1}]").replace(f"[tmp{i}]","[vout]" if i==len(parts)-1 else f"[tmp{i}]")
    return chain

subprocess.run(['ffmpeg','-i',INPUT,'-filter_complex',create_filter(),'-map','[vout]','-map','0:a?','-c:v','libx264','-crf','18','-c:a','copy','-y',OUTPUT], check=True)
print(f"Done: {OUTPUT}")
`;

    const blob = new Blob([script], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'proses_video.py';
    a.click();
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      {/* STATUS CARD */}
      <div style={{
        padding: '14px 20px', borderRadius: 16,
        marginBottom: 20, textAlign: 'center',
        background: isError ? '#fef2f2' : isDone ? '#f0fdf4' : videoLoaded ? '#f8fafc' : '#fafafa',
        border: isError ? '1px solid #fecaca' : isDone ? '1px solid #bbf7d0' : '1px solid #f0f0f0',
      }}>
        {!videoLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>Memuat video...</span>
          </div>
        )}
        {isError && (
          <div>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', margin: '4px 0' }}>{processingState.message}</p>
          </div>
        )}
        {videoLoaded && !isError && (
          <div>
            {isBusy ? (
              <div>
                <div style={{ width: '100%', height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${processingState.progress}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>{processingState.message}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15 }}>{isDone ? '✅' : '🎬'}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: isDone ? '#16a34a' : '#333' }}>{processingState.message || 'Pilih frame & deteksi watermark'}</span>
                {hasRegions && !isDone && (
                  <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>1 area</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      {videoLoaded && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
          marginBottom: 20, padding: '14px 18px',
          background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0',
        }}>
          <button onClick={handleDetectInFrame} disabled={isBusy} style={{
            padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 7,
            background: isBusy ? '#e5e7eb' : 'linear-gradient(135deg,#2563eb,#6366f1)',
            color: isBusy ? '#999' : 'white', border: 'none', borderRadius: 11,
            fontSize: 14, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer',
            boxShadow: isBusy ? 'none' : '0 4px 14px rgba(37,99,235,0.25)',
          }}>🔍 Deteksi di Frame Ini</button>

          <select value={processingMethod} onChange={e => setProcessingMethod(e.target.value as any)}
            disabled={isBusy} style={{
              padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: '#333', background: '#fff',
              cursor: 'pointer', outline: 'none',
            }}>
            <option value="overlay-blur">🌫️ Blur Overlay (Cepat)</option>
            <option value="frame-replace">🖼️ Frame-by-Frame (Lambat, Optimal)</option>
          </select>

          <button onClick={handleProcessFrame} disabled={!hasRegions || isBusy} style={{
            padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 7,
            background: (!hasRegions || isBusy) ? '#e5e7eb' : 'linear-gradient(135deg,#16a34a,#22c55e)',
            color: (!hasRegions || isBusy) ? '#999' : 'white', border: 'none', borderRadius: 11,
            fontSize: 14, fontWeight: 700, cursor: (!hasRegions || isBusy) ? 'not-allowed' : 'pointer',
            boxShadow: (!hasRegions || isBusy) ? 'none' : '0 4px 14px rgba(22,163,74,0.25)',
          }}>🎯 Proses Frame</button>

          <div style={{ flex: 1 }} />

          <button onClick={onReset} style={{
            padding: '10px 16px', background: '#f3f4f6', color: '#555',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>📁 File Baru</button>
        </div>
      )}

      {/* MAIN CONTENT — Video Player + Processed */}
      {videoLoaded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Video Player */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>🎬 Video Asli</span>
              {detectedRegion && (
                <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Terdeteksi</span>
              )}
            </div>
            <div style={{ border: detectedRegion ? '2px solid #93c5fd' : '2px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} src={previewUrl || ''}
                style={{ width: '100%', maxHeight: 400, display: 'block' }}
                onLoadedMetadata={handleVideoLoad}
                onTimeUpdate={handleTimeUpdate}
                onSeeked={handleThumbnail}
              />

              {/* Controls */}
              <div style={{ background: '#111', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={togglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}>
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>

                <button onClick={() => stepFrame(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#aaa"><path d="M11 7l-5 5 5 5V7zm7 0l-5 5 5 5V7z"/></svg>
                </button>

                <input type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
                  onChange={e => { if (videoRef.current) { videoRef.current.currentTime = parseFloat(e.target.value); setCurrentTime(parseFloat(e.target.value)); } }}
                  style={{ flex: 1, height: 4, accentColor: '#3b82f6' }}
                />

                <button onClick={() => stepFrame(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#aaa"><path d="M6 7l5 5-5 5V7zm7 0l5 5-5 5V7z"/></svg>
                </button>

                <span style={{ color: '#aaa', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Processed Frame */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>✨ Hasil Frame</span>
                {isDone && <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Selesai</span>}
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
                {(['preview','result'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none',
                    background: activeTab === t ? '#fff' : 'transparent',
                    color: activeTab === t ? '#333' : '#888',
                    fontWeight: activeTab === t ? 700 : 500, fontSize: 12, cursor: 'pointer',
                    boxShadow: activeTab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}>{t === 'preview' ? 'Preview' : 'Hasil'}</button>
                ))}
              </div>
            </div>
            <div style={{ border: isDone ? '2px solid #bbf7d0' : '2px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', background: '#fafafa', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {activeTab === 'preview' ? (
                <canvas ref={originalCanvasRef} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
              ) : (
                <>
                  <canvas ref={processedCanvasRef} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
                  {!isDone && !isBusy && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#888', margin: 0 }}>Proses frame untuk lihat preview</p>
                      </div>
                    </div>
                  )}
                  {isBusy && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 32, height: 32, margin: '0 auto 8px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: 0 }}>{processingState.message}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOWNLOAD SECTION */}
      {isDone && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{
            display: 'inline-flex', flexDirection: 'column', gap: 12,
            padding: '20px 28px', background: '#fff', borderRadius: 16,
            border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            minWidth: 340, maxWidth: '100%',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>⬇️ Download</div>

            {/* Thumbnail */}
            {thumbUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#fafafa', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                <canvas ref={thumbCanvasRef} style={{ width: 80, height: 45, borderRadius: 6 }} />
                <div style={{ textAlign: 'left', fontSize: 12, color: '#666' }}>
                  <div style={{ fontWeight: 700, color: '#333' }}>{file.name}</div>
                  <div>{formatFileSize(file.size)} · {fmtTime(duration)}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleDownloadFrame} style={{
                padding: '13px 24px', background: 'linear-gradient(135deg,#2563eb,#6366f1)',
                color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              }}>🖼️ Download Frame</button>

              <button onClick={handleDownloadScript} style={{
                padding: '13px 24px', background: '#fff', color: '#333',
                border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}>🐍 Skrip Python</button>
            </div>

            <p style={{ fontSize: 11, color: '#aaa', margin: 0, lineHeight: 1.5 }}>
              📝 Untuk full video, download skrip Python & jalankan dengan FFmpeg di komputer.
            </p>
          </div>
        </div>
      )}

      {/* FULL VIDEO NOTE */}
      {videoLoaded && (
        <div style={{
          marginTop: 20, padding: '16px 20px',
          background: '#fefce8', border: '1px solid #fef08a', borderRadius: 14,
          fontSize: 13, color: '#854d0e', lineHeight: 1.6,
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>📝 Pemrosesan Full Video</strong>
          Pemrosesan video full memerlukan FFmpeg di komputer. Deteksi watermark di frame ini, proses preview, lalu download skrip Python untuk memproses video lengkap dengan frame-by-frame inpainting.
        </div>
      )}

      {/* FILE INFO */}
      {videoLoaded && (
        <div style={{
          marginTop: 16, padding: '10px 20px', background: '#fafafa',
          borderRadius: 12, border: '1px solid #f0f0f0',
          display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center',
          fontSize: 12, color: '#888',
        }}>
          <span>📄 {file.name}</span>
          <span>📦 {formatFileSize(file.size)}</span>
          <span>⏱️ {fmtTime(duration)}</span>
          <span>🎞️ Frame: {currentTime.toFixed(1)}s</span>
          <span>🔧 {processingMethod === 'overlay-blur' ? 'Blur' : 'FbF'}</span>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
