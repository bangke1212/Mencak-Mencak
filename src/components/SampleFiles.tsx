'use client';

import { useState, useRef } from 'react';
import { FileType } from '@/types';

interface Props {
  onSelect: (file: File, type: FileType) => void;
  activeTab?: 'images' | 'videos';
}

/* ============================================================
   GENERATE SAMPLE IMAGES via Canvas
   ============================================================ */
const IMAGE_SAMPLES = [
  { id: 'sunset',  emoji: '🌅', colors: ['#ff7e5f','#feb47b'], label: 'Sunset PNG',        wm: 'SAMPLE',      fmt: 'image/png'  as const, ext: 'png'  },
  { id: 'ocean',   emoji: '🌊', colors: ['#2193b0','#6dd5ed'], label: 'Ocean JPG',         wm: 'PREVIEW',     fmt: 'image/jpeg' as const, ext: 'jpg'  },
  { id: 'forest',  emoji: '🌲', colors: ['#11998e','#38ef7d'], label: 'Forest WEBP',       wm: 'DRAFT',       fmt: 'image/webp' as const, ext: 'webp' },
  { id: 'purple',  emoji: '💜', colors: ['#8E2DE2','#4A00E0'], label: 'Purple PNG',        wm: 'LOGO',        fmt: 'image/png'  as const, ext: 'png'  },
  { id: 'photo',   emoji: '📸', colors: ['#667eea','#764ba2'], label: 'Photo JPEG',        wm: 'COPYRIGHT',   fmt: 'image/jpeg' as const, ext: 'jpeg' },
  { id: 'nature',  emoji: '🏔️', colors: ['#f5576c','#f093fb'], label: 'Nature BMP',        wm: 'WATERMARK',   fmt: 'image/bmp'  as const, ext: 'bmp'  },
  { id: 'heic',    emoji: '📱', colors: ['#f7971e','#ffd200'], label: 'Phone HEIC',        wm: 'SAMPLE',      fmt: 'image/heic' as const, ext: 'heic' },
  { id: 'svg',     emoji: '🎨', colors: ['#ee0979','#ff6a00'], label: 'Vector SVG',        wm: 'PREVIEW',     fmt: 'image/svg+xml' as const, ext: 'svg' },
  { id: 'gif',     emoji: '🖼️', colors: ['#00b09b','#96c93d'], label: 'Animated GIF',      wm: 'DRAFT',       fmt: 'image/gif'  as const, ext: 'gif'  },
  { id: 'avif',    emoji: '🆕', colors: ['#fc4a1a','#f7b733'], label: 'New AVIF',          wm: 'LOGO',        fmt: 'image/avif' as const, ext: 'avif' },
  { id: 'tiff',    emoji: '🖨️', colors: ['#4facfe','#00f2fe'], label: 'Print TIFF',        wm: 'COPYRIGHT',   fmt: 'image/tiff' as const, ext: 'tiff' },
  { id: 'ico',     emoji: '🔷', colors: ['#a18cd1','#fbc2eb'], label: 'Icon ICO',          wm: 'WM',          fmt: 'image/x-icon' as const, ext: 'ico' },
];

function drawSampleImage(canvas: HTMLCanvasElement, s: typeof IMAGE_SAMPLES[0]): void {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, s.colors[0]); g.addColorStop(1, s.colors[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.arc(w*0.75, h*0.25, 100, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.2, h*0.7, 70, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 40px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.label, w/2, h*0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 56px Inter,sans-serif';
  ctx.save(); ctx.translate(w/2, h/2); ctx.rotate(-0.25);
  ctx.fillText(s.wm, -130, -40); ctx.fillText(s.wm, 30, 30); ctx.fillText(s.wm, -90, 90);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '13px Inter,sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(`© ${s.wm}`, w-20, h-20);
}

async function canvasToFile(canvas: HTMLCanvasElement, name: string, mime: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(new File([b], name, { type: mime }));
      else reject(new Error('Canvas toBlob failed'));
    }, mime, 0.92);
  });
}

/* ============================================================
   GENERATE SAMPLE VIDEOS via Canvas + MediaRecorder
   ============================================================ */
const VIDEO_SAMPLES = [
  { id: 'vid-sample',   emoji: '🎬', colors: ['#667eea','#764ba2'], label: 'Sample Clip',     wm: 'SAMPLE',     duration: 3 },
  { id: 'vid-preview',  emoji: '🎥', colors: ['#f5576c','#f093fb'], label: 'Preview Clip',   wm: 'PREVIEW',    duration: 3 },
  { id: 'vid-draft',    emoji: '📹', colors: ['#11998e','#38ef7d'], label: 'Draft Clip',      wm: 'DRAFT',      duration: 3 },
];

function generateVideoSample(sample: typeof VIDEO_SAMPLES[0]): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const fps = 24;
    const totalFrames = sample.duration * fps;
    let frame = 0;

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
      videoBitsPerSecond: 1500000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const file = new File([blob], `${sample.id}.webm`, { type: recorder.mimeType });
      resolve(file);
    };
    recorder.onerror = (e) => reject(e);

    recorder.start();

    function drawFrame() {
      const w = canvas.width, h = canvas.height;
      const progress = frame / totalFrames;

      // Animated background
      const hueShift = (sample.colors[0] === '#667eea') ? 0 : progress * 30;
      const xOff = Math.sin(progress * Math.PI * 2) * 30;
      const g = ctx.createLinearGradient(xOff, 0, w + xOff, h);
      g.addColorStop(0, sample.colors[0]); g.addColorStop(1, sample.colors[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // Floating circles
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 5; i++) {
        const cx = w * 0.3 + Math.cos(progress * Math.PI * 2 + i * 1.2) * 100;
        const cy = h * 0.4 + Math.sin(progress * Math.PI * 2 + i * 0.8) * 60;
        ctx.beginPath(); ctx.arc(cx, cy, 40 + i * 15, 0, Math.PI * 2); ctx.fill();
      }

      // Title
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 36px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sample.label, w/2, h*0.35);

      // Frame counter
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '16px Inter,sans-serif';
      ctx.fillText(`00:0${Math.floor(progress * sample.duration)}`, w/2, h*0.48);

      // Watermark diagonal
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = 'bold 48px Inter,sans-serif';
      ctx.save(); ctx.translate(w/2, h/2); ctx.rotate(-0.25);
      ctx.fillText(sample.wm, -100, -20); ctx.fillText(sample.wm, 30, 40);
      ctx.restore();

      // Bottom corner
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '12px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`© ${sample.wm} Watermark`, w-16, h-16);

      // Bottom badge
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.roundRect(16, h-36, 70, 22, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 11px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('WEBM', 51, h-22);

      frame++;
      if (frame < totalFrames) {
        requestAnimationFrame(drawFrame);
      } else {
        recorder.stop();
      }
    }

    drawFrame();
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export default function SampleFiles({ onSelect, activeTab = 'images' }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleImage = async (s: typeof IMAGE_SAMPLES[0]) => {
    setLoadingId(s.id); setErrorId(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800; canvas.height = 600;
      drawSampleImage(canvas, s);
      const file = await canvasToFile(canvas, `${s.id}.${s.ext}`, s.fmt);
      onSelect(file, 'image');
    } catch {
      setErrorId(s.id);
    }
    setLoadingId(null);
  };

  const handleVideo = async (s: typeof VIDEO_SAMPLES[0]) => {
    setLoadingId(s.id); setErrorId(null);
    try {
      const file = await generateVideoSample(s);
      onSelect(file, 'video');
    } catch {
      setErrorId(s.id);
    }
    setLoadingId(null);
  };

  const btnStyle = (isErr: boolean): React.CSSProperties => ({
    padding: '12px 10px',
    border: isErr ? '1px solid #fecaca' : '1px solid #e5e7eb',
    borderRadius: 12,
    background: isErr ? '#fef2f2' : '#fff',
    cursor: loadingId ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    opacity: loadingId ? 0.5 : 1,
    transition: 'all 0.15s',
    textAlign: 'left' as const,
    width: '100%',
  });

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 6, fontWeight: 500 }}>
        Tidak ada file? Coba sample ini:
      </p>

      {/* --- IMAGE SAMPLES --- */}
      {activeTab === 'images' && (
      <>
      <p style={{ fontSize: 11, color: '#bbb', marginBottom: 6, fontWeight: 600 }}>🖼️ Gambar</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 8,
        marginBottom: 12,
      }}>
        {IMAGE_SAMPLES.map((s) => {
          const isGen = loadingId === s.id;
          const isErr = errorId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleImage(s)}
              disabled={loadingId !== null}
              style={{
                ...btnStyle(isErr),
                opacity: loadingId && loadingId !== s.id ? 0.5 : 1,
                cursor: loadingId ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loadingId) { e.currentTarget.style.borderColor='#93c5fd'; e.currentTarget.style.background='#eff6ff'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor=isErr?'#fecaca':'#e5e7eb'; e.currentTarget.style.background=isErr?'#fef2f2':'#fff'; }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{s.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
                  {isGen ? 'Generating...' : isErr ? 'Error' : s.label}
                </div>
                <div style={{ fontSize: 10, color: isErr ? '#dc2626' : '#aaa' }}>
                  {isErr ? 'Retry' : `${s.ext.toUpperCase()} · ${s.wm}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </>
      )}

      {/* --- VIDEO SAMPLES --- */}
      {activeTab === 'videos' && (
      <>
      <p style={{ fontSize: 11, color: '#bbb', marginBottom: 6, fontWeight: 600 }}>🎬 Video</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 8,
      }}>
        {VIDEO_SAMPLES.map((s) => {
          const isGen = loadingId === s.id;
          const isErr = errorId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleVideo(s)}
              disabled={loadingId !== null}
              style={{
                ...btnStyle(isErr),
                opacity: loadingId && loadingId !== s.id ? 0.5 : 1,
                cursor: loadingId ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loadingId) { e.currentTarget.style.borderColor='#93c5fd'; e.currentTarget.style.background='#eff6ff'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor=isErr?'#fecaca':'#e5e7eb'; e.currentTarget.style.background=isErr?'#fef2f2':'#fff'; }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{s.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
                  {isGen ? 'Rendering...' : isErr ? 'Error' : s.label}
                </div>
                <div style={{ fontSize: 10, color: isErr ? '#dc2626' : '#aaa' }}>
                  {isErr ? 'Retry' : `WEBM · ${s.wm} · ${s.duration}s`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
