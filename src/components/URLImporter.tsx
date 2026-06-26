'use client';

import { useState } from 'react';

interface Props {
  onFileLoad: (file: File, type: 'image' | 'video') => void;
  onClose: () => void;
}

export default function URLImporter({ onFileLoad, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const import_ = async () => {
    if (!url.trim()) { setError('Enter a URL'); return; }
    setError(''); setLoading(true); setProgress(10);
    try {
      new URL(url);
    } catch { setError('Invalid URL'); setLoading(false); return; }

    try {
      setProgress(30);
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const name = extractName(url) || 'import';
      const file = new File([blob], name, { type: blob.type });
      const type = blob.type.startsWith('image/') ? 'image' : blob.type.startsWith('video/') ? 'video' : null;
      if (!type) throw new Error('Unsupported file type');
      setProgress(100);
      setTimeout(() => onFileLoad(file, type), 200);
    } catch (e: any) {
      setError(e.message || 'Download failed');
      setLoading(false);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}} onClick={loading ? undefined : onClose} />
      <div style={{position:'relative',background:'white',borderRadius:20,padding:'28px 24px',maxWidth:460,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:18,fontWeight:700,margin:0}}>🔗 Import from URL</h3>
          <button onClick={onClose} disabled={loading} style={{border:'none',background:'#f3f4f6',borderRadius:10,width:32,height:32,cursor:'pointer',fontSize:18}}>✕</button>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:13,fontWeight:600,color:'#555',display:'block',marginBottom:6}}>Image or Video URL</label>
          <div style={{display:'flex',gap:8}}>
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              disabled={loading} autoFocus
              onKeyDown={e => e.key === 'Enter' && import_()}
              style={{flex:1,padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:14,outline:'none'}}
            />
            <button onClick={async () => { try { const t = await navigator.clipboard.readText(); if (t?.startsWith('http')) setUrl(t); } catch {} }}
              disabled={loading} style={{padding:'12px',background:'#f3f4f6',border:'none',borderRadius:12,cursor:'pointer',fontSize:18}}>📋</button>
          </div>
        </div>

        {loading && (
          <div style={{marginBottom:14}}>
            <div style={{height:6,background:'#f0f0f0',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,#3b82f6,#6366f1)',borderRadius:3,transition:'width 0.3s'}} />
            </div>
            <p style={{fontSize:12,color:'#999',textAlign:'center',marginTop:6}}>Downloading... {progress}%</p>
          </div>
        )}

        {error && (
          <div style={{padding:'10px 14px',borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',fontSize:13,marginBottom:14}}>
            {error}
          </div>
        )}

        <p style={{fontSize:11,color:'#aaa',marginBottom:14}}>PNG, JPG, WEBP, GIF, MP4, WEBM, MOV · Max 50MB</p>

        <div style={{display:'flex',gap:10}}>
          <button onClick={import_} disabled={loading || !url.trim()}
            style={{flex:1,padding:'14px',background:'linear-gradient(135deg,#2563eb,#6366f1)',color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',opacity:loading||!url.trim()?0.5:1}}>
            {loading ? '⏳ Downloading...' : '⬇️ Import'}
          </button>
          <button onClick={onClose} disabled={loading}
            style={{padding:'14px 24px',background:'#f3f4f6',color:'#555',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer'}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function extractName(url: string): string {
  try { const p = new URL(url).pathname.split('/'); const l = p[p.length-1]; return l?.includes('.') ? l : `file-${Date.now()}`; }
  catch { return `file-${Date.now()}`; }
}
