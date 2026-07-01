import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, ShieldCheck, Zap, Database, Activity, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function Analytics() {
  const [scans, setScans] = useState([]);

  useEffect(() => {
    api.history().then(setScans).catch(() => {});
  }, []);

  const total = scans.length;
  const completed = scans.filter(s => s.status === 'completed');
  const flagged = completed.filter(s => s.verdict && s.verdict !== 'AUTHENTIC').length;
  const avgConf = completed.length
    ? (completed.reduce((a, s) => a + (s.trust_score || s.ocr_confidence || 0), 0) / completed.length).toFixed(1)
    : 0;

  const stats = [
    { label: 'Total Volume', value: total, trend: `${total} scans`, trendType: 'up', icon: Database },
    { label: 'Avg Confidence', value: `${avgConf}%`, trend: 'accuracy', trendType: 'up', icon: Star },
    { label: 'Flagged', value: flagged, trend: `${flagged} issues`, trendType: flagged > 0 ? 'down' : 'up', icon: ShieldCheck },
    { label: 'Throughput', value: '~2s', trend: 'per scan', trendType: 'up', icon: Zap },
  ];

  // Build daily chart data from real scans
  const dayMap = {};
  scans.forEach(s => {
    const day = new Date(s.created_at).toLocaleDateString('en-US', { weekday: 'short' });
    dayMap[day] = (dayMap[day] || 0) + 1;
  });
  const chartData = Object.entries(dayMap).map(([name, count]) => ({ name, scans: count }));

  const confData = completed.map((s, i) => ({
    name: `#${i + 1}`,
    accuracy: s.trust_score || s.ocr_confidence || 0,
  }));

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-4 px-1">
        <div className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Platform Intelligence</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-zinc-900 leading-tight mt-0.5">
            Enterprise <span className="text-zinc-400">Metrics</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-zinc-100 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-xl bg-zinc-50 text-zinc-500">
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className={cn(
                    "rounded-full text-[10px] font-bold px-2",
                    stat.trendType === 'up' ? "text-emerald-600 bg-emerald-50/50 border-emerald-100" : "text-rose-600 bg-rose-50/50 border-rose-100"
                  )}>
                    {stat.trend}
                  </Badge>
                </div>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-display font-bold text-zinc-900">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 p-5">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Scan Volume</CardTitle>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">Daily document throughput.</p>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><TrendingUp className="w-4 h-4" /></div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="h-[220px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cScans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="scans" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#cScans)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-400 font-medium">No scan data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 p-5">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Confidence Scores</CardTitle>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">Per-scan confidence trend.</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Activity className="w-4 h-4" /></div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="h-[220px]">
              {confData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={confData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-400 font-medium">No confidence data yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
