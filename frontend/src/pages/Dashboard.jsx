import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, FileText, Clock, AlertCircle, Zap, Upload, ArrowUpRight, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { api } from '@/lib/api';

export function Dashboard({ onNavigate, isAuthenticated }) {
  const [scans, setScans] = useState([]);
  const [quickUploads, setQuickUploads] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      refreshScans();
    } else {
      setScans([]);
      setQuickUploads([]);
    }
  }, [isAuthenticated]);

  const refreshScans = () => {
    if (!isAuthenticated) return;
    api.history().then(setScans).catch(() => {});
  };

  const pollResult = async (scanId, localId) => {
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const result = await api.result(scanId);
        if (result.status === 'completed' || result.status === 'failed') {
          setQuickUploads(cur => cur.map(item => (
            item.id === localId
              ? { ...item, status: result.status, progress: 100, result, error: result.error || null }
              : item
          )));
          refreshScans();
          return;
        }
        setQuickUploads(cur => cur.map(item => (
          item.id === localId ? { ...item, progress: Math.min(item.progress + 10, 95) } : item
        )));
      } catch {}
    }
    setQuickUploads(cur => cur.map(item => (
      item.id === localId ? { ...item, status: 'failed', progress: 100, error: 'Scan timed out. Check History or try again.' } : item
    )));
  };

  const addQuickFiles = async (fileList) => {
    if (!isAuthenticated) {
      onNavigate?.('workspace');
      return;
    }

    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const items = files.map(file => ({
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      name: file.name,
      progress: 0,
      status: 'uploading',
      error: null,
      file,
    }));
    setQuickUploads(prev => [...items, ...prev].slice(0, 4));

    for (const item of items) {
      try {
        const { scan_id } = await api.upload(item.file, 'authenticity');
        setQuickUploads(cur => cur.map(upload => (
          upload.id === item.id ? { ...upload, scanId: scan_id, status: 'processing', progress: 12 } : upload
        )));
        pollResult(scan_id, item.id);
      } catch (error) {
        setQuickUploads(cur => cur.map(upload => (
          upload.id === item.id
            ? { ...upload, status: 'failed', progress: 100, error: error.message || 'Upload failed.' }
            : upload
        )));
      }
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    addQuickFiles(event.dataTransfer.files);
  };

  const total = scans.length;
  const completed = scans.filter(s => s.status === 'completed');
  const flagged = completed.filter(s => s.verdict && s.verdict !== 'AUTHENTIC').length;
  const avgConf = completed.length
    ? (completed.reduce((a, s) => a + (s.trust_score || s.ocr_confidence || 0), 0) / completed.length).toFixed(1)
    : 0;

  const stats = [
    { title: 'Total Scans', value: total, change: `${total} total`, icon: FileText, color: 'indigo' },
    { title: 'Avg Confidence', value: `${avgConf}%`, change: 'accuracy', icon: ShieldCheck, color: 'emerald' },
    { title: 'Flagged', value: flagged, change: flagged > 0 ? 'Issues found' : 'All clear', icon: AlertCircle, color: 'amber' },
    { title: 'Processing', value: '~2s', change: 'per scan', icon: Zap, color: 'indigo' },
  ];

  const recent = scans.slice(0, 3);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Operational Overview</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-zinc-900 leading-tight mt-0.5">
              Scan<span className="text-zinc-600">AI</span> <span className="text-zinc-400">Console</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-lg border border-zinc-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          <span className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Active</span>
        </div>
      </div>

      {/* Hero Upload Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-zinc-100 bg-white relative group shadow-xl shadow-zinc-200/40">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-50/50 rounded-full blur-[80px] -mr-32 -mt-32" />
          <CardContent className="p-6 md:p-10 relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
            <div className="flex-1 space-y-4 w-full text-center lg:text-left">
              <div className="space-y-3">
                <h3 className="text-2xl md:text-4xl font-display font-bold text-zinc-900 tracking-tight leading-tight">
                  Direct Verification <span className="text-zinc-400">& OCR Injection</span>
                </h3>
                <p className="text-sm text-zinc-500 max-w-lg font-medium leading-relaxed mx-auto lg:mx-0">
                  Start a new analysis sequence for high-fidelity document verification or intelligent text extraction.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  onClick={() => onNavigate?.('workspace')}
                  className="rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 px-8 h-12 font-black shadow-xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs"
                >
                  Open Workspace
                </Button>
                <Button
                  onClick={() => onNavigate?.('history')}
                  variant="ghost"
                  className="rounded-2xl text-zinc-500 hover:bg-zinc-50 h-12 px-6 font-bold flex items-center justify-center gap-2 group"
                >
                  View History <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                "relative w-full sm:w-[260px] md:w-[300px] aspect-square bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-8 group-hover:border-indigo-200 group-hover:bg-indigo-50/10 transition-all duration-700 shadow-inner overflow-hidden",
                isDragging ? "border-indigo-500 bg-indigo-50/50 ring-8 ring-indigo-50" : "border-zinc-200"
              )}
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                onChange={(event) => {
                  addQuickFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <div className="w-16 h-16 rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform duration-700">
                <Upload className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-sm font-display font-bold text-zinc-900">Drop images to scan</p>
              <p className="text-[10px] text-zinc-400 font-medium mt-1">Quick authenticity scan</p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {quickUploads.length > 0 && (
        <Card className="border-zinc-100 bg-white shadow-sm">
          <CardContent className="p-4 space-y-3">
            {quickUploads.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-zinc-50/60 border border-zinc-100 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    item.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                    item.status === 'failed' ? "bg-rose-50 text-rose-600" :
                    "bg-indigo-50 text-indigo-600"
                  )}>
                    {item.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                     item.status === 'failed' ? <AlertCircle className="w-4 h-4" /> :
                     <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate">{item.name}</p>
                    <p className={cn("text-xs font-medium truncate", item.status === 'failed' ? "text-rose-500" : "text-zinc-400")}>
                      {item.error || item.result?.verdict || item.status}
                    </p>
                  </div>
                </div>
                <div className="w-full sm:w-40">
                  <div className="h-2 rounded-full bg-white border border-zinc-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.status === 'completed' ? "bg-emerald-500" :
                        item.status === 'failed' ? "bg-rose-500" :
                        "bg-indigo-600"
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="overflow-hidden group hover:shadow-xl transition-all duration-500 bg-white border-zinc-100">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-5">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:bg-indigo-900 group-hover:text-white",
                    stat.color === 'indigo' && "bg-indigo-50 text-indigo-600",
                    stat.color === 'emerald' && "bg-emerald-50 text-emerald-600",
                    stat.color === 'amber' && "bg-amber-50 text-amber-600",
                  )}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="bg-zinc-50 text-zinc-500 border-none font-bold text-[10px] uppercase tracking-widest px-2">
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-1">{stat.title}</p>
                <h3 className="text-2xl font-display font-bold text-zinc-900">{stat.value}</h3>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Pipeline */}
      <Card className="border-zinc-100 bg-white shadow-lg">
        <CardHeader className="p-6 pb-3">
          <CardTitle className="font-display font-bold text-zinc-900 text-lg">Active Pipeline</CardTitle>
          <CardDescription className="text-xs font-medium text-zinc-400">Live document verification feed</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300">
                <Clock className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No recent scans</p>
              <p className="text-xs text-zinc-400">Upload a file in the Workspace to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {recent.map(scan => (
                <div key={scan.id} className="flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      scan.verdict === 'AUTHENTIC' ? "bg-emerald-50 text-emerald-600" :
                      scan.verdict === 'AI GENERATED' ? "bg-purple-50 text-purple-600" :
                      scan.verdict === 'REVIEW NEEDED' ? "bg-amber-50 text-amber-600" :
                      scan.verdict ? "bg-rose-50 text-rose-600" : "bg-zinc-50 text-zinc-400"
                    )}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 truncate max-w-[180px]">{scan.filename}</p>
                      <p className="text-[10px] text-zinc-400 font-medium uppercase">{scan.mode} | {new Date(scan.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "rounded-full border-none text-[10px] font-bold px-3",
                    scan.verdict === 'AUTHENTIC' ? "bg-emerald-50 text-emerald-600" :
                    scan.verdict === 'AI GENERATED' ? "bg-purple-50 text-purple-600" :
                    scan.verdict === 'REVIEW NEEDED' ? "bg-amber-50 text-amber-600" :
                    scan.verdict ? "bg-rose-50 text-rose-600" : "bg-zinc-50 text-zinc-500"
                  )}>
                    {scan.verdict || scan.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
