export type FileType = 'image' | 'video';

export type ProcessingMode = 'auto' | 'manual';

export type ImageFormat = 'png' | 'jpg' | 'webp' | 'original';

export type VideoFormat = 'mp4' | 'webm' | 'original';

export interface WatermarkRegion {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

export interface DetectedWatermark {
  id: string;
  label: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'detecting' | 'removing' | 'processing' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
  estimatedTime?: number; // seconds
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  fileType: FileType;
  originalSize: number;
  processedSize?: number;
  originalUrl: string;
  processedUrl?: string;
  watermarkRegions: WatermarkRegion[];
  detectedWatermarks?: DetectedWatermark[];
  processingState: ProcessingState;
  createdAt: Date;
}

export interface InpaintRequest {
  imageBase64: string;
  maskBase64: string;
  mode: 'auto' | 'manual';
}

export interface InpaintResponse {
  resultBase64: string;
  processingTime: number;
}
