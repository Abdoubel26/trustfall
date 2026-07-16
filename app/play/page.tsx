"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldAlert, Terminal } from "lucide-react";
import Pusher from "pusher-js";
import { v4 as uuidv4 } from "uuid";

export default function PlayPage() {
  const router = useRouter();
  const [status, setStatus] = useState("initializing");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [dots, setDots] = useState("");

  const log = (msg: string) => {
    setTerminalLogs((prev) => [...prev.slice(-4), `> ${msg}`]);
  };

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  useEffect(() => {
    let playerId = sessionStorage.getItem("trustfall_player_id");
    if (!playerId) {
      playerId = `usr_${uuidv4().substring(0, 8)}`;
      sessionStorage.setItem("trustfall_player_id", playerId);
    }

    log(`SECURE PROTOCOL ALLOCATED: ${playerId}`);
    log("INITIALIZING SOCKETS");

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "your_key", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
    });

    const channel = pusher.subscribe(`user-${playerId}`);
    
    channel.bind("match-found", (data: { roomId: string; opponentId: string }) => {
      log("BIOMETRIC MATCH IDENTIFIED!");
      setStatus("matched");
      setTimeout(() => {
        router.push(`/game/${data.roomId}?opponent=${data.opponentId}`);
      }, 1500);
    });

    const startMatchmaking = async () => {
      try {
        setStatus("searching");
        log("SEARCHING TRANS-NET GRID...");
        
        const res = await fetch("/api/matchmake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });
        
        const data = await res.json();

        if (data.status === "matched") {
          log("ESTABLISHING HANDSHAKE LINK...");
          setStatus("matched");
          setTimeout(() => {
            router.push(`/play/${data.roomId}?opponent=${data.opponentId}`);
          }, 1500);
        } else if (data.status === "waiting") {
          log("NO RUNNERS DETECTED. WAITING ON THE GRID...");
        }
      } catch (err) {
        log("GRID CONNECTION REJECTED. TIMEOUT.");
        setStatus("error");
      }
    };

    startMatchmaking();

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [router]);

  return (
    <div className="bg-[url('/bg2.gif')] bg-cover bg-center min-h-screen flex flex-col items-center justify-center p-6 font-mono select-none relative overflow-hidden">

      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-0" />

      <div className="z-10 w-full max-w-lg flex flex-col items-center">
        
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          <motion.div 
            className="absolute inset-0 border-2 border-emerald-500/30 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute inset-4 border border-emerald-400/20 rounded-full"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.5, 0.1] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] rounded-full animate-pulse" />
          
          <AnimatePresence mode="wait">
            {status === "matched" ? (
              <motion.div
                key="matched"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="text-emerald-400 font-toxia text-2xl drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              >
                LINK LOCKED
              </motion.div>
            ) : status === "error" ? (
              <motion.div key="error" className="text-red-500 flex flex-col items-center gap-2">
                <ShieldAlert className="w-10 h-10 animate-bounce" />
                <span className="text-xs tracking-widest font-bold">DISCONNECTED</span>
              </motion.div>
            ) : (
              <motion.div key="loading" className="flex flex-col items-center text-emerald-500">
                <Loader2 className="w-12 h-12 animate-spin drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full bg-black/90 border border-emerald-500/30 rounded-lg p-6 shadow-[0_0_25px_rgba(0,0,0,0.9)] min-h-45 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-400/60 uppercase tracking-widest border-b border-emerald-500/20 pb-2 mb-4">
              <Terminal className="w-4 h-4" />
              <span>Grid Connection Console</span>
            </div>
            
            <div className="space-y-2 text-xs font-mono">
              {terminalLogs.map((item, idx) => (
                <div key={idx} className={item.includes("LOCK") || item.includes("BIOMETRIC") ? "text-emerald-400 font-bold" : "text-stone-400"}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="text-emerald-400 text-sm mt-4 border-t border-emerald-500/10 pt-2 flex items-center justify-between">
            <span className="uppercase tracking-widest text-xs">
              {status === "matched" ? "INITIALIZING MATRIX" : `PENDING CONNECTION${dots}`}
            </span>
            <span className="text-[10px] text-emerald-500/40">PORT: 8080</span>
          </div>
        </div>

      </div>
    </div>
  );
}