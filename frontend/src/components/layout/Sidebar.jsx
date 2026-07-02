import React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Upload,
  History,
  BarChart3,
  User,
  Settings,
  LogOut,
  LogIn,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";

const navItems = [
  { title: "Dashboard", href: "dashboard", icon: LayoutDashboard },
  { title: "Upload", href: "workspace", icon: Upload },
  { title: "History", href: "history", icon: History },
  { title: "Analytics", href: "analytics", icon: BarChart3 },
];

export function Sidebar({ currentPath, onNavigate, isOpen, onClose, user, isAuthenticated }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-100 bg-zinc-50 flex flex-col h-full overflow-hidden transition-all duration-300 transform lg:relative lg:translate-x-0 outline-none",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-8 pb-4">
        <div
          className="flex items-center gap-3 group cursor-pointer"
          onClick={() => onNavigate("dashboard")}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center relative z-10 shadow-lg shadow-zinc-200 group-hover:rotate-6 transition-transform duration-500">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -inset-1 bg-indigo-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-display font-extrabold tracking-tighter text-zinc-900 leading-none">
              Scan<span className="text-zinc-950">AI</span>
            </h1>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 mt-0.5">
              Forensic Lab
            </span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-2 py-4">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <button
                key={item.href}
                onClick={() => onNavigate(item.href)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 outline-none",
                  isActive
                    ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200/50"
                    : "text-zinc-400 hover:bg-white hover:text-zinc-900 hover:shadow-sm",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110",
                    isActive
                      ? "text-white"
                      : "text-zinc-400 group-hover:text-zinc-900",
                  )}
                />
                {item.title}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-zinc-100 bg-zinc-100/50 flex flex-col gap-2">
        <button
          onClick={() => onNavigate(isAuthenticated ? "profile" : "login")}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl p-2 transition-all group mb-2 border border-transparent hover:border-zinc-200 hover:shadow-sm",
            currentPath === "profile"
              ? "bg-white border-zinc-200 shadow-sm"
              : "hover:bg-white/80",
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-zinc-900 font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'G'}
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-bold text-zinc-900 truncate">
              {user?.name || 'Guest'}
            </p>
            <p className="text-[10px] text-zinc-400 font-medium truncate">
              {user?.email || 'Sign in to scan'}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 ml-auto text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
        </button>
        {/* <button
          onClick={() => onNavigate("settings")}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors group"
        >
          <Settings className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
          Settings
        </button> */}
        <button
          onClick={() => onNavigate(isAuthenticated ? "logout" : "login")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors group",
            isAuthenticated ? "text-red-500 hover:bg-red-50" : "text-indigo-600 hover:bg-indigo-50"
          )}
        >
          {isAuthenticated ? (
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          ) : (
            <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          )}
          {isAuthenticated ? 'Sign Out' : 'Sign In'}
        </button>
      </div>
    </aside>
  );
}
