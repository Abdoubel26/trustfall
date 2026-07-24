"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { useEffect } from "react";
import { playLoadingBGM } from "@/lib/audio";

export default function Loading() {
  useEffect(() => {
    playLoadingBGM();
  }, []);

  return (
    <div className="bg-[url('/bg2.gif')] bg-cover bg-center min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 font-mono select-none relative overflow-x-hidden">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-0" />

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-6 sm:mb-10 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 border-2 border-emerald-500/25 rounded-full"
            animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.7, 0.25] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-4 sm:inset-5 border border-emerald-400/20 rounded-full"
            animate={{ scale: [1.15, 1, 1.15], opacity: [0.15, 0.45, 0.15] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] rounded-full" />

          <AnimatePresence mode="wait">
            <motion.div key="loading" className="flex flex-col items-center text-emerald-500">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full bg-black/70 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-stone-500 uppercase tracking-[0.2em] border-b border-slate-700/50 pb-3">
            <Users className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>Finding an Opponent</span>
          </div>
        </div>

        <p className="mt-4 sm:mt-6 text-center text-xs text-stone-500 max-w-xs leading-relaxed">
          One more player needed.
        </p>
      </div>
    </div>
  );
}