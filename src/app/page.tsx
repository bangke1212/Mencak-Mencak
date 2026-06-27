'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProcessedFile, FileType } from '@/types';
import { createEmptyProcessingState } from '@/lib/utils';
import FileUploader from '@/components/FileUploader';
import URLImporter from '@/components/URLImporter';
import ImageProcessor from '@/components/ImageProcessor';
import VideoProcessor from '@/components/VideoProcessor';
import SampleFiles from '@/components/SampleFiles';
import CanvasPolyfill from '@/components/CanvasPolyfill';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [showURLImport, setShowURLImport] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSampleTab, setActiveSampleTab] = useState<'images' | 'videos'>('images');

  useEffect(() => { setMounted(true); }, []);

  const handleFileSelect = useCallback((f: File, type: FileType) => {
    try {
      if (!f || f.size === 0) {
        alert('File kosong atau tidak valid.');
        return;
      }
      if (f.size > 50 * 1024 * 1024) {
        alert('File terlalu besar. Maksimal 50MB.');
        return;
      }
      const objectUrl = URL.createObjectURL(f);
      setFile(f);
      setFileType(type);
      setProcessedFile({
        id: crypto.randomUUID(),
        originalName: f.name,
        fileType: type,
        originalSize: f.size,
        originalUrl: objectUrl,
        watermarkRegions: [],
        processingState: createEmptyProcessingState(),
        createdAt: new Date(),
      });
    } catch (e) {
      console.error('File select error:', e);
      alert('Gagal memproses file. Coba file lain.');
    }
  }, []);

  const handleUpdate = useCallback((p: ProcessedFile) => setProcessedFile(p), []);
  const handleReset = useCallback(() => {
    setFile(null); setFileType(null);
    if (processedFile?.originalUrl) URL.revokeObjectURL(processedFile.originalUrl);
    setProcessedFile(null);
  }, [processedFile]);

  // ===== PROCESSOR VIEW =====
  if (file && fileType && processedFile) {
    return (
      <div style={{minHeight:'100vh',background:'#fafbfc'}}>
        <header style={{
          position:'sticky',top:0,zIndex:50,
          background:'rgba(255,255,255,0.95)',backdropFilter:'blur(16px)',
          borderBottom:'1px solid #f0f0f0',
          padding:'14px 24px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
        }}>
          <button onClick={handleReset} style={{
            display:'flex',alignItems:'center',gap:8,
            color:'#555',fontSize:14,fontWeight:600,
            border:'none',background:'#f3f4f6',
            borderRadius:10,padding:'8px 16px',cursor:'pointer',
          }}>← Kembali</button>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{
              width:32,height:32,
              background:'linear-gradient(135deg,#3b82f6,#6366f1)',
              borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <span style={{fontWeight:700,fontSize:16,color:'#111',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</span>
            <span style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:99,background:fileType==='image'?'#eff6ff':'#fef3c7',color:fileType==='image'?'#2563eb':'#d97706'}}>
              {fileType==='image'?'🖼️ Gambar':'🎬 Video'}
            </span>
          </div>
          <div style={{width:80}} />
        </header>
        <div style={{maxWidth:1400,margin:'0 auto',padding:'20px 24px'}}>
          {fileType === 'image' && <ImageProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />}
          {fileType === 'video' && <VideoProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />}
        </div>
      </div>
    );
  }

  // ===== HOME VIEW =====
  return (
    <>
    <CanvasPolyfill />
    <div style={{minHeight:'100vh',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",background:'#fff',color:'#111'}}>
      {/* Header */}
      <header style={{borderBottom:'1px solid #f0f0f0',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:1200,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,#3b82f6,#6366f1)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </div>
          <span style={{fontWeight:700,fontSize:17,letterSpacing:'-0.3px'}}>MencakMencak</span>
        </div>
        <div style={{display:'flex',gap:6}}>
          <span style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:99,background:'#eff6ff',color:'#2563eb'}}>🤖 AI</span>
          <span style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:99,background:'#f0fdf4',color:'#16a34a'}}>Gratis</span>
          <span style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:99,background:'#fef3c7',color:'#d97706'}}>4K</span>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <div style={{maxWidth:700,margin:'0 auto',padding:'48px 20px 32px',textAlign:'center'}}>
        <div style={{width:72,height:72,margin:'0 auto 24px',background:'linear-gradient(135deg,#3b82f6,#6366f1,#a855f7)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 10px 40px rgba(59,130,246,0.3)'}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>

        <h1 style={{fontSize:36,fontWeight:800,lineHeight:1.15,letterSpacing:'-0.5px',margin:'0 0 12px'}}>
          Hapus Watermark<br/>
          <span style={{background:'linear-gradient(135deg,#2563eb,#6366f1,#a855f7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            Gambar & Video Otomatis
          </span>
        </h1>
        <p style={{fontSize:16,color:'#666',margin:'0 0 36px',lineHeight:1.6}}>
          AI mendeteksi & menghapus watermark secara otomatis.<br/>
          <strong>Gratis selamanya</strong>, tanpa daftar, tanpa batas.
        </p>

        {/* ===== TABS: Gambar | Video ===== */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
          <div style={{display:'flex',background:'#f3f4f6',borderRadius:12,padding:4,gap:2}}>
            {[
              {key:'images',label:'🖼️ Gambar'},
              {key:'videos',label:'🎬 Video'},
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveSampleTab(tab.key as any)} style={{
                padding:'12px 28px',borderRadius:10,border:'none',
                background:activeSampleTab===tab.key?'#fff':'transparent',
                color:activeSampleTab===tab.key?'#111':'#888',
                fontWeight:activeSampleTab===tab.key?700:500,fontSize:14,
                cursor:'pointer',boxShadow:activeSampleTab===tab.key?'0 1px 4px rgba(0,0,0,0.08)':'none',
                transition:'all 0.2s',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* ===== ACTION BUTTONS ===== */}
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}>
          <label style={{display:'block',cursor:'pointer'}}>
            <input type="file" style={{display:'none'}} accept={activeSampleTab==='images'?'image/*':'video/*'}
              onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const type = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : null;
                if (type) handleFileSelect(f, type);
              }}
            />
            <div style={{
              width:'100%',padding:'18px 24px',
              background:'linear-gradient(135deg,#2563eb,#6366f1)',
              color:'white',borderRadius:14,border:'none',
              fontSize:17,fontWeight:700,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              boxShadow:'0 4px 20px rgba(37,99,235,0.3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              {activeSampleTab==='images'?'Upload Gambar':'Upload Video'}
            </div>
          </label>

          <button onClick={() => setShowURLImport(true)} style={{
            width:'100%',padding:'16px 24px',
            background:'#fff',color:'#333',
            border:'2px solid #e2e8f0',borderRadius:14,
            fontSize:16,fontWeight:600,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Tempel URL Gambar
          </button>
        </div>

        {/* Divider + Dropzone */}
        <div style={{display:'flex',alignItems:'center',gap:12,color:'#aaa',fontSize:13,fontWeight:500,marginBottom:20}}>
          <div style={{flex:1,height:1,background:'#e5e7eb'}} />
          <span>atau drag & drop</span>
          <div style={{flex:1,height:1,background:'#e5e7eb'}} />
        </div>

        <FileUploader onFileSelect={handleFileSelect} />

        {/* Format info */}
        <p style={{fontSize:12,color:'#aaa',marginTop:16,marginBottom:24}}>
          Mendukung: PNG, JPG, JPEG, WEBP, BMP, TIFF, HEIC, HEIF, GIF, SVG, AVIF, JXL, ICO, MP4, WEBM, MOV, AVI, MKV · Max 50MB
        </p>

        {/* Sample Files */}
        <SampleFiles onSelect={handleFileSelect} activeTab={activeSampleTab} />
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'48px 20px'}}>
        <h2 style={{textAlign:'center',fontSize:26,fontWeight:800,marginBottom:8}}>
          Cara <span style={{background:'linear-gradient(135deg,#2563eb,#6366f1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Kerja</span>
        </h2>
        <p style={{textAlign:'center',fontSize:14,color:'#888',marginBottom:36}}>Tiga langkah mudah, hasil maksimal</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
          {[
            {num:'1',icon:'📤',title:'Upload',desc:'Pilih file dari device atau tempel URL gambar/video'},
            {num:'2',icon:'🤖',title:'AI Hapus',desc:'LaMa AI mendeteksi & menghapus watermark otomatis'},
            {num:'3',icon:'📥',title:'Download',desc:'Dapatkan hasil bersih — bisa upscale ke 4K!'},
          ].map((s) => (
            <div key={s.num} style={{padding:28,borderRadius:18,border:'1px solid #f0f0f0',background:'#fafafa',textAlign:'center'}}>
              <div style={{fontSize:36,marginBottom:12}}>{s.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:'#2563eb',marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Langkah {s.num}</div>
              <h3 style={{fontSize:18,fontWeight:700,marginBottom:6}}>{s.title}</h3>
              <p style={{fontSize:13,color:'#888',lineHeight:1.6}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'20px 20px 40px'}}>
        <h2 style={{textAlign:'center',fontSize:26,fontWeight:800,marginBottom:8}}>
          Fitur <span style={{background:'linear-gradient(135deg,#2563eb,#6366f1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Unggulan</span>
        </h2>
        <p style={{textAlign:'center',fontSize:14,color:'#888',marginBottom:36}}>Semua yang Anda butuhkan untuk menghapus watermark</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          {[
            {icon:'🔍',title:'Deteksi Otomatis',desc:'AI temukan watermark dengan 4 strategi scanning'},
            {icon:'🎨',title:'AI Inpainting',desc:'Isi area bekas watermark secara natural'},
            {icon:'🎬',title:'Video Siap',desc:'Proses frame-by-frame untuk video'},
            {icon:'🔒',title:'Privasi Aman',desc:'File diproses di device, tidak diunggah'},
            {icon:'⚡',title:'Hasil Cepat',desc:'Proses dalam hitungan detik'},
            {icon:'📱',title:'Semua Device',desc:'Responsif di HP, tablet & desktop'},
            {icon:'🆙',title:'Upscale 4K',desc:'Tingkatkan resolusi hingga 4×'},
            {icon:'🔄',title:'Multi Format',desc:'20+ format gambar & video'},
            {icon:'🎯',title:'Seleksi Manual',desc:'Pilih area watermark sendiri jika perlu'},
          ].map((f) => (
            <div key={f.title} style={{padding:18,borderRadius:14,border:'1px solid #f0f0f0',display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{fontSize:24,flexShrink:0}}>{f.icon}</div>
              <div>
                <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 2px'}}>{f.title}</h4>
                <p style={{fontSize:12,color:'#888',margin:0,lineHeight:1.5}}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ABOUT ===== */}
      <div style={{maxWidth:700,margin:'0 auto',padding:'20px 20px 50px',textAlign:'center'}}>
        <h2 style={{fontSize:22,fontWeight:800,marginBottom:16}}>Tentang MencakMencak</h2>
        <p style={{fontSize:14,color:'#888',lineHeight:1.8,marginBottom:24}}>
          MencakMencak adalah alat <strong>gratis & open-source</strong> untuk menghapus watermark dari gambar dan video secara otomatis menggunakan AI.
          Dibangun dengan teknologi <strong>LaMa Inpainting</strong>, deteksi watermark heuristik, dan upscaling Lanczos untuk hasil maksimal.
          Tidak perlu daftar, tidak ada watermark output, tidak ada batasan — semuanya gratis.
        </p>
        <div style={{display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
          {[
            {label:'🤖 LaMa AI',color:'#eff6ff',text:'#2563eb'},
            {label:'🆓 Open Source',color:'#f0fdf4',text:'#16a34a'},
            {label:'🔒 Privacy First',color:'#fef3c7',text:'#d97706'},
            {label:'⚡ Next.js',color:'#f5f3ff',text:'#7c3aed'},
            {label:'📱 Responsive',color:'#fdf2f8',text:'#db2777'},
          ].map(b => (
            <span key={b.label} style={{fontSize:12,fontWeight:600,padding:'6px 14px',borderRadius:99,background:b.color,color:b.text}}>{b.label}</span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{borderTop:'1px solid #f0f0f0',padding:'28px 20px',textAlign:'center'}}>
        <p style={{fontSize:12,color:'#aaa',margin:0}}>
          MencakMencak · Hapus Watermark AI Gratis · Powered by LaMa · Built with Next.js · Deployed on Vercel
        </p>
        <p style={{fontSize:10,color:'#ccc',margin:'4px 0 0'}}>
          © 2026 MencakMencak · Free & Open Source
        </p>
      </footer>

      {showURLImport && <URLImporter onFileLoad={handleFileSelect} onClose={() => setShowURLImport(false)} />}
    </div>
    </>
  );
}
