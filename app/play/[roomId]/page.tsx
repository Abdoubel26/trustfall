"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  ChevronRight,
  Trophy,
  ShieldAlert,
  Handshake,
  Skull,
  Lock,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

type Choice = "cooperate" | "defect";
type RoundResult = "dopamine" | "shame" | "hooray" | "ruin" | null;

export default function GameRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params?.roomId as string;
  const opponentId = searchParams?.get("opponent") || "Opponent";

  const [socketId, setSocketId] = useState("");
  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null);

  const [myLocked, setMyLocked] = useState(false);
  const [opponentLocked, setOpponentLocked] = useState(false);

  const [gameState, setGameState] = useState<"deciding" | "revealing" | "result">("deciding");
  const [outcome, setOutcome] = useState<RoundResult>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [maxRounds, setMaxRounds] = useState(7)
  const roundRef = useRef(1);
  const [roundDisplay, setRoundDisplay] = useState(1);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketId(socket.id || "");
      socket.emit("joinRoom", { roomId });
    });

    socket.on("opponentLockedIn", () => {
      setOpponentLocked(true);
    });

    socket.on("revealChoices", (data: { choices: Record<string, Choice> }) => {
      const myId = socket.id || "";
      const keys = Object.keys(data.choices);
      const targetId = keys.find((id) => id !== myId) || "";
      
      const mine = data.choices[myId];
      const theirs = data.choices[targetId];
      
      if (mine && theirs) {
        setOpponentChoice(theirs);
        triggerRevealSequence(mine, theirs);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    let TimeOut: ReturnType<typeof setTimeout> | null = null;
    
    if (gameState === "result") {
      TimeOut = setTimeout(() => {
        resetNextRound();
      }, 3000);
    }

    return () => {
      if (TimeOut) clearTimeout(TimeOut);
    };
  }, [gameState]);


  const handleLockIn = async (action: Choice) => {
    if (myLocked || gameState !== "deciding") return;

    setMyChoice(action);
    setMyLocked(true);
    socketRef.current?.emit("play", {
      roomId,
      action,
    });
  };

  const triggerRevealSequence = (mine: Choice, theirs: Choice) => {
    setGameState("revealing");
    setTimeout(() => {
      setGameState("result");

      if (mine === "defect" && theirs === "cooperate") {
        setOutcome("dopamine");
        setMyScore((prev) => prev + 300);
      } else if (mine === "cooperate" && theirs === "defect") {
        setOutcome("shame");
        setOpponentScore((prev) => prev + 300);
      } else if (mine === "cooperate" && theirs === "cooperate") {
        setOutcome("hooray");
        setMyScore((prev) => prev + 100);
        setOpponentScore((prev) => prev + 100);
      } else {
        setOutcome("ruin");
        setMyScore((prev) => prev + 50);
        setOpponentScore((prev) => prev + 50);
      }
    }, 2000);
  };

  const resetNextRound = () => {
    roundRef.current += 1;
    setRoundDisplay(roundRef.current);
    setMyChoice(null);
    setOpponentChoice(null);
    setMyLocked(false);
    setOpponentLocked(false);
    setGameState("deciding");
    setOutcome(null);
  };

  const ambientBg =
    outcome === "dopamine"
      ? "bg-amber-950/50"
      : outcome === "shame"
      ? "bg-red-950/60"
      : outcome === "hooray"
      ? "bg-emerald-950/40"
      : outcome === "ruin"
      ? "bg-zinc-950/80"
      : "bg-slate-950/70";

  const ambientGlow =
    outcome === "dopamine"
      ? "shadow-[0_0_80px_rgba(245,158,11,0.25)]"
      : outcome === "shame"
      ? "shadow-[0_0_80px_rgba(239,68,68,0.3)]"
      : outcome === "hooray"
      ? "shadow-[0_0_80px_rgba(16,185,129,0.25)]"
      : outcome === "ruin"
      ? "shadow-[0_0_60px_rgba(113,113,122,0.2)]"
      : "";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-between p-4 md:p-6 select-none font-mono transition-all duration-1000 relative overflow-hidden ${ambientBg}`}>
      <div className="absolute inset-0 bg-[url('/bg.gif')] bg-cover bg-center opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950/95" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,6px_100%] opacity-20" />

      <div className={`relative z-10 w-full max-w-5xl flex flex-col items-center gap-5 transition-shadow duration-1000 ${ambientGlow}`}>
        {/* TOP BAR */}
        <div className="w-full flex justify-between items-center bg-black/70 border border-emerald-500/25 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-500/50 font-bold tracking-[0.2em] uppercase">Agent ID</span>
            <span className="text-sm font-bold text-stone-100 tracking-wider uppercase">{socketId ? socketId.substring(0, 10) : "SYNCING..."}</span>
            <span className="text-xs text-emerald-400 mt-1 font-bold tracking-widest">SCORE <span className="text-emerald-300 text-base">{myScore}</span></span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-stone-500 tracking-[0.3em] uppercase mb-0.5">Current Node</span>
            <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]">
              {roundDisplay.toString().padStart(2, "0")}
            </div>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] text-red-500/50 font-bold tracking-[0.2em] uppercase">Target</span>
            <span className="text-sm font-bold text-stone-100 tracking-wider uppercase">{opponentId.substring(0, 10)}</span>
            <span className="text-xs text-red-400 mt-1 font-bold tracking-widest">SCORE <span className="text-red-300 text-base">{opponentScore}</span></span>
          </div>
        </div>

        {/* MATRIX ARENA */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* YOUR NODE */}
          <motion.div layout className={`relative flex flex-col items-center justify-center border-2 p-6 rounded-3xl h-72 md:h-80 transition-all duration-700 overflow-hidden ${myLocked ? "bg-emerald-950/30 border-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.25)]" : "bg-slate-900/40 border-slate-700/60"}`}>
            <div className="absolute top-4 left-4 flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${myLocked ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
              <span className="text-[10px] text-emerald-500/60 font-bold tracking-[0.25em] uppercase">Your Node</span>
            </div>
            <AnimatePresence mode="wait">
              {gameState !== "result" ? (
                <motion.div key="deciding" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
                  <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-5 font-bold text-lg tracking-widest ${myLocked ? "border-emerald-400 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]" : "border-slate-600 text-slate-500"}`}>
                    {myLocked ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}><Lock className="w-10 h-10" /></motion.div> : "?"}
                  </div>
                  <p className="text-xs text-stone-500 tracking-wide">{myLocked ? "PAYLOAD SECURED" : "AWAITING SELECTION"}</p>
                </motion.div>
              ) : (
                <motion.div key="revealed" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} className="text-center">
                  {myChoice === "cooperate" ? (
                    <div className="text-emerald-400"><Shield className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" /><span className="text-2xl font-bold tracking-widest">COOPERATE</span></div>
                  ) : (
                    <div className="text-red-500"><Zap className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" /><span className="text-2xl font-bold tracking-widest">DEFECT</span></div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* TARGET NODE */}
          <motion.div layout className={`relative flex flex-col items-center justify-center border-2 p-6 rounded-3xl h-72 md:h-80 transition-all duration-700 overflow-hidden ${opponentLocked ? "bg-red-950/20 border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.15)]" : "bg-slate-900/40 border-slate-700/60"}`}>
            <div className="absolute top-4 left-4 flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${opponentLocked ? "bg-red-500 animate-pulse" : "bg-slate-600"}`} />
              <span className="text-[10px] text-red-500/60 font-bold tracking-[0.25em] uppercase">Target Node</span>
            </div>
            <AnimatePresence mode="wait">
              {/* FIXED UI CONDITION: Show lock screen if deciding OR if we are currently decrypting/revealed selection */}
              {gameState === "deciding" || gameState === "revealing" ? (
                <motion.div key="opp-deciding" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
                  <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-5 font-bold text-lg tracking-widest ${opponentLocked ? "border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse" : "border-slate-600 text-slate-500"}`}>
                    {opponentLocked ? <Lock className="w-10 h-10" /> : "•••"}
                  </div>
                  <p className="text-xs text-stone-500 tracking-wide">{opponentLocked ? "OPPONENT LOCKED" : "OPPONENT DECIDING"}</p>
                </motion.div>
              ) : (
                <motion.div key="opp-revealed" initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} className="text-center">
                  {opponentChoice === "cooperate" ? (
                    <div className="text-emerald-400"><Shield className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" /><span className="text-2xl font-bold tracking-widest">COOPERATE</span></div>
                  ) : (
                    <div className="text-red-500"><Zap className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" /><span className="text-2xl font-bold tracking-widest">DEFECT</span></div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        
        <div className="w-full min-h-44 flex items-center justify-center bg-black/60 border border-slate-700/50 rounded-3xl p-5 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <AnimatePresence mode="wait">
           {gameState === "deciding" ? (
            <motion.div key="actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col sm:flex-row gap-5 w-full justify-center">
              <button disabled={myLocked} onClick={() => handleLockIn("cooperate")} className="group relative cursor-pointer flex-1 max-w-xs py-5 px-4 rounded-2xl border-2 border-emerald-500/60 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 active:translate-y-0">
                <div className="flex flex-col items-center gap-2">
                  <Shield className="w-9 h-9 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-lg font-bold tracking-[0.2em]">COOPERATE</span>
                  <span className="text-[10px] text-emerald-500/50 tracking-widest uppercase">Preserve the link</span>
                </div>
              </button>
              <button disabled={myLocked} onClick={() => handleLockIn("defect")} className="group relative cursor-pointer flex-1 max-w-xs py-5 px-4 rounded-2xl border-2 border-red-500/60 bg-red-950/20 hover:bg-red-900/30 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.35)] hover:-translate-y-1 active:translate-y-0">
                <div className="flex flex-col items-center gap-2">
                  <Zap className="w-9 h-9 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-lg font-bold tracking-[0.2em]">DEFECT</span>
                  <span className="text-[10px] text-red-500/50 tracking-widest uppercase">Crack the firewall</span>
                </div>
              </button>
            </motion.div>
          ) : gameState === "revealing" ? (
            <motion.div key="revealing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <div className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-[0.35em] animate-pulse">DECRYPTING CHOICES</div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-emerald-400" animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12 }} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="outcome" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 18 }} className="flex flex-col sm:flex-row items-center justify-between w-full gap-5 px-2">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl border ${outcome === "dopamine" ? "bg-amber-500/10 border-amber-400/40 text-amber-400" : outcome === "shame" ? "bg-red-500/10 border-red-500/40 text-red-500" : outcome === "hooray" ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-400" : "bg-zinc-500/10 border-zinc-500/40 text-zinc-400"}`}>
                  {outcome === "dopamine" && <Trophy className="w-10 h-10" />}
                  {outcome === "shame" && <ShieldAlert className="w-10 h-10" />}
                  {outcome === "hooray" && <Handshake className="w-10 h-10" />}
                  {outcome === "ruin" && <Skull className="w-10 h-10" />}
                </div>
                <div>
                  {outcome === "dopamine" && (
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-amber-400 tracking-wide drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">SUCCESSFUL HEIST</h3>
                      <p className="text-xs text-amber-300/70 mt-1 tracking-wide">You cracked their firewall while they trusted blindly. +300</p>
                    </div>
                  )}
                  {outcome === "shame" && (
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-red-500 tracking-wide drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]">SYSTEM CORRUPTED</h3>
                      <p className="text-xs text-red-400/70 mt-1 tracking-wide">They stole your trust tokens. You got burned.</p>
                    </div>
                  )}
                  {outcome === "hooray" && (
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-wide drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">MUTUAL ALIGNMENT</h3>
                      <p className="text-xs text-emerald-400/70 mt-1 tracking-wide">Both agents preserved the matrix. Balanced split. +100</p>
                    </div>
                  )}
                  {outcome === "ruin" && (
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-zinc-400 tracking-wide">MUTUAL DESTRUCTION</h3>
                      <p className="text-xs text-zinc-500 mt-1 tracking-wide">Both chose greed. Firewalls annihilated. +50</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full sm:w-48 flex flex-col gap-1.5 shrink-0 bg-slate-950/40 border border-slate-900 rounded-xl p-3">
                <div className="flex justify-between items-center text-[10px] tracking-widest font-bold">
                  <span className="text-stone-400 uppercase">NEXT NODE</span>
                  <span className="text-emerald-500/60 animate-pulse uppercase">ROUTING...</span>
                </div>
                
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden relative">
                  <motion.div 
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 3, ease: "linear" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}