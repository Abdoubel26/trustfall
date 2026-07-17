import { Users, Bot, Swords } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-[url('/bg.gif')] bg-cover bg-center min-h-screen flex flex-col justify-center p-6 select-none">
      
      <div className="text-center mb-12">
        <h1 className="text-[5rem] md:text-[10rem] font-bold tracking-widest uppercase font-toxia text-transparent bg-clip-text bg-linear-to-b from-stone-900 to-black [-webkit-text-stroke:2px_rgba(239,68,68,0.8)] drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] transition-all duration-500 hover:[-webkit-text-stroke:2px_#ffffff] hover:drop-shadow-[0_0_25px_rgba(16,185,129,0.8)] group cursor-pointer">
          Trust
          <span className="text-red-600 font-bold [-webkit-text-stroke:2px_#000000] drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse">
            fall
          </span>
        </h1>
      </div>

      <div className="w-full border-emerald-500/30 backdrop-blur-md rounded-xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-row gap-4">
        
        <Link href="/play" className="group w-full justify-center cursor-pointer flex items-center p-2 rounded-lg bg-slate-900/40 border border-emerald-500/20 hover:border-emerald-400 text-stone-200 hover:text-emerald-400 font-mono tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-500 group-hover:animate-pulse group-hover:scale-110 transition-transform" />
            <span className="uppercase font-bold text-lg">Play with Human</span>
          </div>
        </Link>

        <Link href="/challenge-ai" className="group w-full justify-center cursor-pointer flex items-center p-2 rounded-lg bg-slate-900/40 border border-emerald-500/20 hover:border-emerald-400 text-stone-200 hover:text-emerald-400 font-mono tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="uppercase font-bold text-lg">Challenge AI </span>
          </div>
        </Link>

        <Link href="/ai-spectator" className="group w-full justify-center cursor-pointer flex items-center p-2 rounded-lg bg-slate-900/40 border border-red-500/20 hover:border-red-500 text-stone-200 hover:text-red-500 font-mono tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:bg-red-950/10">
          <div className="flex items-center gap-2">
            <Swords className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
            <span className="uppercase text-lg font-bold">AI Spectator Arena</span>
          </div>
        </Link>

      </div>

    </div>
  );
}