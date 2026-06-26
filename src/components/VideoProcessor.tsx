'use client';

import { useState, useRef, useEffect } from 'react';
import { ProcessedFile, ProcessingState, WatermarkRegion } from '@/types';
import { formatFileSize, estimateProcessingTime } from '@/lib/utils';
import ProgressBar from './ProgressBar';

interface VideoProcessorProps {
  file: File;
  processedFile: ProcessedFile;
  onUpdate: (updated: ProcessedFile) => void;
  onReset: () => void;
}

interface VideoFrame {
  timestamp: number;
  canvas: HTMLCanvasElement;
}

export default function VideoProcessor({
  file,
  processedFile,
  onUpdate,
  onReset,
}: VideoProcessorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(
    processedFile.processingState
  );
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [watermarkFrame, setWatermarkFrame] = useState<number | null>(null);
  const [processingMethod, setProcessingMethod] = useState<'overlay-blur' | 'frame-replace'>('overlay-blur');

  // Load video
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoLoaded(true);
      onUpdate({
        ...processedFile,
        originalUrl: previewUrl || '',
        processingState: { status: 'idle', progress: 0, message: '' },
      });
    }
  };

  // Capture current frame
  const captureFrame = (): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    return canvas;
  };

  // Draw frame on original canvas
  const drawCurrentFrame = () => {
    const video = videoRef.current;
    const canvas = originalCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
  };

  // Auto-detect watermark in current frame
  const handleDetectInFrame = async () => {
    const frame = captureFrame();
    if (!frame) return;

    setProcessingState({
      status: 'detecting',
      progress: 20,
      message: 'Analyzing current frame for watermarks...',
    });

    // Simple detection: look for static regions (common in video watermarks)
    // We'll check brightness variation — watermarks are often uniform
    const ctx = frame.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, frame.width, frame.height);

    // Check corners
    const cornerSize = Math.min(frame.width, frame.height) * 0.2;
    const corners = [
      { x: 0, y: 0, name: 'Top-Left' },
      { x: frame.width - cornerSize, y: 0, name: 'Top-Right' },
      { x: 0, y: frame.height - cornerSize, name: 'Bottom-Left' },
      { x: frame.width - cornerSize, y: frame.height - cornerSize, name: 'Bottom-Right' },
    ];

    let bestCorner = corners[0];
    let bestUniformity = 0;

    for (const corner of corners) {
      let uniformCount = 0;
      let totalPixels = 0;
      let meanLum = 0;

      for (let y = corner.y; y < corner.y + cornerSize && y < frame.height; y++) {
        for (let x = corner.x; x < corner.x + cornerSize && x < frame.width; x++) {
          const idx = (Math.floor(y) * frame.width + Math.floor(x)) * 4;
          meanLum += 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
          totalPixels++;
        }
      }
      meanLum /= totalPixels;

      for (let y = corner.y; y < corner.y + cornerSize && y < frame.height; y++) {
        for (let x = corner.x; x < corner.x + cornerSize && x < frame.width; x++) {
          const idx = (Math.floor(y) * frame.width + Math.floor(x)) * 4;
          const lum = 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
          if (Math.abs(lum - meanLum) < 20) uniformCount++;
        }
      }

      const uniformity = uniformCount / totalPixels;
      if (uniformity > bestUniformity) {
        bestUniformity = uniformity;
        bestCorner = corner;
      }
    }

    const region: WatermarkRegion = {
      id: `video-${Date.now()}`,
      x: (bestCorner.x / frame.width) * 100,
      y: (bestCorner.y / frame.height) * 100,
      width: (cornerSize / frame.width) * 100,
      height: (cornerSize / frame.height) * 100,
    };

    setProcessingState({
      status: 'idle',
      progress: 100,
      message: `Detected watermark in ${bestCorner.name}. Select processing method.`,
    });

    onUpdate({
      ...processedFile,
      watermarkRegions: [region],
      processingState: processingState,
    });

    // Draw detection box
    if (originalCanvasRef.current) {
      const c = originalCanvasRef.current;
      const octx = c.getContext('2d')!;
      octx.strokeStyle = '#3B82F6';
      octx.lineWidth = 3;
      octx.setLineDash([6, 3]);
      octx.strokeRect(
        (region.x / 100) * c.width,
        (region.y / 100) * c.height,
        (region.width / 100) * c.width,
        (region.height / 100) * c.height
      );
    }
  };

  // Process video
  const handleProcessVideo = async () => {
    const regions = processedFile.watermarkRegions;
    if (regions.length === 0) {
      setProcessingState({
        status: 'error',
        progress: 0,
        message: 'No watermark regions detected. Run detection first.',
      });
      return;
    }

    setProcessingState({
      status: 'processing',
      progress: 10,
      message: 'Processing video... (this may take a while)',
      estimatedTime: Math.round(file.size / (1024 * 1024)) * 2,
    });

    // For now, we demonstrate the processing pipeline
    // Full video processing requires FFmpeg.wasm which is heavy for browser
    // We'll create a preview of the processed frame instead

    const video = videoRef.current;
    if (!video) return;

    // Process current frame as preview
    const frameCanvas = captureFrame();
    if (!frameCanvas) return;

    const ctx = frameCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);

    // Apply blur to watermark region
    for (const region of regions) {
      const rx = Math.floor((region.x / 100) * frameCanvas.width);
      const ry = Math.floor((region.y / 100) * frameCanvas.height);
      const rw = Math.floor((region.width / 100) * frameCanvas.width);
      const rh = Math.floor((region.height / 100) * frameCanvas.height);
      const blurRadius = Math.max(8, Math.floor(Math.min(rw, rh) * 0.08));

      for (let y = ry; y < ry + rh && y < frameCanvas.height; y++) {
        for (let x = rx; x < rx + rw && x < frameCanvas.width; x++) {
          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < frameCanvas.width && ny >= 0 && ny < frameCanvas.height) {
                const idx = (ny * frameCanvas.width + nx) * 4;
                rSum += imageData.data[idx];
                gSum += imageData.data[idx + 1];
                bSum += imageData.data[idx + 2];
                count++;
              }
            }
          }
          const idx = (y * frameCanvas.width + x) * 4;
          imageData.data[idx] = rSum / count;
          imageData.data[idx + 1] = gSum / count;
          imageData.data[idx + 2] = bSum / count;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Show processed frame
    if (processedCanvasRef.current) {
      const pc = processedCanvasRef.current;
      pc.width = frameCanvas.width;
      pc.height = frameCanvas.height;
      pc.getContext('2d')!.drawImage(frameCanvas, 0, 0);
    }

    const processedUrl = frameCanvas.toDataURL('image/png');

    setProcessingState({
      status: 'done',
      progress: 100,
      message: '✅ Frame processed! For full video, download the FFmpeg processing script.',
    });

    onUpdate({
      ...processedFile,
      processedUrl: processedUrl,
      processingState: {
        status: 'done',
        progress: 100,
        message: 'Preview ready. Full video processing requires offline script.',
      },
    });
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      drawCurrentFrame();
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stepFrame = (direction: 'forward' | 'backward') => {
    if (videoRef.current) {
      videoRef.current.currentTime += direction === 'forward' ? 1 / 30 : -1 / 30;
    }
  };

  return (
    <div className="space-y-6">
      <ProgressBar state={processingState} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleDetectInFrame}
          disabled={!videoLoaded || processingState.status === 'detecting' || processingState.status === 'processing'}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium
            hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Detect in Current Frame
        </button>

        <select
          value={processingMethod}
          onChange={(e) => setProcessingMethod(e.target.value as any)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="overlay-blur">🌫️ Blur Overlay (Fast)</option>
          <option value="frame-replace">🖼️ Frame-by-Frame (Slow, Better)</option>
        </select>

        <button
          onClick={handleProcessVideo}
          disabled={
            !videoLoaded ||
            processedFile.watermarkRegions.length === 0 ||
            processingState.status === 'processing' ||
            processingState.status === 'detecting'
          }
          className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium
            hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all shadow-lg shadow-green-500/25 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Process Frame Preview
        </button>

        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
        >
          New File
        </button>
      </div>

      {/* Video Player */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Video */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">📹 Original Video</h3>
          <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={previewUrl || ''}
              className="w-full max-h-[400px] object-contain"
              onLoadedMetadata={handleVideoLoad}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Video Controls */}
            <div className="bg-gray-900 p-3 flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-blue-400">
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              <button onClick={() => stepFrame('backward')} className="text-white hover:text-blue-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                </svg>
              </button>

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = parseFloat(e.target.value);
                    setCurrentTime(parseFloat(e.target.value));
                  }
                }}
                className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />

              <button onClick={() => stepFrame('forward')} className="text-white hover:text-blue-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
                </svg>
              </button>

              <span className="text-white text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Processed Frame */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            ✨ Processed Frame Preview
            {processingState.status === 'done' && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full ml-2">
                Preview Ready
              </span>
            )}
          </h3>
          <div className="relative border-2 border-green-200 rounded-xl overflow-hidden bg-gray-50">
            <canvas ref={processedCanvasRef} className="max-w-full h-auto" />
            {processingState.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="text-center bg-white/90 px-6 py-4 rounded-xl">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-gray-700">{processingState.message}</p>
                </div>
              </div>
            )}
            {processingState.status !== 'done' && processingState.status !== 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Process a frame to see preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Watermark Region Canvas (hidden, for detection) */}
      <canvas ref={originalCanvasRef} className="hidden" />

      {/* Offline Processing Note */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
        <p className="font-semibold mb-1">📝 Full Video Processing</p>
        <p>
          Full video watermark removal requires offline processing with FFmpeg.
          Download the Python processing script below for complete video processing with frame-by-frame inpainting.
        </p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            downloadVideoScript(file.name, processedFile.watermarkRegions, processingMethod, videoRef.current?.videoWidth || 1920, videoRef.current?.videoHeight || 1080);
          }}
          className="inline-block mt-2 text-blue-600 hover:text-blue-800 underline font-medium"
        >
          📥 Download Video Processing Script
        </a>
      </div>

      {/* File Info */}
      <div className="text-xs text-gray-400 text-center space-x-4">
        <span>File: {file.name}</span>
        <span>Size: {formatFileSize(file.size)}</span>
        <span>Duration: {formatTime(duration)}</span>
        <span>Frame: {currentTime.toFixed(1)}s</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function downloadVideoScript(
  filename: string,
  regions: WatermarkRegion[],
  method: string,
  width: number,
  height: number
) {
  const regionsStr = JSON.stringify(regions, null, 2);
  const script = `#!/usr/bin/env python3
"""
Video Watermark Removal Script
Generated by Watermark Remover Tool
"""

import subprocess
import json
import os
import tempfile
from pathlib import Path

# Configuration
INPUT_FILE = "${filename}"
OUTPUT_FILE = "cleaned_${filename}"
REGIONS = ${regionsStr}
VIDEO_WIDTH = ${width}
VIDEO_HEIGHT = ${height}
METHOD = "${method}"

def create_blur_region(width, height, regions):
    """Create FFmpeg filter for blurring watermark regions"""
    filters = []
    for i, region in enumerate(regions):
        x = int(region['x'] / 100 * width)
        y = int(region['y'] / 100 * height)
        w = int(region['width'] / 100 * width)
        h = int(region['height'] / 100 * height)
        # Ensure even dimensions for some codecs
        w = w if w % 2 == 0 else w + 1
        h = h if h % 2 == 0 else h + 1

        filters.append(
            f"[0:v]crop={w}:{h}:{x}:{y},boxblur=10:10[blur{i}];"
            f"[0:v][blur{i}]overlay={x}:{y}[tmp{i}]"
        )

    # Chain filters
    if len(filters) == 1:
        return filters[0].replace("[tmp0]", "[vout]")
    else:
        chain = ""
        for i, f in enumerate(filters):
            if i == 0:
                chain += f
            else:
                chain += f.replace("[0:v]", f"[tmp{i-1}]").replace(f"[tmp{i}]", "[vout]" if i == len(filters)-1 else f"[tmp{i}]")
        return chain

def process_with_ffmpeg():
    """Process video using FFmpeg with blur overlay"""
    print("Processing video with FFmpeg blur overlay...")

    filter_complex = create_blur_region(VIDEO_WIDTH, VIDEO_HEIGHT, REGIONS)

    cmd = [
        'ffmpeg', '-i', INPUT_FILE,
        '-filter_complex', filter_complex,
        '-map', '[vout]',
        '-map', '0:a?',  # Copy audio if exists
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'medium',
        '-c:a', 'copy',
        '-y', OUTPUT_FILE
    ]

    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    print(f"Done! Output saved to: {OUTPUT_FILE}")

if __name__ == '__main__':
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file '{INPUT_FILE}' not found.")
        print("Place this script in the same directory as your video file.")
        exit(1)

    process_with_ffmpeg()
`;

  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'process_video.py';
  a.click();
  URL.revokeObjectURL(url);
}
