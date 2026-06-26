'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProcessedFile, FileType } from '@/types';
import { createEmptyProcessingState } from '@/lib/utils';
import FileUploader from '@/components/FileUploader';
import URLImporter from '@/components/URLImporter';
import ImageProcessor from '@/components/ImageProcessor';
import VideoProcessor from '@/components/VideoProcessor';
import SampleFiles from '@/components/SampleFiles';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [showURLImport, setShowURLImport] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleFileSelect = useCallback((f: File, type: FileType) => {
    try {
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
    }
  }, []);

  const handleUpdate = useCallback((p: ProcessedFile) => setProcessedFile(p), []);
  const handleReset = useCallback(() => {
    setFile(null); setFileType(null);
    if (processedFile?.originalUrl) URL.revokeObjectURL(processedFile.originalUrl);
    setProcessedFile(null);
  }, [processedFile]);

  if (file && fileType && processedFile) {
    return (
      <div style={{minHeight:'100vh',background:'#fff'}}>
        <header style={{position:'sticky',top:0,zIndex:50,background:'rgba(255,255,255,0.9)',backdropFilter:'blur(10px)',borderBottom:'1px solid #eee',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button onClick={handleReset} style={{display:'flex',alignItems:'center',gap:6,color:'#555',fontSize:14,fontWeight:500,border:'none',background:'none',cursor:'pointer'}}>
            ← Back
          </button>
          <span style={{fontSize:14,fontWeight:600,color:'#111',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.name}</span>
          <div style={{width:50}} />
        </header>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'20px'}}>
          {fileType === 'image' && <ImageProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />}
          {fileType === 'video' && <VideoProcessor file={file} processedFile={processedFile} onUpdate={handleUpdate} onReset={handleReset} />}
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",background:'#fff',color:'#111'}}>
      {/* Header */}
      <header style={{borderBottom:'1px solid #f0f0f0',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:1200,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,#3b82f6,#6366f1)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </div>
          <span style={{fontWeight:700,fontSize:17,letterSpacing:'-0.3px'}}>WatermarkRemover</span>
        </div>
        <div style={{display:'flex',gap:6}}>
          <span style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:99,background:'#eff6ff',color:'#2563eb'}}>🤖 AI</span>
          <span style={{fontSize:11,fontWeight:600,padding:'4px 10px',borderRadius:99,background:'#f0fdf4',color:'#16a34a'}}>Free</span>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <div style={{maxWidth:700,margin:'0 auto',padding:'40px 20px 32px',textAlign:'center'}}>
        <div style={{width:64,height:64,margin:'0 auto 24px',background:'linear-gradient(135deg,#3b82f6,#6366f1,#a855f7)',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px rgba(59,130,246,0.25)'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>

        <h1 style={{fontSize:32,fontWeight:800,lineHeight:1.2,letterSpacing:'-0.5px',margin:'0 0 8px'}}>
          Remove Watermarks<br/>From <span style={{background:'linear-gradient(135deg,#2563eb,#6366f1,#a855f7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Images & Videos</span>
        </h1>
        <p style={{fontSize:16,color:'#666',margin:'0 0 32px',lineHeight:1.5}}>
          100% automatically. No signup. Free forever.
        </p>

        {/* ===== ACTION BUTTONS ===== */}
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}>
          {/* Upload Button */}
          <label style={{display:'block',cursor:'pointer'}}>
            <input type="file" style={{display:'none'}} accept="image/*,video/*"
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
              transition:'all 0.2s',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Upload Image or Video
            </div>
          </label>

          {/* URL Button */}
          <button onClick={() => setShowURLImport(true)} style={{
            width:'100%',padding:'16px 24px',
            background:'#fff',color:'#333',
            border:'2px solid #e2e8f0',borderRadius:14,
            fontSize:16,fontWeight:600,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            transition:'all 0.2s',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Paste Image URL
          </button>
        </div>

        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:12,color:'#aaa',fontSize:13,fontWeight:500,marginBottom:20}}>
          <div style={{flex:1,height:1,background:'#e5e7eb'}} />
          <span>or drag & drop</span>
          <div style={{flex:1,height:1,background:'#e5e7eb'}} />
        </div>

        {/* Drop Zone */}
        <FileUploader onFileSelect={handleFileSelect} />

        {/* Format info */}
        <p style={{fontSize:12,color:'#aaa',marginTop:16,marginBottom:24}}>
          Supported: PNG, JPG, WEBP, BMP, TIFF, MP4, WEBM, MOV, AVI, MKV · Max 50MB
        </p>

        {/* Sample Files */}
        <SampleFiles onSelect={handleFileSelect} />
      </div>

      {/* ===== 3 STEPS ===== */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'40px 20px'}}>
        <h2 style={{textAlign:'center',fontSize:24,fontWeight:700,marginBottom:32}}>
          How it <span style={{background:'linear-gradient(135deg,#2563eb,#6366f1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>works</span>
        </h2>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
          {[
            {num:'1',icon:'📤',title:'Upload',desc:'Choose a file from your device or paste a URL'},
            {num:'2',icon:'🤖',title:'AI Removes',desc:'LaMa AI detects and removes watermarks automatically'},
            {num:'3',icon:'📥',title:'Download',desc:'Get your clean result instantly — no signup needed'},
          ].map((s) => (
            <div key={s.num} style={{padding:24,borderRadius:16,border:'1px solid #f0f0f0',background:'#fafafa',textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:10}}>{s.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#2563eb',marginBottom:6}}>STEP {s.num}</div>
              <h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>{s.title}</h3>
              <p style={{fontSize:14,color:'#666',lineHeight:1.5}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'20px 20px 60px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          {[
            {icon:'🔍',title:'Auto Detection',desc:'AI finds watermarks automatically'},
            {icon:'🎨',title:'AI Inpainting',desc:'Fills removed areas naturally'},
            {icon:'🎬',title:'Video Ready',desc:'Frame-by-frame processing'},
            {icon:'🔒',title:'Privacy First',desc:'Files never leave your device'},
            {icon:'⚡',title:'Fast Results',desc:'Processed in seconds'},
            {icon:'📱',title:'All Devices',desc:'Works on mobile & desktop'},
          ].map((f) => (
            <div key={f.title} style={{padding:18,borderRadius:14,border:'1px solid #f0f0f0',display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{fontSize:24,flexShrink:0}}>{f.icon}</div>
              <div>
                <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 2px'}}>{f.title}</h4>
                <p style={{fontSize:12,color:'#888',margin:0}}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{borderTop:'1px solid #f0f0f0',padding:'24px 20px',textAlign:'center',fontSize:12,color:'#aaa'}}>
        Powered by LaMa AI · Built with Next.js · Deployed on Vercel
      </footer>

      {showURLImport && <URLImporter onFileLoad={handleFileSelect} onClose={() => setShowURLImport(false)} />}
    </div>
  );
}
