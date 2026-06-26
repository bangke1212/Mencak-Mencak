import { WatermarkRegion } from '@/types';

/**
 * Remove watermark from an image by creating a mask and inpainting via Hugging Face API.
 * The Hugging Face Inference API is free for low-volume usage (need token).
 */

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || '';
const LAMA_SPACE_URL =
  'https://akhaliq-lama.hf.space/api/predict';
const FALLBACK_API_URL =
  'https://api-inference.huggingface.co/models/Sanster/lama-cleaner';

/**
 * Create a binary mask from watermark regions
 */
export function createMaskFromRegions(
  width: number,
  height: number,
  regions: WatermarkRegion[]
): ImageData {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  // Black background (keep)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // White regions (remove/inpaint)
  ctx.fillStyle = 'white';
  for (const region of regions) {
    const rx = (region.x / 100) * width;
    const ry = (region.y / 100) * height;
    const rw = (region.width / 100) * width;
    const rh = (region.height / 100) * height;

    // Dilate the region slightly for better inpainting
    const padding = Math.max(rw, rh) * 0.1;
    ctx.fillRect(rx - padding, ry - padding, rw + padding * 2, rh + padding * 2);
  }

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Inpaint image using Hugging Face Spaces API (LaMa model)
 * This uses the public Gradio Space API which is free
 */
export async function inpaintViaGradioSpace(
  imageBase64: string,
  maskBase64: string
): Promise<string> {
  // Using the public Lama Space API
  const response = await fetch(LAMA_SPACE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [imageBase64, maskBase64],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gradio API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  // Gradio returns { data: [...] }
  if (result.data && result.data[0]) {
    return result.data[0];
  }
  throw new Error('Invalid response from Gradio API');
}

/**
 * Alternative: Use HF Inference API directly
 */
export async function inpaintViaHFInference(
  imageBase64: string,
  maskBase64: string
): Promise<string> {
  if (!HF_TOKEN) {
    throw new Error('HUGGINGFACE_TOKEN not configured');
  }

  // Convert base64 to blob
  const imgBuffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
  const maskBuffer = Buffer.from(maskBase64.split(',')[1] || maskBase64, 'base64');

  const formData = new FormData();
  formData.append('image', new Blob([imgBuffer]), 'image.png');
  formData.append('mask', new Blob([maskBuffer]), 'mask.png');

  const response = await fetch(FALLBACK_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status}`);
  }

  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Client-side fallback: Simple blur/overlay inpainting
 * This is used when API is unavailable — blurs the watermark area
 */
export function blurWatermarkClientSide(
  imageData: ImageData,
  regions: WatermarkRegion[]
): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);

  for (const region of regions) {
    const rx = Math.floor((region.x / 100) * width);
    const ry = Math.floor((region.y / 100) * height);
    const rw = Math.floor((region.width / 100) * width);
    const rh = Math.floor((region.height / 100) * height);

    const blurRadius = Math.max(4, Math.floor(Math.min(rw, rh) * 0.05));

    for (let y = ry; y < ry + rh && y < height; y++) {
      for (let x = rx; x < rx + rw && x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              rSum += data[idx];
              gSum += data[idx + 1];
              bSum += data[idx + 2];
              count++;
            }
          }
        }

        const idx = (y * width + x) * 4;
        output[idx] = rSum / count;
        output[idx + 1] = gSum / count;
        output[idx + 2] = bSum / count;
      }
    }
  }

  return new ImageData(output, width, height);
}

/**
 * Content-aware fill using simple edge-aware inpainting
 * Better than pure blur — fills with surrounding colors
 */
export function contentAwareFillClientSide(
  imageData: ImageData,
  regions: WatermarkRegion[]
): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);

  for (const region of regions) {
    const rx = Math.floor((region.x / 100) * width);
    const ry = Math.floor((region.y / 100) * height);
    const rw = Math.floor((region.width / 100) * width);
    const rh = Math.floor((region.height / 100) * height);

    // Sample colors from outside the region
    const samples: Array<{ r: number; g: number; b: number }> = [];

    // Sample from all 4 sides
    const sampleWidth = Math.min(10, rw);
    const sampleHeight = Math.min(10, rh);

    // Top border
    for (let x = rx; x < rx + rw && x < width; x += 2) {
      const sy = Math.max(0, ry - 1);
      if (sy >= 0) {
        const idx = (sy * width + x) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }
    // Bottom border
    for (let x = rx; x < rx + rw && x < width; x += 2) {
      const sy = Math.min(height - 1, ry + rh);
      if (sy < height) {
        const idx = (sy * width + x) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }
    // Left border
    for (let y = ry; y < ry + rh && y < height; y += 2) {
      const sx = Math.max(0, rx - 1);
      if (sx >= 0) {
        const idx = (y * width + sx) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }
    // Right border
    for (let y = ry; y < ry + rh && y < height; y += 2) {
      const sx = Math.min(width - 1, rx + rw);
      if (sx < width) {
        const idx = (y * width + sx) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }

    if (samples.length === 0) continue;

    // Fill region with gradient-blended samples
    for (let y = ry; y < ry + rh && y < height; y++) {
      for (let x = rx; x < rx + rw && x < width; x++) {
        // Pick random sample from nearby
        const sample = samples[Math.floor(Math.random() * samples.length)];

        // Add slight noise for natural look
        const noise = () => Math.floor(Math.random() * 10) - 5;
        const idx = (y * width + x) * 4;
        output[idx] = Math.min(255, Math.max(0, sample.r + noise()));
        output[idx + 1] = Math.min(255, Math.max(0, sample.g + noise()));
        output[idx + 2] = Math.min(255, Math.max(0, sample.b + noise()));
      }
    }
  }

  return new ImageData(output, width, height);
}
