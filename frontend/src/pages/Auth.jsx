import React, { useState } from 'react';
import { Mail, Eye, EyeOff, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'motion/react';
import { api, saveToken } from '@/lib/api';

export function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const data = await api.login(form.email, form.password);
        saveToken(data.access_token);
        onLogin(data.user ?? null);
      } else {
        await api.register(form.name, form.email, form.password);
        const data = await api.login(form.email, form.password);
        saveToken(data.access_token);
        onLogin(data.user ?? null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] flex flex-col items-center"
      >
        <div className="flex items-center gap-3 mb-10 group">
          <div className="relative">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center relative z-10 shadow-2xl shadow-zinc-200 group-hover:rotate-6 transition-transform duration-500">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -inset-2 bg-indigo-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-display font-black tracking-tighter text-zinc-900 leading-none">
              Scan<span className="text-indigo-600">AI</span>
            </h1>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 mt-1">Forensic Lab</span>
          </div>
        </div>

        <h1 className="text-4xl font-display font-bold text-zinc-900 mb-12 tracking-tight">
          {isLogin ? 'Sign In' : 'Join the Lab'}
        </h1>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[17px] font-bold text-[#001c3d] ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 flex justify-center border-r border-[#cbd5e1] py-1">
                  <User className="w-5 h-5 text-[#334155]" />
                </div>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={set('name')}
                  required
                  className="h-[54px] pl-16 rounded-xl border-[#d1d5db] focus-visible:ring-0 focus-visible:border-[#facc15] transition-all text-base placeholder:text-[#94a3b8]"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[17px] font-bold text-[#001c3d] ml-1">Email</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 flex justify-center border-r border-[#cbd5e1] py-1">
                <Mail className="w-5 h-5 text-[#334155]" />
              </div>
              <Input
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={set('email')}
                required
                className="h-[54px] pl-16 rounded-xl border-[#d1d5db] focus-visible:ring-0 focus-visible:border-[#facc15] transition-all text-base placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[17px] font-bold text-[#001c3d] ml-1">Password</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-8 flex justify-center border-r border-[#cbd5e1] py-1 cursor-pointer z-10"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-[#334155]" /> : <Eye className="w-5 h-5 text-[#334155]" />}
              </button>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                value={form.password}
                onChange={set('password')}
                required
                className="h-[54px] pl-16 rounded-xl border-[#d1d5db] focus-visible:ring-0 focus-visible:border-[#94a3b8] transition-all text-base placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-bold text-rose-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-xl bg-[#ff8080] text-white hover:bg-[#ff7070] font-bold text-[22px] transition-all shadow-lg shadow-[#ff8080]/20 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Sign Up'}
          </Button>
        </form>

        <p className="text-[#001c3d] text-[17px] font-medium text-center mt-10">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-[#475569] underline font-medium hover:text-[#001c3d] transition-colors"
          >
            {isLogin ? 'Sign Up here' : 'Login here'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
