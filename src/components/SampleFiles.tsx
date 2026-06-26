'use client';

import { useState, useRef } from 'react';
import { FileType } from '@/types';

interface Props {
  onSelect: (file: File, type: FileType) => void;
}

// Generate sample watermarked images using Canvas
function generateSampleImage(
  bgColor: string,
  text: string,
  watermarkText: string,
  format: 'png' | 'jpg' | 'webp'
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    if (bgColor === 'sunset') {
      gradient.addColorStop(0, '#ff7e5f');
      gradient.addColorStop(1, '#feb47b');
    } else if (bgColor === 'ocean') {
      gradient.addColorStop(0, '#2193b0');
      gradient.addColorStop(1, '#6dd5ed');
    } else if (bgColor === 'forest') {
      gradient.addColorStop(0, '#11998e');
      gradient.addColorStop(1, '#38ef7d');
    } else if (bgColor === 'purple') {
      gradient.addColorStop(0, '#8E2DE2');
      gradient.addColorStop(1, '#4A00E0');
    } else {
      gradient.addColorStop(0, '#f5f5f5');
      gradient.addColorStop(1, '#e0e0e0');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    // Decorative shapes
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(600, 150, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(200, 400, 80, 0, Math.PI * 2);
    ctx.fill();

    // Main text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 400, 280);

    // Watermark overlay
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.save();
    ctx.translate(400, 300);
    ctx.rotate(-0.3);
    ctx.fillText(watermarkText, -150, 0);
    ctx.fillText(watermarkText, 50, 60);
    ctx.fillText(watermarkText, -100, 120);
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('© Sample Watermark', 780, 580);

    const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const ext = format;
    canvas.toBlob((blob) => {
      const file = new File([blob!], `sample-${bgColor}.${ext}`, { type: mime });
      resolve(file);
    }, mime, 0.9);
  });
}

const SAMPLES = [
  {
    id: 'sunset-png',
    label: 'Sunset PNG',
    emoji: '🌅',
    bgColor: 'sunset',
    text: 'Beautiful Sunset',
    watermarkText: 'SAMPLE',
    format: 'png' as const,
    type: 'image' as FileType,
  },
  {
    id: 'ocean-jpg',
    label: 'Ocean JPG',
    emoji: '🌊',
    bgColor: 'ocean',
    text: 'Ocean View',
    watermarkText: 'PREVIEW',
    format: 'jpg' as const,
    type: 'image' as FileType,
  },
  {
    id: 'forest-webp',
    label: 'Forest WEBP',
    emoji: '🌲',
    bgColor: 'forest',
    text: 'Forest Landscape',
    watermarkText: 'DRAFT',
    format: 'webp' as const,
    type: 'image' as FileType,
  },
  {
    id: 'purple-png',
    label: 'Purple PNG',
    emoji: '💜',
    bgColor: 'purple',
    text: 'Night Scene',
    watermarkText: 'LOGO',
    format: 'png' as const,
    type: 'image' as FileType,
  },
];

export default function SampleFiles({ onSelect }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSample = async (sample: typeof SAMPLES[0]) => {
    setLoadingId(sample.id);
    try {
      const file = await generateSampleImage(
        sample.bgColor,
        sample.text,
        sample.watermarkText,
        sample.format
      );
      onSelect(file, sample.type);
    } catch (e) {
      console.error('Sample generation failed:', e);
    }
    setLoadingId(null);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 12 }}>
        No file? Try one of these samples:
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8,
      }}>
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            onClick={() => handleSample(sample)}
            disabled={loadingId !== null}
            style={{
              padding: '14px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: loadingId && loadingId !== sample.id ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#93c5fd';
              e.currentTarget.style.background = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = '#fff';
            }}
          >
            <span style={{ fontSize: 22 }}>{sample.emoji}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                {loadingId === sample.id ? '⏳ Generating...' : sample.label}
              </div>
              <div style={{ fontSize: 10, color: '#aaa' }}>
                {sample.format.toUpperCase()} · {sample.watermarkText}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
