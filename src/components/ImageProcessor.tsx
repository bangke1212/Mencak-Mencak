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
  const [converted, setConverted] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const convertedFileRef = useRef<File | null>(null);

  // ===== LOAD IMAGE with format conversion fallback =====
  useEffect(() => {
    if (!file) return;
    setImageLoaded(false);
    setConverted(false);
    convertedFileRef.current = null;
    setProcessingState({ status: 'idle', progress: 0, message: 'Memuat gambar...' });

    const objectUrl = URL.createObjectURL(file);

    function tryLoadImage(imgSrc: string, originalFile: File, isConverted: boolean) {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        imgRef.current = img;
        setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });

        if (originalCanvasRef.current) {
          const canvas = originalCanvasRef.current;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }

        setPreviewUrl(imgSrc);
        setImageLoaded(true);
        setConverted(isConverted);
        setProcessingState({
          status: 'idle', progress: 0,
          message: isConverted
            ? '✅ Gambar berhasil dikonversi. Siap diproses!'
            : 'Siap! Klik Deteksi Otomatis untuk memulai.',
        });
      };

      img.onerror = async () => {
        // If already converted and still fails, give up
        if (isConverted) {
          console.error('Image load error even after conversion:', originalFile.name);
          setProcessingState({
            status: 'error', progress: 0,
            message: 'Gagal memuat gambar. File mungkin rusak. Coba file lain.',
          });
          return;
        }

        // Try converting via canvas
        console.warn('Direct load failed, trying canvas conversion for:', originalFile.name);
        setProcessingState({ status: 'idle', progress: 0, message: 'Mengkonversi format gambar...' });

        try {
          const converted = await convertImageViaCanvas(originalFile);
          if (converted) {
            convertedFileRef.current = converted;
            const newUrl = URL.createObjectURL(converted);
            tryLoadImage(newUrl, originalFile, true);
          } else {
            setProcessingState({
              status: 'error', progress: 0,
              message: 'Format tidak didukung browser. Konversi ke PNG/JPG dulu.',
            });
          }
        } catch {
          setProcessingState({
            status: 'error', progress: 0,
            message: 'Gagal mengkonversi gambar. Coba file PNG atau JPG.',
          });
        }
      };

      img.src = imgSrc;
    }

    tryLoadImage(objectUrl, file, false);

    return () => { URL.revokeObjectURL(objectUrl); };
  }, [file]);

  // ===== CONVERT IMAGE VIA CANVAS (HEIC, SVG, corrupt JPEG, etc.) =====
  async function convertImageViaCanvas(inputFile: File): Promise<File | null> {
    return new Promise((resolve) => {
      // Try to create a blob URL and draw to canvas
      const url = URL.createObjectURL(inputFile);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob && blob.size > 0) {
            const ext = inputFile.name.includes('.') ? 'png' : 'png';
            const name = inputFile.name.replace(/\.[^.]+$/, '.png') || 'converted.png';
            resolve(new File([blob], name, { type: 'image/png' }));
          } else {
            resolve(null);
          }
        }, 'image/png', 1.0);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  }

  // Get the usable file (converted or original)
  const getUsableFile = (): File => convertedFileRef.current || file;

  // ===== AUTO DETECT =====
  const handleAutoDetect = async () => {
    if (!imgRef.current || !originalCanvasRef.current) return;
    setProcessingState({ status: 'detecting', progress: 10, message: 'Memindai watermark...' });
    await new Promise((r) => setTimeout(r, 300));

    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const detections = await detectWatermarksFromImage(imageData);
      setProcessingState({ status: 'detecting', progress: 50, message: `Terdeteksi ${detections.length} watermark` });

      const regions = detectionsToRegions(
        detections.filter((d) => d.confidence >= detectionConfidence),
        canvas.width,
        canvas.height
      );

      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = canvas.width;
      displayCanvas.height = canvas.height;
      const dCtx = displayCanvas.getContext('2d')!;
      dCtx.drawImage(imgRef.current!, 0, 0);

      for (const det of detections) {
        if (det.confidence >= detectionConfidence) {
          dCtx.strokeStyle = '#3B82F6'; dCtx.lineWidth = 3; dCtx.setLineDash([6, 3]);
          dCtx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height);
          dCtx.fillStyle = '#3B82F6'; dCtx.font = 'bold 14px sans-serif';
          const label = `${det.label} (${Math.round(det.confidence * 100)}%)`;
          const tw = dCtx.measureText(label).width;
          dCtx.fillRect(det.bbox.x, det.bbox.y - 24, tw + 12, 22);
          dCtx.fillStyle = 'white'; dCtx.fillText(label, det.bbox.x + 6, det.bbox.y - 7);
        }
      }

      if (canvasRef.current) {
        const rc = canvasRef.current;
        rc.width = canvas.width; rc.height = canvas.height;
        rc.getContext('2d')!.drawImage(displayCanvas, 0, 0);
      }

      const msg = regions.length > 0
        ? `${regions.length} watermark terdeteksi! Siap dihapus.`
        : 'Tidak ada watermark. Atur sensitivitas atau pilih area manual.';

      setProcessingState({ status: 'idle', progress: 100, message: msg });
      onUpdate({
        ...processedFile,
        detectedWatermarks: detections,
        watermarkRegions: regions,
        processingState: { status: 'idle', progress: 100, message: msg },
      });
    } catch (error: any) {
      setProcessingState({ status: 'error', progress: 0, message: `Gagal deteksi: ${error.message}` });
    }
  };

  // ===== REMOVE WATERMARK =====
  const handleRemoveWatermarks = async () => {
    if (!imgRef.current || !originalCanvasRef.current) return;

    const regions = processedFile.watermarkRegions;
    if (regions.length === 0) {
      setProcessingState({ status: 'error', progress: 0, message: 'Pilih area watermark dulu (deteksi atau manual).' });
      return;
    }

    const est = estimateProcessingTime(getUsableFile().size, 'image', regions);
    setProcessingState({ status: 'removing', progress: 10, message: 'Menyiapkan mask...', estimatedTime: est });

    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (inpaintMethod === 'ai-inpainting') {
      try {
        setProcessingState({ status: 'removing', progress: 25, message: 'AI LaMa memproses...', estimatedTime: est });
        const maskData = createMaskFromRegions(canvas.width, canvas.height, regions);
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width; maskCanvas.height = canvas.height;
        maskCanvas.getContext('2d')!.putImageData(maskData, 0, 0);
        const maskBase64 = maskCanvas.toDataURL('image/png');
        const imageBase64 = canvas.toDataURL('image/png');

        setProcessingState({ status: 'removing', progress: 40, message: 'Memanggil API...', estimatedTime: est });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);
        const response = await fetch('/api/inpaint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, maskBase64, mode: 'auto' }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const result = await response.json();

        if (result.success && result.resultBase64) {
          const resultImg = new Image();
          resultImg.onload = () => {
            if (canvasRef.current) {
              const rc = canvasRef.current;
              rc.width = resultImg.naturalWidth; rc.height = resultImg.naturalHeight;
              rc.getContext('2d')!.drawImage(resultImg, 0, 0);
            }
            setProcessingState({ status: 'done', progress: 100, message: '✅ Watermark berhasil dihapus!' });
            onUpdate({
              ...processedFile, processedUrl: result.resultBase64,
              processingState: { status: 'done', progress: 100, message: '✅ Watermark berhasil dihapus!' },
            });
          };
          resultImg.src = result.resultBase64;
          return;
        }
      } catch { console.warn('AI fallback ke client-side'); }
    }

    setProcessingState({ status: 'removing', progress: 60, message: `Metode ${inpaintMethod}...`, estimatedTime: 2 });
    await new Promise((r) => setTimeout(r, 100));
    let processedData: ImageData;
    if (inpaintMethod === 'blur') processedData = blurWatermarkClientSide(imageData, regions);
    else processedData = contentAwareFillClientSide(imageData, regions);

    setProcessingState({ status: 'removing', progress: 85, message: 'Menyimpan...', estimatedTime: 1 });

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width; resultCanvas.height = canvas.height;
    resultCanvas.getContext('2d')!.putImageData(processedData, 0, 0);

    if (canvasRef.current) {
      const rc = canvasRef.current;
      rc.width = canvas.width; rc.height = canvas.height;
      rc.getContext('2d')!.putImageData(processedData, 0, 0);
    }

    const resultUrl = resultCanvas.toDataURL('image/png');
    setProcessingState({ status: 'done', progress: 100, message: '✅ Watermark berhasil dihapus!' });
    onUpdate({
      ...processedFile, processedUrl: resultUrl,
      processingState: { status: 'done', progress: 100, message: '✅ Watermark berhasil dihapus!' },
    });
  };

  // ===== MANUAL SELECTION =====
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = originalCanvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setIsSelecting(true);
    setSelectionStart({
      x: (e.clientX - rect.left) * canvas.width / rect.width,
      y: (e.clientY - rect.top) * canvas.height / rect.height,
    });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return; setIsSelecting(false);
    const canvas = originalCanvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ex = (e.clientX - rect.left) * canvas.width / rect.width;
    const ey = (e.clientY - rect.top) * canvas.height / rect.height;
    const region: WatermarkRegion = {
      id: `manual-${Date.now()}`,
      x: (Math.min(selectionStart.x, ex) / canvas.width) * 100,
      y: (Math.min(selectionStart.y, ey) / canvas.height) * 100,
      width: (Math.abs(ex - selectionStart.x) / canvas.width) * 100,
      height: (Math.abs(ey - selectionStart.y) / canvas.height) * 100,
    };
    const newRegions = [...processedFile.watermarkRegions, region];
    onUpdate({ ...processedFile, watermarkRegions: newRegions });
    redrawOriginalWithRegions(newRegions);
  };

  const redrawOriginalWithRegions = (regions: WatermarkRegion[]) => {
    const canvas = originalCanvasRef.current; if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(imgRef.current, 0, 0);
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    for (const r of regions) {
      ctx.strokeRect(
        (r.x / 100) * canvas.width, (r.y / 100) * canvas.height,
        (r.width / 100) * canvas.width, (r.height / 100) * canvas.height
      );
    }
  };

  const clearRegions = () => {
    onUpdate({ ...processedFile, watermarkRegions: [] });
    if (originalCanvasRef.current && imgRef.current) {
      originalCanvasRef.current.getContext('2d')!.drawImage(imgRef.current, 0, 0);
    }
  };

  const handleDownload = () => {
    if (processedFile.processedUrl) {
      const a = document.createElement('a');
      a.href = processedFile.processedUrl;
      a.download = `cleaned_${getUsableFile().name}`;
      a.click();
    }
  };

  const isBusy = processingState.status === 'detecting' || processingState.status === 'removing';
  const isDone = processingState.status === 'done';
  const isError = processingState.status === 'error';
  const hasRegions = processedFile.watermarkRegions.length > 0;

  // Generate sample previews on error
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!isError || !sampleCanvasRef.current) return;
    const canvas = sampleCanvasRef.current;
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    const samples = [
      { x: 10,  y: 10, w: 180, h: 180, c1: '#ff7e5f', c2: '#feb47b', wm: 'SAMPLE',  emoji: '🌅' },
      { x: 210, y: 10, w: 180, h: 180, c1: '#667eea', c2: '#764ba2', wm: 'LOGO',    emoji: '📸' },
      { x: 410, y: 10, w: 180, h: 180, c1: '#11998e', c2: '#38ef7d', wm: 'DRAFT',   emoji: '🌲' },
    ];

    for (const s of samples) {
      const g = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
      g.addColorStop(0, s.c1); g.addColorStop(1, s.c2);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`SAMPLE`, s.x + s.w/2, s.y + 55);
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(s.emoji, s.x + s.w/2, s.y + 105);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(s.wm, s.x + s.w/2, s.y + 155);
    }
  }, [isError]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      {/* STATUS CARD */}
      <div style={{
        padding: imageLoaded ? '16px 20px' : '24px 20px', borderRadius: 16,
        background: isError ? '#fef2f2' : isDone ? '#f0fdf4' : imageLoaded ? '#f8fafc' : '#fafafa',
        border: isError ? '1px solid #fecaca' : isDone ? '1px solid #bbf7d0' : '1px solid #f0f0f0',
        marginBottom: 20, textAlign: 'center',
      }}>
        {!imageLoaded && !isError && (
          <div>
            <div style={{
              width: 48, height: 48, margin: '0 auto 12px',
              borderRadius: '50%', border: '4px solid #e5e7eb',
              borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#333', margin: 0 }}>
              {processingState.message || 'Memuat gambar...'}
            </p>
            <p style={{ fontSize: 13, color: '#999', margin: '4px 0 0' }}>{getUsableFile().name}</p>
          </div>
        )}
        {isError && (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto 16px',
              background: 'linear-gradient(135deg,#fecaca,#fee2e2)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>🖼️💔</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', margin: '0 0 8px' }}>
              Gagal Memuat Gambar
            </h2>
            <p style={{ fontSize: 14, color: '#dc2626', margin: '0 0 4px', lineHeight: 1.5 }}>
              {processingState.message}
            </p>
            <p style={{ fontSize: 12, color: '#999', margin: '0 0 20px' }}>
              File: {file.name} · {formatFileSize(file.size)}
            </p>

            {/* Solutions */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
              maxWidth: 600, margin: '0 auto 20px',
            }}>
              <div style={{
                background: '#fff', borderRadius: 12, padding: '14px 10px',
                border: '1px solid #f0f0f0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🔄</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 2 }}>Konversi</div>
                <div style={{ fontSize: 10, color: '#888' }}>Ke PNG / JPG dulu</div>
              </div>
              <div style={{
                background: '#fff', borderRadius: 12, padding: '14px 10px',
                border: '1px solid #f0f0f0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 2 }}>Coba File Lain</div>
                <div style={{ fontSize: 10, color: '#888' }}>Format berbeda</div>
              </div>
              <div style={{
                background: '#fff', borderRadius: 12, padding: '14px 10px',
                border: '1px solid #f0f0f0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🧪</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 2 }}>Sample</div>
                <div style={{ fontSize: 10, color: '#888' }}>Gambar bawaan</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={onReset} style={{
                padding: '12px 28px', borderRadius: 12,
                background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: 'white', border: 'none',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220,38,38,0.25)',
              }}>← Kembali</button>
              <button onClick={() => { onReset(); }} style={{
                padding: '12px 28px', borderRadius: 12,
                background: '#fff', color: '#555',
                border: '1px solid #e5e7eb',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>🔄 Coba Upload Ulang</button>
            </div>

            {/* Sample preview images */}
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10 }}>
                💡 Coba sample ini — gambar berkualitas & pasti berfungsi:
              </p>
              <canvas ref={sampleCanvasRef}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: 14, border: '1px solid #f0f0f0' }}
              />
            </div>
          </div>
        )}
        {imageLoaded && !isError && (
          <div>
            {isBusy && <ProgressBar state={processingState} />}
            {!isBusy && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15 }}>{isDone ? '✅' : '📷'}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: isDone ? '#16a34a' : '#333' }}>
                  {processingState.message || 'Siap diproses'}
                </span>
                {converted && !isDone && (
                  <span style={{ fontSize: 11, background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>
                    Dikonversi ke PNG
                  </span>
                )}
                {hasRegions && !isDone && (
                  <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>
                    {processedFile.watermarkRegions.length} area
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      {imageLoaded && !isError && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
          marginBottom: 20, padding: '14px 18px',
          background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0',
        }}>
          <button onClick={handleAutoDetect} disabled={isBusy} style={{
            padding: '11px 20px',
            background: isBusy ? '#e5e7eb' : 'linear-gradient(135deg,#2563eb,#6366f1)',
            color: isBusy ? '#999' : 'white', border: 'none', borderRadius: 11,
            fontSize: 14, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: isBusy ? 'none' : '0 4px 14px rgba(37,99,235,0.25)',
          }}>🔍 Deteksi Otomatis</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}>
            <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>Sensitivitas</span>
            <input type="range" min="0.1" max="0.7" step="0.05" value={detectionConfidence}
              onChange={(e) => setDetectionConfidence(parseFloat(e.target.value))}
              style={{ width: 80, accentColor: '#3b82f6' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', width: 32 }}>
              {Math.round(detectionConfidence * 100)}%
            </span>
          </div>

          <div style={{ width: 1, height: 30, background: '#e5e7eb', margin: '0 4px' }} />

          <select value={inpaintMethod} onChange={(e) => setInpaintMethod(e.target.value as InpaintMethod)}
            disabled={isBusy} style={{
              padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: '#333', background: '#fff',
              cursor: 'pointer', outline: 'none',
            }}>
            <option value="ai-inpainting">🤖 AI Inpainting (Terbaik)</option>
            <option value="content-aware">🎨 Content-Aware Fill</option>
            <option value="blur">🌫️ Blur Watermark</option>
          </select>

          <button onClick={handleRemoveWatermarks} disabled={!hasRegions || isBusy} style={{
            padding: '11px 20px',
            background: (!hasRegions || isBusy) ? '#e5e7eb' : 'linear-gradient(135deg,#16a34a,#22c55e)',
            color: (!hasRegions || isBusy) ? '#999' : 'white', border: 'none', borderRadius: 11,
            fontSize: 14, fontWeight: 700, cursor: (!hasRegions || isBusy) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: (!hasRegions || isBusy) ? 'none' : '0 4px 14px rgba(22,163,74,0.25)',
          }}>🗑️ Hapus Watermark</button>

          <button onClick={clearRegions} disabled={!hasRegions || isBusy} style={{
            padding: '10px 16px', background: 'transparent',
            color: hasRegions && !isBusy ? '#666' : '#ccc',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: hasRegions && !isBusy ? 'pointer' : 'default',
          }}>Bersihkan</button>

          <div style={{ flex: 1 }} />

          <button onClick={onReset} style={{
            padding: '10px 16px', background: '#f3f4f6', color: '#555',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>📁 File Baru</button>
        </div>
      )}

      {/* PREVIEW — Original + Processed */}
      {imageLoaded && !isError && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Original */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>📷 Original</span>
              {hasRegions && (
                <span style={{ fontSize: 11, background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                  {processedFile.watermarkRegions.length} area
                </span>
              )}
            </div>
            <div style={{ border: '2px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', background: '#fafafa', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <canvas ref={originalCanvasRef} onMouseDown={handleCanvasMouseDown} onMouseUp={handleCanvasMouseUp}
                style={{ maxWidth: '100%', maxHeight: '70vh', cursor: 'crosshair', display: 'block' }} />
            </div>
          </div>

          {/* Processed */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>✨ Hasil</span>
              {isDone && <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Selesai</span>}
            </div>
            <div style={{ border: isDone ? '2px solid #bbf7d0' : '2px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', background: '#fafafa', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block' }} />
              {isBusy && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, margin: '0 auto 10px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#333', margin: 0 }}>{processingState.message}</p>
                    <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>{processingState.progress}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOWNLOAD */}
      {isDone && processedFile.processedUrl && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={handleDownload} style={{
            padding: '16px 36px',
            background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
            color: 'white', border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            boxShadow: '0 6px 24px rgba(139,92,246,0.3)',
          }}>⬇️ Download Gambar Bersih</button>
        </div>
      )}

      {/* FILE INFO */}
      {imageLoaded && !isError && (
        <div style={{ marginTop: 24, padding: '12px 20px', background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', fontSize: 12, color: '#888' }}>
          <span>📄 {getUsableFile().name}</span>
          <span>📦 {formatFileSize(getUsableFile().size)}</span>
          <span>📐 {originalDimensions.w} × {originalDimensions.h}</span>
          <span>🔧 {inpaintMethod}</span>
          {converted && <span>🔄 Dikonversi</span>}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
