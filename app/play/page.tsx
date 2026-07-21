"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { playLoadingBGM } from "../lib/audio";

export default function PlayPage() {
  const router = useRouter();
  const [status, setStatus] = useState("initializing");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [dots, setDots] = useState("");
  const [socketId, setSocketId] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const hasMatched = useRef(false);

  const log = (msg: string) => {
    setTerminalLogs((prev) => [...prev.slice(-4), `> ${msg}`]);
  };
  
  useEffect(() => {
      playLoadingBGM()
    }, [])

  // Dots animation helper
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  useEffect(() => {
    log("Looking for someone willing to play...");
    log("Connecting to the matchmaking table...");
    setStatus("searching");

    // Connect to the custom standalone websocket server
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketId(socket.id || "");
      log("Searching for another player...");
      
      // Request matchmaking registration immediately upon connection
      socket.emit("match");
    });

    socket.on("matchFound", (data: { roomId: string; opponentId: string }) => {
      if (hasMatched.current) return;
      hasMatched.current = true;

      log(`Opponent found.`);
      log(`Heading to the table...`);
      setStatus("matched");

      // Smooth redirection to the dynamic room route under /play/[roomId]
      setTimeout(() => {
        router.push(`/play/${data.roomId}?opponent=${data.opponentId}`);
      }, 1500);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket error connection:", error);
      log("Couldn't reach the table. Try again.");
      setStatus("error");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [router]);

  return (
    <div className="bg-[url('/bg2.gif')] bg-cover bg-center min-h-screen flex flex-col items-center justify-center p-6 font-mono select-none relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-0" />

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        
        {/* Animated Radial Rings + Status Icon */}
        <div className="relative w-44 h-44 mb-10 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 border-2 border-emerald-500/25 rounded-full"
            animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.7, 0.25] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-5 border border-emerald-400/20 rounded-full"
            animate={{ scale: [1.15, 1, 1.15], opacity: [0.15, 0.45, 0.15] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] rounded-full" />

          <AnimatePresence mode="wait">
            {status === "matched" ? (
              <motion.div
                key="matched"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center text-emerald-400"
              >
                <Users className="w-12 h-12 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                <span className="mt-2 text-sm font-bold tracking-widest uppercase">Matched</span>
              </motion.div>
            ) : status === "error" ? (
              <motion.div key="error" className="text-red-500 flex flex-col items-center gap-2">
                <ShieldAlert className="w-11 h-11" />
                <span className="text-xs tracking-widest font-bold uppercase">Connection Lost</span>
              </motion.div>
            ) : (
              <motion.div key="loading" className="flex flex-col items-center text-emerald-500">
                <Loader2 className="w-12 h-12 animate-spin drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Card */}
        <div className="w-full bg-black/70 border border-slate-700/60 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-stone-500 uppercase tracking-[0.2em] border-b border-slate-700/50 pb-3 mb-4">
            <Users className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>Finding an Opponent</span>
          </div>

          <div className="space-y-2.5 text-sm min-h-27.5">
            {terminalLogs.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className={
                  item.includes("found") || item.includes("Seat") || item.includes("Heading")
                    ? "text-emerald-400 font-medium"
                    : "text-stone-400"
                }
              >
                {item.replace(/^>\s*/, "")}
              </motion.div>
            ))}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-700/40 flex items-center justify-between">
            <span className="text-xs tracking-wide text-stone-400">
              {status === "matched"
                ? "Entering the room..."
                : status === "error"
                ? "Something went wrong"
                : `Waiting for a match${dots}`}
            </span>
            {status !== "error" && status !== "matched" && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500/70"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-500 max-w-xs leading-relaxed">
          One more player needed. Will they cooperate… or defect?
        </p>
      </div>
    </div>
  );
}