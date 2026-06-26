'use client';

import { useState, useRef, useEffect } from 'react';
import { ProcessedFile, ProcessingState, WatermarkRegion, DetectedWatermark } from '@/types';
import { detectWatermarksFromImage, detectionsToRegions } from '@/lib/watermark-detector';
import {
  blurWatermarkClientSide,
  contentAwareFillClientSide,
  createMaskFromRegions,
} from '@/lib/inpainting';
import { formatFileSize, estimateProcessingTime } from '@/lib/utils';
import ProgressBar from './ProgressBar';
import ComparisonView from './ComparisonView';

interface ImageProcessorProps {
  file: File;
  processedFile: ProcessedFile;
  onUpdate: (updated: ProcessedFile) => void;
  onReset: () => void;
}

type InpaintMethod = 'ai-inpainting' | 'content-aware' | 'blur';

export default function ImageProcessor({
  file,
  processedFile,
  onUpdate,
  onReset,
}: ImageProcessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(
    processedFile.processingState
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 });
  const [inpaintMethod, setInpaintMethod] = useState<InpaintMethod>('ai-inpainting');
  const [detectionConfidence, setDetectionConfidence] = useState(0.35);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load the image from the File object directly
  useEffect(() => {
    if (!file) return;
    
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      imgRef.current = img;
      setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });

      // Draw original on canvas
      if (originalCanvasRef.current) {
        const canvas = originalCanvasRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
      }

      setPreviewUrl(objectUrl);
      setImageLoaded(true);

      const updateState: ProcessingState = { status: 'idle', progress: 0, message: 'Ready' };
      setProcessingState(updateState);
      onUpdate({ ...processedFile, processingState: updateState, originalUrl: objectUrl });
    };
    
    img.onerror = (e) => {
      console.error('Image load error:', e);
      setProcessingState({ status: 'error', progress: 0, message: 'Failed to load image. Please try again.' });
    };
    
    img.src = objectUrl;
    
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Auto-detect watermarks
  const handleAutoDetect = async () => {
    if (!imgRef.current || !originalCanvasRef.current) return;

    setProcessingState({
      status: 'detecting',
      progress: 10,
      message: 'Scanning for watermarks...',
    });

    // Small delay to show status
    await new Promise((r) => setTimeout(r, 300));

    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const detections = await detectWatermarksFromImage(imageData);

      setProcessingState({
        status: 'detecting',
        progress: 50,
        message: `Found ${detections.length} potential watermarks`,
      });

      const regions = detectionsToRegions(
        detections.filter((d) => d.confidence >= detectionConfidence),
        canvas.width,
        canvas.height
      );

      // Draw detection boxes on canvas
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = canvas.width;
      displayCanvas.height = canvas.height;
      const displayCtx = displayCanvas.getContext('2d')!;
      displayCtx.drawImage(imgRef.current!, 0, 0);

      // Draw detection boxes
      for (const det of detections) {
        if (det.confidence >= detectionConfidence) {
          displayCtx.strokeStyle = '#3B82F6';
          displayCtx.lineWidth = 3;
          displayCtx.setLineDash([6, 3]);
          displayCtx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height);

          // Label
          displayCtx.fillStyle = '#3B82F6';
          displayCtx.font = 'bold 14px sans-serif';
          const label = `${det.label} (${Math.round(det.confidence * 100)}%)`;
          const textWidth = displayCtx.measureText(label).width;
          displayCtx.fillRect(det.bbox.x, det.bbox.y - 24, textWidth + 12, 22);
          displayCtx.fillStyle = 'white';
          displayCtx.fillText(label, det.bbox.x + 6, det.bbox.y - 7);
        }
      }

      if (canvasRef.current) {
        const displayC = canvasRef.current;
        displayC.width = canvas.width;
        displayC.height = canvas.height;
        displayC.getContext('2d')!.drawImage(displayCanvas, 0, 0);
      }

      setProcessingState({
        status: 'idle',
        progress: 100,
        message: regions.length > 0
          ? `Detected ${regions.length} watermark region(s). Ready to remove.`
          : 'No watermarks detected. Try manual selection or adjust sensitivity.',
      });

      onUpdate({
        ...processedFile,
        detectedWatermarks: detections,
        watermarkRegions: regions,
        processingState: processingState,
      });
    } catch (error: any) {
      setProcessingState({
        status: 'error',
        progress: 0,
        message: `Detection failed: ${error.message}`,
      });
    }
  };

  // Remove watermarks
  const handleRemoveWatermarks = async () => {
    if (!imgRef.current || !originalCanvasRef.current) return;

    const regions = processedFile.watermarkRegions;
    if (regions.length === 0) {
      setProcessingState({
        status: 'error',
        progress: 0,
        message: 'No watermark regions selected. Run detection or select manually first.',
      });
      return;
    }

    const estTime = estimateProcessingTime(file.size, 'image', regions);
    setProcessingState({
      status: 'removing',
      progress: 10,
      message: 'Preparing mask and processing...',
      estimatedTime: estTime,
    });

    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Try AI inpainting API first
    if (inpaintMethod === 'ai-inpainting') {
      try {
        setProcessingState({
          status: 'removing',
          progress: 25,
          message: 'Using AI inpainting (LaMa model)...',
          estimatedTime: estTime,
        });

        const maskData = createMaskFromRegions(canvas.width, canvas.height, regions);
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        maskCanvas.getContext('2d')!.putImageData(maskData, 0, 0);
        const maskBase64 = maskCanvas.toDataURL('image/png');

        const imageBase64 = canvas.toDataURL('image/png');

        setProcessingState({
          status: 'removing',
          progress: 40,
          message: 'Calling AI inpainting API...',
          estimatedTime: estTime,
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        const response = await fetch('/api/inpaint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            maskBase64,
            mode: 'auto',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const result = await response.json();

        if (result.success && result.resultBase64) {
          // AI inpainting succeeded
          const resultImg = new Image();
          resultImg.onload = () => {
            if (canvasRef.current) {
              const rc = canvasRef.current;
              rc.width = resultImg.naturalWidth;
              rc.height = resultImg.naturalHeight;
              rc.getContext('2d')!.drawImage(resultImg, 0, 0);
            }

            setProcessingState({
              status: 'done',
              progress: 100,
              message: '✅ Watermarks removed with AI inpainting!',
            });

            const processedUrl = result.resultBase64;
            onUpdate({
              ...processedFile,
              processedUrl,
              processingState: { status: 'done', progress: 100, message: '✅ Watermarks removed!' },
            });
          };
          resultImg.src = result.resultBase64;
          return;
        }
      } catch (apiError) {
        console.warn('AI inpainting failed, falling back to client-side:', apiError);
      }
    }

    // Fallback to client-side processing
    setProcessingState({
      status: 'removing',
      progress: 60,
      message: `Using ${inpaintMethod === 'blur' ? 'blur' : 'content-aware fill'} method...`,
      estimatedTime: 2,
    });

    await new Promise((r) => setTimeout(r, 100));

    let processedData: ImageData;
    if (inpaintMethod === 'blur') {
      processedData = blurWatermarkClientSide(imageData, regions);
    } else {
      processedData = contentAwareFillClientSide(imageData, regions);
    }

    setProcessingState({
      status: 'removing',
      progress: 85,
      message: 'Generating output...',
      estimatedTime: 1,
    });

    // Draw result
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    resultCanvas.getContext('2d')!.putImageData(processedData, 0, 0);

    if (canvasRef.current) {
      const rc = canvasRef.current;
      rc.width = canvas.width;
      rc.height = canvas.height;
      rc.getContext('2d')!.putImageData(processedData, 0, 0);
    }

    const resultUrl = resultCanvas.toDataURL('image/png');

    setProcessingState({
      status: 'done',
      progress: 100,
      message: '✅ Watermarks removed!',
    });

    onUpdate({
      ...processedFile,
      processedUrl: resultUrl,
      processingState: { status: 'done', progress: 100, message: '✅ Watermarks removed!' },
    });
  };

  // Manual region selection via canvas click/drag
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    setIsSelecting(true);
    setSelectionStart({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;

    const region: WatermarkRegion = {
      id: `manual-${Date.now()}`,
      x: (Math.min(selectionStart.x, endX) / canvas.width) * 100,
      y: (Math.min(selectionStart.y, endY) / canvas.height) * 100,
      width: (Math.abs(endX - selectionStart.x) / canvas.width) * 100,
      height: (Math.abs(endY - selectionStart.y) / canvas.height) * 100,
    };

    const newRegions = [...processedFile.watermarkRegions, region];
    onUpdate({ ...processedFile, watermarkRegions: newRegions });

    // Redraw with selection
    redrawOriginalWithRegions(newRegions);
  };

  const redrawOriginalWithRegions = (regions: WatermarkRegion[]) => {
    const canvas = originalCanvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imgRef.current, 0, 0);

    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    for (const region of regions) {
      ctx.strokeRect(
        (region.x / 100) * canvas.width,
        (region.y / 100) * canvas.height,
        (region.width / 100) * canvas.width,
        (region.height / 100) * canvas.height
      );
    }
  };

  const clearRegions = () => {
    const newRegions: WatermarkRegion[] = [];
    onUpdate({ ...processedFile, watermarkRegions: newRegions });
    if (originalCanvasRef.current && imgRef.current) {
      const ctx = originalCanvasRef.current.getContext('2d')!;
      ctx.drawImage(imgRef.current, 0, 0);
    }
  };

  // Download processed file
  const handleDownload = () => {
    if (processedFile.processedUrl) {
      const link = document.createElement('a');
      link.href = processedFile.processedUrl;
      link.download = `cleaned_${file.name}`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      <ProgressBar state={processingState} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleAutoDetect}
          disabled={!imageLoaded || processingState.status === 'detecting' || processingState.status === 'removing'}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium
            hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Auto-Detect Watermarks
        </button>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Sensitivity:</label>
          <input
            type="range"
            min="0.1"
            max="0.7"
            step="0.05"
            value={detectionConfidence}
            onChange={(e) => setDetectionConfidence(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-gray-400">{Math.round(detectionConfidence * 100)}%</span>
        </div>

        <div className="border-l border-gray-300 h-8 mx-1" />

        {/* Inpaint method selector */}
        <select
          value={inpaintMethod}
          onChange={(e) => setInpaintMethod(e.target.value as InpaintMethod)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ai-inpainting">🤖 AI Inpainting (Best)</option>
          <option value="content-aware">🎨 Content-Aware Fill</option>
          <option value="blur">🌫️ Blur Watermark</option>
        </select>

        <button
          onClick={handleRemoveWatermarks}
          disabled={
            !imageLoaded ||
            processedFile.watermarkRegions.length === 0 ||
            processingState.status === 'removing' ||
            processingState.status === 'detecting'
          }
          className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium
            hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all shadow-lg shadow-green-500/25 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove Watermark
        </button>

        <button
          onClick={clearRegions}
          disabled={processedFile.watermarkRegions.length === 0}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Clear Selection
        </button>

        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
        >
          New File
        </button>
      </div>

      {/* Image Preview Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
            📷 Original
            {processedFile.watermarkRegions.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {processedFile.watermarkRegions.length} region(s)
              </span>
            )}
          </h3>
          <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <canvas
              ref={originalCanvasRef}
              className="max-w-full h-auto cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          {processedFile.detectedWatermarks && processedFile.detectedWatermarks.length > 0 && (
            <div className="mt-2 space-y-1">
              {processedFile.detectedWatermarks
                .filter((d) => d.confidence >= detectionConfidence)
                .map((det) => (
                  <div
                    key={det.id}
                    className="text-xs text-gray-500 flex items-center gap-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        det.confidence > 0.5 ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                    />
                    {det.label} — {Math.round(det.confidence * 100)}% confidence
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Processed */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
            ✨ Processed
            {processingState.status === 'done' && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                Done
              </span>
            )}
          </h3>
          <div className="relative border-2 border-green-200 rounded-xl overflow-hidden bg-gray-50">
            <canvas ref={canvasRef} className="max-w-full h-auto" />
            {processingState.status === 'removing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="text-center bg-white/90 px-6 py-4 rounded-xl">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-gray-700">{processingState.message}</p>
                  <p className="text-xs text-gray-400">{processingState.progress}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download Button */}
      {processingState.status === 'done' && processedFile.processedUrl && (
        <div className="flex justify-center">
          <button
            onClick={handleDownload}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl
              font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all
              shadow-lg shadow-purple-500/25 flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Cleaned Image
          </button>
        </div>
      )}

      {/* File Info */}
      <div className="text-xs text-gray-400 text-center space-x-4">
        <span>File: {file.name}</span>
        <span>Size: {formatFileSize(file.size)}</span>
        <span>Dimensions: {originalDimensions.w}×{originalDimensions.h}</span>
        <span>Method: {inpaintMethod}</span>
      </div>
    </div>
  );
}
