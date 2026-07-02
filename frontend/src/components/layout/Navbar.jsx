import React, { useEffect, useMemo, useState } from 'react';
import { Search, Bell, User, ChevronDown, Settings, Menu, FileText, Clock, X, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Navbar({ onNavigate, onMenuClick, user, avatar, isAuthenticated }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scans, setScans] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const name = user?.name || 'Guest';
  const email = user?.email || '';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const loadScans = () => {
    if (!isAuthenticated) {
      setScans([]);
      return;
    }
    api.history().then(setScans).catch(() => setScans([]));
  };

  useEffect(() => {
    loadScans();
  }, [isAuthenticated]);

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];

    return scans
      .filter(scan => [
        scan.filename,
        scan.mode,
        scan.status,
        scan.verdict,
        scan.risk_profile,
        scan.extracted_text,
      ].some(value => String(value || '').toLowerCase().includes(q)))
      .slice(0, 6);
  }, [scans, searchTerm]);

  const openResult = () => {
    setIsSearchOpen(false);
    onNavigate?.('history');
  };

  return (
    <header className="h-16 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/80 transition-colors"
        >
          <Menu className="w-6 h-6 text-zinc-900" />
        </button>
        
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
            <Input 
              placeholder="Search documents, entities, analysis..." 
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                loadScans();
                setIsSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchTerm.trim()) openResult();
                if (event.key === 'Escape') setIsSearchOpen(false);
              }}
              className="pl-10 h-10 bg-white/50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-zinc-200 placeholder:text-zinc-400 text-zinc-900 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <AnimatePresence>
              {isSearchOpen && searchTerm.trim() && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsSearchOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden z-20"
                  >
                    {searchResults.length > 0 ? (
                      <div className="p-2">
                        {searchResults.map(scan => (
                          <button
                            key={scan.id}
                            onClick={openResult}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors text-left"
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                              scan.verdict === 'AUTHENTIC' ? "bg-emerald-50 text-emerald-600" :
                              scan.verdict === 'AI GENERATED' ? "bg-purple-50 text-purple-600" :
                              scan.verdict === 'REVIEW NEEDED' ? "bg-amber-50 text-amber-600" :
                              scan.verdict ? "bg-rose-50 text-rose-600" :
                              "bg-zinc-50 text-zinc-500"
                            )}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-zinc-900 truncate">{scan.filename}</p>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                <span>{scan.verdict || scan.mode || scan.status}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : 'No date'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={openResult}
                          className="w-full mt-1 px-3 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                          Open History
                        </button>
                      </div>
                    ) : (
                      <div className="p-5 text-center">
                        <p className="text-sm font-bold text-zinc-500">No matching scans</p>
                        <p className="text-xs text-zinc-400 mt-1">Try a filename, verdict, mode, or extracted OCR text.</p>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/80 transition-colors relative group">
              <Bell className="w-5 h-5 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-zinc-900 rounded-full border-2 border-zinc-50" />
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-6 w-px bg-zinc-200 mx-1" />

        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={cn(
              "flex items-center gap-3 p-1 pr-3 rounded-xl transition-all border border-transparent group",
              isProfileOpen ? "bg-white border-zinc-200 shadow-sm" : "hover:bg-white/80 hover:border-zinc-100"
            )}
          >
            <Avatar className="w-8 h-8 rounded-lg shadow-sm">
              {avatar
                ? <AvatarImage src={avatar} className="object-cover" />
                : null
              }
              <AvatarFallback className="rounded-lg bg-indigo-600 text-white font-bold text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left hidden md:block">
              <p className="text-sm font-bold text-zinc-900 leading-none">{name}</p>
              <p className="text-[10px] text-zinc-500 font-bold leading-normal uppercase tracking-[0.1em]">{isAuthenticated ? (user?.role || 'user') : 'public'}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-all", isProfileOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsProfileOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden z-20"
                >
                  <div className="p-5 border-b border-zinc-50 bg-zinc-50/50">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">{isAuthenticated ? 'User Profile' : 'Public View'}</p>
                    <p className="text-sm font-bold text-zinc-900 truncate">{email || 'Sign in to use scans and OCR'}</p>
                  </div>
                  <div className="p-2">
                    {(isAuthenticated
                      ? [
                          { label: 'My Profile', icon: User, onClick: () => onNavigate('profile') },
                          { label: 'Settings', icon: Settings, onClick: () => onNavigate('profile') },
                        ]
                      : [
                          { label: 'Sign In', icon: LogIn, onClick: () => onNavigate('login') },
                        ]
                    ).map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { item.onClick(); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-all group"
                      >
                        <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
