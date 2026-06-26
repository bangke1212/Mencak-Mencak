import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Watermark Remover - AI-Powered Image & Video Watermark Removal',
  description:
    'Remove watermarks from images and videos automatically using AI. Supports all image and video formats, up to 50MB. Free, fast, and no sign-up required.',
  keywords: 'watermark remover, remove watermark, AI inpainting, video watermark removal, image watermark remover, free watermark remover',
  openGraph: {
    title: 'Watermark Remover - AI-Powered Image & Video Watermark Removal',
    description: 'Remove watermarks from images and videos automatically using AI.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
