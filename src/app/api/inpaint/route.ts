import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for image inpainting.
 * Proxies to Hugging Face Space API (free) to avoid CORS issues.
 * Max body size: 50MB (default on Vercel).
 */
export const maxDuration = 55; // seconds - max for Vercel Hobby plan

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, maskBase64, mode } = body;

    if (!imageBase64 || !maskBase64) {
      return NextResponse.json(
        { error: 'Missing imageBase64 or maskBase64' },
        { status: 400 }
      );
    }

    // Try Hugging Face Space API first
    try {
      const result = await callHuggingFaceSpace(imageBase64, maskBase64);
      return NextResponse.json({
        success: true,
        resultBase64: result,
        method: 'ai-inpainting',
      });
    } catch (hfError) {
      console.warn('HF Space API failed, falling back:', hfError);

      // Fallback: return the original image with processing instructions
      // Client will handle client-side blur/content-aware fill
      return NextResponse.json({
        success: true,
        resultBase64: null,
        method: 'client-side',
        message: 'Use client-side processing',
      });
    }
  } catch (error: any) {
    console.error('Inpaint API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function callHuggingFaceSpace(
  imageBase64: string,
  maskBase64: string
): Promise<string> {
  // Multiple HF Space endpoints to try
  const endpoints = [
    'https://akhaliq-lama.hf.space/api/predict',
    'https://Sanster-lama-cleaner.hf.space/api/predict',
    'https://NeuralFalcon-Meta-Watermark-Remover.hf.space/api/predict',
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout (Vercel limit: 60s)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
            maskBase64.startsWith('data:') ? maskBase64 : `data:image/png;base64,${maskBase64}`,
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data[0]) {
          return result.data[0];
        }
      }
    } catch (e) {
      console.warn(`Endpoint ${endpoint} failed:`, e);
      continue;
    }
  }

  // Try HF Inference API if token available
  const hfToken = process.env.HUGGINGFACE_TOKEN;
  if (hfToken) {
    const imgBuffer = Buffer.from(
      imageBase64.includes('base64,')
        ? imageBase64.split('base64,')[1]
        : imageBase64,
      'base64'
    );
    const maskBuffer = Buffer.from(
      maskBase64.includes('base64,')
        ? maskBase64.split('base64,')[1]
        : maskBase64,
      'base64'
    );

    const formData = new FormData();
    formData.append('image', new Blob([imgBuffer], { type: 'image/png' }), 'image.png');
    formData.append('mask', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png');

    const response = await fetch(
      'https://api-inference.huggingface.co/models/Sanster/lama-cleaner',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${hfToken}` },
        body: formData,
        signal: AbortSignal.timeout(45000),
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      const arrBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrBuffer).toString('base64');
      return `data:image/png;base64,${base64}`;
    }
  }

  throw new Error('All inpainting endpoints failed');
}
