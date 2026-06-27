import { NextRequest, NextResponse } from 'next/server';

// Upscale gambar via canvas-based bicubic interpolation + sharpening
// Support up to 4x upscale. Rute: POST /api/upscale
// Body: { imageBase64: string, scale: 2 | 4 }
// Return: { success: boolean, resultBase64: string, newWidth: number, newHeight: number }

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, scale } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'imageBase64 diperlukan' }, { status: 400 });
    }

    const factor = scale === 4 ? 4 : scale === 2 ? 2 : 2;
    
    // Decode base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Kita akan gunakan canvas server-side approach via sharp atau
    // untuk simplicity, gunakan pendekatan: decode image, resize via ImageMagick-like logic
    // Karena Next.js API route tidak ada canvas, kita convert ke data URL dan proses
    
    // Import sharp untuk image processing di server
    let sharp: any;
    try {
      sharp = require('sharp');
    } catch {
      // Fallback: return image as-is dengan pesan untuk menggunakan client-side upscale
      return NextResponse.json({
        success: true,
        resultBase64: imageBase64,
        newWidth: 0,
        newHeight: 0,
        note: 'Server-side upscale tidak tersedia (sharp tidak terinstall). Gunakan client-side upscale.',
      });
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    const newWidth = Math.round((metadata.width || 800) * factor);
    const newHeight = Math.round((metadata.height || 600) * factor);

    const result = await image
      .resize(newWidth, newHeight, {
        kernel: 'lanczos3',
        fit: 'fill',
      })
      .sharpen({
        sigma: factor === 4 ? 0.8 : 0.5,
        m1: 0.5,
        m2: 0.5,
      })
      .jpeg({ quality: 95 })
      .toBuffer();

    const resultBase64 = `data:image/jpeg;base64,${result.toString('base64')}`;

    return NextResponse.json({
      success: true,
      resultBase64,
      newWidth,
      newHeight,
      scale: factor,
    });
  } catch (error: any) {
    console.error('Upscale error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal upscale' },
      { status: 500 }
    );
  }
}
