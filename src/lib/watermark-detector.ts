import { DetectedWatermark, WatermarkRegion } from '@/types';

/**
 * Watermark detection using edge detection and frequency analysis
 * This is a heuristic approach that detects:
 * - Semi-transparent overlays (logos, text)
 * - Repeating patterns
 * - High-contrast regions in corners/center
 */
export async function detectWatermarksFromImage(
  imageData: ImageData
): Promise<DetectedWatermark[]> {
  const results: DetectedWatermark[] = [];
  const { width, height, data } = imageData;

  // Strategy 1: Look for semi-transparent overlays
  // Watermarks often have alpha variation against a consistent background
  const regions = scanForTransparentOverlays(data, width, height);
  results.push(...regions);

  // Strategy 2: Edge detection for text/logos
  const edgeRegions = scanForTextLikeRegions(data, width, height);
  results.push(...edgeRegions);

  // Strategy 3: Corner detection (most watermarks are in corners)
  const cornerRegions = scanCorners(data, width, height);
  results.push(...cornerRegions);

  // Strategy 4: Check center-bottom (common for video watermarks)
  const centerRegions = scanCenterBottom(data, width, height);
  results.push(...centerRegions);

  // Deduplicate and sort by confidence
  const unique = deduplicateDetections(results);
  return unique.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function scanForTransparentOverlays(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedWatermark[] {
  const results: DetectedWatermark[] = [];
  const blockSize = 32; // Scan in 32x32 blocks
  const blocksX = Math.floor(width / blockSize);
  const blocksY = Math.floor(height / blockSize);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let alphaVariance = 0;
      let meanAlpha = 0;
      let pixelCount = 0;

      const startX = bx * blockSize;
      const startY = by * blockSize;

      for (let y = startY; y < startY + blockSize && y < height; y++) {
        for (let x = startX; x < startX + blockSize && x < width; x++) {
          const idx = (y * width + x) * 4;
          const alpha = 255; // RGB doesn't have alpha — use luminance variance instead
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          meanAlpha += luminance;
          pixelCount++;
        }
      }

      meanAlpha /= pixelCount;

      for (let y = startY; y < startY + blockSize && y < height; y++) {
        for (let x = startX; x < startX + blockSize && x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          alphaVariance += (luminance - meanAlpha) ** 2;
        }
      }
      alphaVariance /= pixelCount;

      // Low variance + mid luminance = potential watermark area
      const normalizedVar = Math.min(alphaVariance / 5000, 1);
      const normalizedMean = 1 - Math.abs(meanAlpha - 128) / 128;

      // Watermarks tend to have moderate variance and mid-range luminance
      if (normalizedVar < 0.3 && normalizedMean > 0.4) {
        const conf = (1 - normalizedVar) * 0.3 + normalizedMean * 0.3;
        if (conf > 0.35) {
          results.push({
            id: `transparent-${bx}-${by}`,
            label: 'Possible Watermark',
            confidence: Math.round(conf * 100) / 100,
            bbox: {
              x: startX,
              y: startY,
              width: blockSize,
              height: blockSize,
            },
          });
        }
      }
    }
  }
  return results;
}

function scanForTextLikeRegions(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedWatermark[] {
  const results: DetectedWatermark[] = [];
  const edgeMap = new Float32Array(width * height);

  // Sobel edge detection
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const tl = toGray(data, x - 1, y - 1, width);
      const tc = toGray(data, x, y - 1, width);
      const tr = toGray(data, x + 1, y - 1, width);
      const ml = toGray(data, x - 1, y, width);
      const mr = toGray(data, x + 1, y, width);
      const bl = toGray(data, x - 1, y + 1, width);
      const bc = toGray(data, x, y + 1, width);
      const br = toGray(data, x + 1, y + 1, width);

      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Scan for clusters of edges (text/logos have many edges)
  const blockSize = 40;
  for (let by = 0; by < Math.floor(height / blockSize); by++) {
    for (let bx = 0; bx < Math.floor(width / blockSize); bx++) {
      let edgeSum = 0;
      let count = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize && y < height; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < width; x++) {
          edgeSum += edgeMap[y * width + x];
          count++;
        }
      }
      const edgeDensity = edgeSum / count;
      // High edge density = text/logo
      if (edgeDensity > 40) {
        const conf = Math.min(edgeDensity / 150, 1) * 0.7;
        results.push({
          id: `edges-${bx}-${by}`,
          label: 'Text/Logo',
          confidence: Math.round(conf * 100) / 100,
          bbox: {
            x: bx * blockSize,
            y: by * blockSize,
            width: blockSize,
            height: blockSize,
          },
        });
      }
    }
  }
  return results;
}

function scanCorners(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedWatermark[] {
  const results: DetectedWatermark[] = [];
  const cornerSize = Math.min(width, height) * 0.25;

  const corners = [
    { name: 'Top-Left', x: 0, y: 0 },
    { name: 'Top-Right', x: width - cornerSize, y: 0 },
    { name: 'Bottom-Left', x: 0, y: height - cornerSize },
    { name: 'Bottom-Right', x: width - cornerSize, y: height - cornerSize },
  ];

  for (const corner of corners) {
    let uniformCount = 0;
    let totalPixels = 0;
    const cx = Math.floor(corner.x);
    const cy = Math.floor(corner.y);

    for (let y = cy; y < cy + cornerSize && y < height; y++) {
      for (let x = cx; x < cx + cornerSize && x < width; x++) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        // Check neighbors for uniformity
        if (x > cx && y > cy) {
          const prevIdx = ((y - 1) * width + x) * 4;
          const prevLum =
            0.299 * data[prevIdx] + 0.587 * data[prevIdx + 1] + 0.114 * data[prevIdx + 2];
          if (Math.abs(lum - prevLum) < 15) {
            uniformCount++;
          }
        }
        totalPixels++;
      }
    }

    const uniformity = uniformCount / Math.max(totalPixels, 1);
    if (uniformity > 0.6) {
      results.push({
        id: `corner-${corner.name}`,
        label: `Corner Overlay (${corner.name})`,
        confidence: Math.round(uniformity * 100) / 100,
        bbox: {
          x: corner.x,
          y: corner.y,
          width: cornerSize,
          height: cornerSize,
        },
      });
    }
  }

  return results;
}

function scanCenterBottom(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedWatermark[] {
  const results: DetectedWatermark[] = [];
  const bandHeight = height * 0.15; // Bottom 15%
  const startY = height - bandHeight;
  const startX = width * 0.25;
  const bandWidth = width * 0.5;

  let uniformCount = 0;
  let totalPixels = 0;
  let meanLum = 0;

  for (let y = startY; y < height; y++) {
    for (let x = startX; x < startX + bandWidth; x++) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
      meanLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      totalPixels++;
    }
  }
  meanLum /= totalPixels;

  for (let y = startY; y < height; y++) {
    for (let x = startX; x < startX + bandWidth; x++) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (Math.abs(lum - meanLum) < 20) {
        uniformCount++;
      }
    }
  }

  const uniformity = uniformCount / Math.max(totalPixels, 1);
  if (uniformity > 0.5) {
    results.push({
      id: 'center-bottom',
      label: 'Center-Bottom Overlay',
      confidence: Math.round(uniformity * 0.7 * 100) / 100,
      bbox: {
        x: startX,
        y: startY,
        width: bandWidth,
        height: bandHeight,
      },
    });
  }

  return results;
}

function toGray(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): number {
  const idx = (y * width + x) * 4;
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
}

function deduplicateDetections(
  detections: DetectedWatermark[]
): DetectedWatermark[] {
  const merged: DetectedWatermark[] = [];
  const used = new Set<string>();

  for (const det of detections) {
    let isDuplicate = false;
    for (const existing of merged) {
      const overlap = calculateIoU(det.bbox, existing.bbox);
      if (overlap > 0.5) {
        isDuplicate = true;
        if (det.confidence > existing.confidence) {
          existing.confidence = det.confidence;
          existing.label = det.label;
          existing.bbox = det.bbox;
        }
        break;
      }
    }
    if (!isDuplicate) {
      merged.push(det);
    }
  }

  return merged;
}

function calculateIoU(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const interX = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const interY = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const intersection = interX * interY;

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}

/**
 * Convert detected watermarks to WatermarkRegion format for processing
 */
export function detectionsToRegions(
  detections: DetectedWatermark[],
  imageWidth: number,
  imageHeight: number
): WatermarkRegion[] {
  return detections.map((det) => ({
    id: det.id,
    x: (det.bbox.x / imageWidth) * 100,
    y: (det.bbox.y / imageHeight) * 100,
    width: (det.bbox.width / imageWidth) * 100,
    height: (det.bbox.height / imageHeight) * 100,
  }));
}
