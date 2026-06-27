import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mencak-Mencak - Hapus Watermark Gambar & Video Gratis | AI Otomatis',
  description:
    'Hapus watermark dari gambar dan video secara otomatis pakai AI. Gratis selamanya, tanpa daftar. Support PNG, JPG, WEBP, HEIC, MP4 dan 20+ format. Upscale hingga 4K.',
  keywords: 'hapus watermark, remove watermark, AI watermark remover, hapus watermark gratis, free watermark remover, AI inpainting, upscale 4K, menghilangkan watermark',
  metadataBase: new URL('https://mencak-mencak.vercel.app'),
  openGraph: {
    title: 'Mencak-Mencak - Hapus Watermark Gambar & Video Gratis',
    description: 'Hapus watermark otomatis dengan AI. Gratis, tanpa daftar, tanpa batas.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'Mencak-Mencak',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mencak-Mencak - Hapus Watermark Otomatis',
    description: 'Hapus watermark gambar & video gratis pakai AI.',
  },
  robots: 'index, follow',
  alternates: {
    canonical: 'https://mencak-mencak.vercel.app',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased" style={{background:'#fafbfc',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
        {children}
      </body>
    </html>
  );
}
