import React, { useState } from 'react';
import {
  Upload, CheckCircle, Loader2, FileText, ShieldCheck, Zap, ShieldAlert,
  Fingerprint, Activity, Search, ChevronDown, ChevronUp, Shield, Star, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function Workspace() {
  const [activeMode, setActiveMode] = useState('authenticity');
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [expandedFiles, setExpandedFiles] = useState(new Set());

  const toggleExpand = (id) => {
    const s = new Set(expandedFiles);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedFiles(s);
  };

  const updateFile = (id, patch) =>
    setFiles(cur => cur.map(f => f.id === id ? { ...f, ...patch } : f));

  const pollResult = async (scanId, localId) => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const result = await api.result(scanId);
        if (result.status === 'completed' || result.status === 'failed') {
          updateFile(localId, { status: result.status, result, progress: 100 });
          return;
        }
        updateFile(localId, { progress: Math.min(10 + i * 5, 95) });
      } catch {}
    }
    updateFile(localId, { status: 'failed', progress: 100 });
  };

  const addFiles = async (newFiles) => {
    const formatted = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      progress: 0,
      status: 'analyzing',
      mode: activeMode,
      preview: URL.createObjectURL(file),
      rawFile: file,
    }));
    setFiles(prev => [...formatted, ...prev]);
    for (const f of formatted) {
      try {
        const { scan_id } = await api.upload(f.rawFile, activeMode);
        updateFile(f.id, { scanId: scan_id, progress: 10 });
        pollResult(scan_id, f.id);
      } catch {
        updateFile(f.id, { status: 'failed', progress: 100 });
      }
    }
  };

  const verdictStyle = (v) => ({
    'AUTHENTIC': { bg: 'bg-emerald-50/20 border-emerald-100', badge: 'bg-emerald-500', ring: '#10b981' },
    'AI GENERATED': { bg: 'bg-purple-50/20 border-purple-100', badge: 'bg-purple-500', ring: '#8b5cf6' },
  }[v] || { bg: 'bg-rose-50/20 border-rose-100', badge: 'bg-rose-500', ring: '#ef4444' });

  const verdictLabel = (v) => ({
    'AUTHENTIC': { title: 'Verified Genuine', desc: 'Image payload shows zero signs of manipulation.' },
    'AI GENERATED': { title: 'Synthetically Generated', desc: 'Image shows characteristics of AI generation.' },
  }[v] || { title: 'Forgery Detected', desc: 'Identified anomalies in structural distribution.' });

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Analysis Workspace</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-zinc-900 mt-0.5">
            Scan<span className="text-indigo-600">AI</span> <span className="text-zinc-400">Hub</span>
          </h2>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { id: 'authenticity', title: 'Authenticity Lab', desc: 'Image forensics & AI detection.', icon: Fingerprint, color: 'from-blue-600/10 to-indigo-600/10', accent: 'text-indigo-600', badge: 'Forensics' },
          { id: 'ocr', title: 'OCR Terminal', desc: 'Intelligent text extraction.', icon: FileText, color: 'from-emerald-600/10 to-teal-600/10', accent: 'text-emerald-600', badge: 'Extraction' },
        ].map(mode => (
          <motion.button key={mode.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
            onClick={() => setActiveMode(mode.id)}
            className={cn('group relative p-5 rounded-[1.5rem] bg-white border transition-all duration-500 text-left overflow-hidden',
              activeMode === mode.id ? 'border-zinc-900 shadow-xl' : 'border-zinc-100 shadow-sm opacity-60 hover:opacity-100'
            )}>
            <div className={cn('absolute inset-0 bg-gradient-to-br transition-opacity duration-700', mode.color, activeMode === mode.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
            <div className="relative z-10 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-xl bg-white shadow-lg border border-zinc-50 flex items-center justify-center transition-transform group-hover:rotate-6 shrink-0', mode.accent)}>
                <mode.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-display font-bold text-zinc-900">{mode.title}</h3>
                  {activeMode === mode.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
                <p className="text-xs text-zinc-500 font-medium">{mode.desc}</p>
              </div>
              <Badge variant="outline" className="hidden sm:flex rounded-full border-zinc-100 font-bold px-3 h-6 bg-white text-[9px] uppercase tracking-widest text-zinc-400">{mode.badge}</Badge>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Upload Zone */}
        <div className="xl:col-span-4">
          <motion.div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
            className={cn('relative group cursor-pointer aspect-square rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all duration-700',
              isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[0.98] ring-8 ring-indigo-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white shadow-sm'
            )}>
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-2xl">
                <Upload className="w-9 h-9" />
              </div>
              <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0, 0.1] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] blur-2xl -z-10" />
            </div>
            <p className="text-lg font-display font-bold text-zinc-900 text-center">Drop analysis items</p>
            <p className="text-xs font-medium text-zinc-400 text-center mt-1">Multi-item upload supported</p>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" multiple onChange={e => addFiles(Array.from(e.target.files || []))} />
          </motion.div>
        </div>

        {/* Results */}
        <div className="xl:col-span-8 flex flex-col min-h-[400px]">
          {files.length === 0 ? (
            <div className="flex-1 rounded-[2.5rem] border-2 border-dashed border-zinc-100 bg-zinc-50/50 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-20 h-20 rounded-[2rem] bg-white border border-zinc-100 flex items-center justify-center text-zinc-300 shadow-sm">
                <Activity className="w-9 h-9" />
              </div>
              <p className="text-base font-bold text-zinc-400">No active processing tasks</p>
            </div>
          ) : (
            <div className="space-y-6 pb-8">
              {files.map(file => (
                <motion.div key={file.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] bg-white border border-zinc-100 shadow-xl overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Preview */}
                    <div className="p-4 md:p-6 md:border-r border-zinc-50 bg-zinc-50/10 md:w-2/5">
                      <div className="relative aspect-square rounded-[1.5rem] overflow-hidden shadow-xl border border-zinc-100 group">
                        <img src={file.preview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-x-4 bottom-4 hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
                          <FileText className="w-4 h-4 text-white shrink-0" />
                          <span className="text-xs font-bold text-white truncate">{file.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Result Panel */}
                    <div className="p-5 md:p-6 flex flex-col md:w-3/5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Analysis Vector</p>
                          <h3 className="text-xl font-display font-bold text-zinc-900">
                            {file.status === 'completed' ? 'Analysis Complete' : file.status === 'failed' ? 'Analysis Failed' : 'In Progress'}
                          </h3>
                        </div>
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm shrink-0',
                          file.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          file.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-indigo-50 text-indigo-600 border-indigo-100')}>
                          {file.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                           file.status === 'failed' ? <ShieldAlert className="w-5 h-5" /> :
                           <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-5 h-5" /></motion.div>}
                        </div>
                      </div>

                      {/* Completed */}
                      {file.status === 'completed' && file.result && (
                        <div className="space-y-4">
                          {file.mode === 'authenticity' ? (
                            <>
                              <div className={cn('p-5 rounded-[1.5rem] border shadow-sm', verdictStyle(file.result.verdict).bg)}>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-2 flex-1">
                                    <div className={cn('inline-block px-4 py-2 rounded-xl text-white font-black text-[10px] tracking-widest shadow-lg', verdictStyle(file.result.verdict).badge)}>
                                      {file.result.verdict}
                                    </div>
                                    <h4 className="text-lg font-display font-bold text-zinc-900">{verdictLabel(file.result.verdict).title}</h4>
                                    <p className="text-xs text-zinc-500">{verdictLabel(file.result.verdict).desc}</p>
                                  </div>
                                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                      <circle cx="50%" cy="50%" r="42%" stroke="#f4f4f5" strokeWidth="6" fill="transparent" />
                                      <motion.circle cx="50%" cy="50%" r="42%" stroke={verdictStyle(file.result.verdict).ring} strokeWidth="6" fill="transparent"
                                        strokeDasharray="264" initial={{ strokeDashoffset: 264 }}
                                        animate={{ strokeDashoffset: 264 * (1 - (file.result.trust_score || 0) / 100) }}
                                        transition={{ duration: 2, ease: 'circOut' }} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-xl font-display font-bold text-zinc-900">{file.result.trust_score}</span>
                                      <span className="text-[9px] font-black text-zinc-400 uppercase">Trust</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-[1.25rem] bg-zinc-50 border border-zinc-100">
                                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />Risk</p>
                                  <span className={cn('text-base font-display font-bold', file.result.risk_profile === 'Minimal' ? 'text-emerald-600' : 'text-rose-600')}>{file.result.risk_profile}</span>
                                </div>
                                <div className="p-4 rounded-[1.25rem] bg-zinc-50 border border-zinc-100">
                                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Zap className="w-3 h-3" />AI Probability</p>
                                  <span className="text-base font-display font-bold text-zinc-900">{file.result.ai_probability}%</span>
                                </div>
                              </div>

                              {file.result.forensic_checks?.length > 0 && (
                                <div className="rounded-[1.5rem] border border-zinc-100 overflow-hidden bg-white">
                                  <button onClick={() => toggleExpand(file.id)} className="w-full p-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-lg bg-zinc-100"><Activity className="w-3.5 h-3.5 text-zinc-400" /></div>
                                      <span className="text-xs font-bold text-zinc-900 uppercase">Forensic Evidence Log</span>
                                    </div>
                                    {expandedFiles.has(file.id) ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                                  </button>
                                  <AnimatePresence>
                                    {expandedFiles.has(file.id) && (
                                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <div className="p-5 pt-2 space-y-4">
                                          {file.result.forensic_checks.map(check => (
                                            <div key={check.label} className="space-y-1">
                                              <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{check.label}</span>
                                                <Badge variant="outline" className={cn('rounded-full border-none text-[9px] font-black px-3 h-5',
                                                  ['Optimal','Consistent','Original'].includes(check.status) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                )}>{check.status}</Badge>
                                              </div>
                                              <p className="text-[10px] text-zinc-400 font-medium">{check.details}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="p-5 rounded-[1.5rem] bg-emerald-50/10 border border-emerald-100/50 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Zap className="w-4 h-4" /></div>
                                  <h4 className="text-xs font-bold text-zinc-900">Extracted Text</h4>
                                </div>
                                <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 rounded-full text-xs font-bold">{file.result.ocr_confidence}% Confidence</Badge>
                              </div>
                              <div className="bg-white rounded-[1.25rem] p-4 border border-emerald-50 shadow-inner max-h-[160px] overflow-y-auto">
                                <pre className="text-xs font-mono text-zinc-700 leading-relaxed whitespace-pre-wrap">{file.result.extracted_text || 'No text detected.'}</pre>
                              </div>
                              <div className="mt-4 flex gap-3">
                                <Button onClick={() => navigator.clipboard.writeText(file.result.extracted_text || '')} variant="outline" className="flex-1 rounded-xl border-zinc-200 font-bold h-10 text-xs">Copy Text</Button>
                                <Button onClick={() => { const b = new Blob([file.result.extracted_text || ''], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${file.name}.txt`; a.click(); }} className="flex-1 rounded-xl bg-zinc-900 text-white font-bold h-10 text-xs hover:bg-zinc-800">
                                  <Download className="w-4 h-4 mr-2" />Download
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Failed */}
                      {file.status === 'failed' && (
                        <p className="text-sm text-rose-500 font-medium mt-2">Processing failed. Please try again.</p>
                      )}

                      {/* Progress */}
                      {file.status === 'analyzing' && (
                        <div className="space-y-5 mt-2">
                          <div className="space-y-2">
                            <div className="flex justify-between items-end">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                                {activeMode === 'authenticity' ? 'Scanning Pixel Matrices' : 'Extracting OCR Stream'}
                              </p>
                              <span className="text-xl font-display font-bold text-zinc-900">{Math.round(file.progress)}%</span>
                            </div>
                            <div className="h-3 w-full bg-zinc-50 rounded-full border border-zinc-100 overflow-hidden relative shadow-inner">
                              <motion.div className={cn('h-full rounded-full', activeMode === 'authenticity' ? 'bg-indigo-600' : 'bg-emerald-600')} initial={{ width: 0 }} animate={{ width: `${file.progress}%` }} />
                              <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-y-0 w-32 bg-white/20 skew-x-12" />
                            </div>
                          </div>
                          <div className="flex justify-center gap-8 opacity-50">
                            {[{ icon: Shield, label: 'Securing' }, { icon: Search, label: 'Mapping' }, { icon: Star, label: 'Scoring' }].map((step, idx) => (
                              <div key={step.label} className="flex flex-col items-center gap-2">
                                <div className={cn('p-2 rounded-xl', file.progress > idx * 33 ? 'text-indigo-600 bg-indigo-50' : 'text-zinc-300 bg-zinc-50')}>
                                  <step.icon className="w-4 h-4" />
                                </div>
                                <span className="text-[9px] font-black uppercase text-zinc-400">{step.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
