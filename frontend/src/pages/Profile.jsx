import React, { useState, useRef } from 'react';
import { User, Mail, Shield, Bell, ShieldCheck, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function Profile({ user, onAvatarChange }) {
  const name = user?.name || 'User';
  const email = user?.email || '—';
  const role = user?.role || 'user';
  const [avatar, setAvatar] = useState(() => localStorage.getItem('scanai_avatar') || null);
  const fileRef = useRef();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      localStorage.setItem('scanai_avatar', base64);
      setAvatar(base64);
      onAvatarChange?.(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1000px] mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-4 px-1">
        <div className="w-11 h-11 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Security Protocol</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-zinc-900 leading-tight mt-0.5">
            Profile <span className="text-zinc-400">Identity</span>
          </h2>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white rounded-[2rem] border border-zinc-100 shadow-lg">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
            {avatar
              ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              : <User className="w-10 h-10 text-indigo-300" />
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 text-white rounded-xl border-2 border-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="text-center md:text-left flex-1">
          <h2 className="text-2xl font-display font-bold tracking-tight text-zinc-900">{name}</h2>
          <p className="text-sm text-zinc-500 font-medium mt-0.5 capitalize">{role}</p>
        </div>
      </div>

      <Card className="bg-white border-zinc-100 shadow-lg">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="font-display font-bold text-lg tracking-tight">Account Information</CardTitle>
          <CardDescription>Your primary contact and personal details.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Full Name</label>
              <div className="flex items-center gap-3 p-4 bg-zinc-100/50 rounded-2xl border border-zinc-200/50">
                <User className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">{name}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Address</label>
              <div className="flex items-center gap-3 p-4 bg-zinc-100/50 rounded-2xl border border-zinc-200/50">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">{email}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <h4 className="text-sm font-bold text-zinc-900 mb-4 uppercase tracking-wider">Security Preferences</h4>
            <div className="space-y-3">
              {[
                { icon: Bell, label: 'Email Notifications', desc: 'Alerts on document verification completion.', active: true },
                { icon: Shield, label: 'Two-Factor Authentication', desc: 'Secure your account with an extra layer.', active: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl hover:bg-zinc-50 transition-all border border-transparent hover:border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{item.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <div className={item.active ? 'w-10 h-5 bg-indigo-600 rounded-full p-0.5' : 'w-10 h-5 bg-zinc-200 rounded-full p-0.5'}>
                    <div className={item.active ? 'w-4 h-4 bg-white rounded-full ml-auto shadow-sm' : 'w-4 h-4 bg-white rounded-full shadow-sm'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
