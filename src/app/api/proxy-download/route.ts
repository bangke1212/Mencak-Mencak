import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy download API - fetches remote files to avoid CORS issues
 */
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength) : 0;

    // Max 50MB
    if (size > 50 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 50MB.',
      }, { status: 413 });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({
      success: true,
      data: base64,
      contentType,
      size: buffer.byteLength,
    });
  } catch (error: any) {
    console.error('Proxy download error:', error.message);
    return NextResponse.json({
      error: error.message || 'Download failed',
    }, { status: 500 });
  }
}
