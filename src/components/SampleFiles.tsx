'use client';

import { useState } from 'react';
import { FileType } from '@/types';

interface Props {
  onSelect: (file: File, type: FileType) => void;
}

const SAMPLES: {
  id: string;
  label: string;
  emoji: string;
  colors: [string, string];
  title: string;
  watermark: string;
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  ext: string;
}[] = [
  {
    id: 'sunset',
    label: 'Sunset',
    emoji: '🌅',
    colors: ['#ff7e5f', '#feb47b'],
    title: 'Beautiful Sunset',
    watermark: 'SAMPLE',
    format: 'image/png',
    ext: 'png',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    colors: ['#2193b0', '#6dd5ed'],
    title: 'Ocean View',
    watermark: 'PREVIEW',
    format: 'image/jpeg',
    ext: 'jpg',
  },
  {
    id: 'forest',
    label: 'Forest',
    emoji: '🌲',
    colors: ['#11998e', '#38ef7d'],
    title: 'Forest Landscape',
    watermark: 'DRAFT',
    format: 'image/webp',
    ext: 'webp',
  },
  {
    id: 'purple',
    label: 'Purple',
    emoji: '💜',
    colors: ['#8E2DE2', '#4A00E0'],
    title: 'Night Scene',
    watermark: 'LOGO',
    format: 'image/png',
    ext: 'png',
  },
  {
    id: 'photo',
    label: 'Photo',
    emoji: '📸',
    colors: ['#667eea', '#764ba2'],
    title: 'Portrait Photo',
    watermark: 'COPYRIGHT',
    format: 'image/jpeg',
    ext: 'jpg',
  },
  {
    id: 'nature',
    label: 'Nature',
    emoji: '🏔️',
    colors: ['#f093fb', '#f5576c'],
    title: 'Mountain View',
    watermark: 'WATERMARK',
    format: 'image/webp',
    ext: 'webp',
  },
];

function drawSampleImage(canvas: HTMLCanvasElement, sample: typeof SAMPLES[0]): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, sample.colors[0]);
  grad.addColorStop(1, sample.colors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Decorative circles
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(w * 0.75, h * 0.25, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.2, h * 0.7, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, 40, 0, Math.PI * 2);
  ctx.fill();

  // Title text
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sample.title, w / 2, h * 0.35);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Sample image for testing', w / 2, h * 0.45);

  // Watermark overlay (diagonal)
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.25);
  ctx.fillText(sample.watermark, -120, -40);
  ctx.fillText(sample.watermark, 20, 30);
  ctx.fillText(sample.watermark, -80, 90);
  ctx.restore();

  // Bottom right watermark
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`© ${sample.watermark} Watermark`, w - 20, h - 20);

  // Bottom left badge
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.roundRect(16, h - 44, 90, 28, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sample.ext.toUpperCase(), 61, h - 30);
}

export default function SampleFiles({ onSelect }: Props) {
  const [genId, setGenId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleSample = async (sample: typeof SAMPLES[0]) => {
    setGenId(sample.id);
    setErrorId(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;

      drawSampleImage(canvas, sample);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob failed'));
        }, sample.format, 0.92);
      });

      const file = new File([blob], `${sample.id}.${sample.ext}`, {
        type: sample.format,
      });

      const fileType: FileType = 'image';
      onSelect(file, fileType);
    } catch (e: any) {
      console.error('Sample generation error:', e);
      setErrorId(sample.id);
    }
    setGenId(null);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: 500,
      }}>
        No file? Try one of these samples:
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 8,
      }}>
        {SAMPLES.map((sample) => {
          const isGen = genId === sample.id;
          const isErr = errorId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => handleSample(sample)}
              disabled={genId !== null}
              style={{
                padding: '12px 10px',
                border: isErr ? '1px solid #fecaca' : '1px solid #e5e7eb',
                borderRadius: 12,
                background: isErr ? '#fef2f2' : '#fff',
                cursor: genId ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: genId && genId !== sample.id ? 0.5 : 1,
                transition: 'all 0.15s',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!genId) {
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.background = '#eff6ff';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isErr ? '#fecaca' : '#e5e7eb';
                e.currentTarget.style.background = isErr ? '#fef2f2' : '#fff';
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{sample.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
                  {isGen ? 'Generating...' : isErr ? 'Error!' : sample.label}
                </div>
                <div style={{ fontSize: 10, color: isErr ? '#dc2626' : '#aaa' }}>
                  {isErr ? 'Retry' : `${sample.ext.toUpperCase()} · ${sample.watermark}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
