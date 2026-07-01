import React, { useState, useEffect } from 'react';
import { Filter, Download, Clock, FileText, Search as SearchIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.history()
      .then(setScans)
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = scans.filter(s => s.filename?.toLowerCase().includes(searchTerm.toLowerCase()));

  const getResult = (scan) => {
    if (scan.mode === 'ocr') return 'OCR';
    return scan.verdict ? scan.verdict.charAt(0) + scan.verdict.slice(1).toLowerCase() : scan.status;
  };

  const getConfidence = (scan) => {
    if (scan.mode === 'ocr') return scan.ocr_confidence ? `${scan.ocr_confidence}%` : '-';
    return scan.trust_score ? `${scan.trust_score}%` : '-';
  };

  const getResultColor = (scan) => {
    const v = scan.verdict;
    if (!v) return { dot: 'bg-zinc-400', text: 'text-zinc-600' };
    if (v === 'AUTHENTIC') return { dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]', text: 'text-emerald-700' };
    if (v === 'AI GENERATED') return { dot: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]', text: 'text-purple-700' };
    if (v === 'REVIEW NEEDED') return { dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]', text: 'text-amber-700' };
    return { dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]', text: 'text-rose-700' };
  };

  const exportCsv = () => {
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Document', 'Mode', 'Result', 'Confidence', 'File Size', 'Date'],
      ...filtered.map(item => [
        item.filename,
        item.mode,
        getResult(item),
        getConfidence(item),
        item.file_size,
        item.created_at ? new Date(item.created_at).toLocaleString() : '',
      ]),
    ];
    const csv = rows.map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scanai-history.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Compliance & Audit</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-zinc-900 leading-tight mt-0.5">
              Verification <span className="text-zinc-400">Ledger</span>
            </h2>
          </div>
        </div>
        <Button onClick={exportCsv} variant="outline" className="rounded-2xl border-zinc-200 font-bold h-10 px-5 bg-white text-sm">
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <Card className="border-zinc-100 shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b border-zinc-50 flex flex-col md:flex-row md:items-center gap-3 bg-zinc-50/30">
          <div className="relative flex-1 w-full md:max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search by file name..."
              className="pl-10 h-10 rounded-xl border-zinc-200 bg-white shadow-sm focus-visible:ring-zinc-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 w-full md:w-auto rounded-xl border-zinc-200 px-4 bg-white">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Document</th>
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Result</th>
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Confidence</th>
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-400 font-medium">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-400 font-medium">No scans found. Upload a file in the Workspace to get started.</td></tr>
              ) : filtered.map((item, i) => {
                const colors = getResultColor(item);
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-zinc-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-zinc-900 tracking-tight">{item.filename}</span>
                          <p className="text-[10px] font-medium text-zinc-400">{item.mode?.toUpperCase()} | {item.file_size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
                        <span className={cn("text-sm font-bold tracking-tight", colors.text)}>{getResult(item)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-display font-bold text-zinc-900">{getConfidence(item)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-zinc-50 bg-zinc-50/10 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">Showing {filtered.length} entries</p>
        </div>
      </Card>
    </div>
  );
}
