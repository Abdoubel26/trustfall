"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  ShieldAlert,
  Handshake,
  Skull,
  Lock,
  Axe,
  RotateCcw,
  HomeIcon,
  Scale,
  LogOut
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import {
  playDopamine,
  playGameplayBGM,
  playHooray,
  playLost,
  playRuin,
  playShame,
  playWin,
  stopBGM,
} from "@/lib/audio";

type Choice = "cooperate" | "defect";
type RoundResult = "dopamine" | "shame" | "hooray" | "ruin" | null;

export default function GameRoom() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const router = useRouter();

  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null);

  const [myLocked, setMyLocked] = useState(false);
  const [opponentLocked, setOpponentLocked] = useState(false);

  const [gameState, setGameState] = useState<"deciding" | "revealing" | "result" | "ended">("deciding");
  const [outcome, setOutcome] = useState<RoundResult>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [maxRounds, setMaxRounds] = useState(7);
  const roundRef = useRef(1);
  const [roundDisplay, setRoundDisplay] = useState(1);
  const [disconnected, setDisconnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", { roomId });
    });

    socket.on("opponentLockedIn", () => {
      setOpponentLocked(true);
    });

    socket.on("roomInitialized", (data: { maxRounds: number }) => {
      setMaxRounds(data.maxRounds);
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

    socket.on("opponentLeft", () => {
      stopBGM();
      setDisconnected(true);
      if(gameState !== "ended") {
        setTimeout(() => {
        router.push("/");
      }, 3000);
    };
    });

    return () => {
      socket.off("opponentLockedIn");
      socket.off("roomInitialized");
      socket.off("revealChoices");
      socket.off("opponentLeft");
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (gameState === "deciding") {
      playGameplayBGM();
    } else if (gameState === "ended") {
      stopBGM();
      if (myScore > opponentScore) playWin();
      else if (myScore < opponentScore) playLost();
      return;
    }

    let timeOut: ReturnType<typeof setTimeout> | null = null;

    if (gameState === "result") {
      if (roundRef.current < maxRounds) {
        timeOut = setTimeout(() => {
          resetNextRound();
        }, 3000);
      } else {
        if (roundRef.current === maxRounds) {
          setGameState("ended");
        }
      }
    }

    return () => {
      if (timeOut) clearTimeout(timeOut);
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
        setMyScore((prev) => prev + 3);
        setOpponentScore((prev) => prev - 1);
        if (roundRef.current < maxRounds) playDopamine();
      } else if (mine === "cooperate" && theirs === "defect") {
        setOutcome("shame");
        setOpponentScore((prev) => prev + 3);
        setMyScore((prev) => prev - 1);
        if (roundRef.current < maxRounds) playShame();
      } else if (mine === "cooperate" && theirs === "cooperate") {
        setOutcome("hooray");
        setMyScore((prev) => prev + 2);
        setOpponentScore((prev) => prev + 2);
        if (roundRef.current < maxRounds) playHooray();
      } else {
        setOutcome("ruin");
        if (roundRef.current < maxRounds) playRuin();
      }
    }, 1000);
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

  if (disconnected && gameState !== "ended") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-mono p-4">
        <h2 className="text-3xl font-black text-red-500 mb-2">OPPONENT DISCONNECTED</h2>
        <p className="text-stone-400 text-sm">Redirecting you to the home page...</p>
      </div>
    );
  }

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
    <div className={`min-h-screen lg:max-h-screen flex flex-col items-center justify-between p-4 md:p-6 select-none font-mono transition-all duration-1000 relative overflow-hidden ${ambientBg}`}>
      <div className="absolute inset-0 bg-[url('/bg.gif')] bg-cover bg-center opacity-40" />
      <div className="absolute inset-0 bg-linear-to-b from-slate-950/90 via-slate-950/70 to-slate-950/95" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-size-[100%_4px,6px_100%] opacity-20" />

      <Link
        href="/"
        className="fixed top-5 left-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-stone-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-950/30 transition-all duration-200 text-xs font-bold tracking-wider backdrop-blur-md shadow-lg group"
      >
        <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>LEAVE</span>
      </Link>

      <div className={`relative z-10 w-full max-w-5xl flex flex-col items-center gap-5 transition-shadow duration-1000 ${ambientGlow}`}>

        <div className="w-full flex justify-between items-center bg-black/75 border border-emerald-500/20 backdrop-blur-md px-5 py-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-500/70 tracking-[0.25em] uppercase mb-0.5">You</span>
            <span className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tight">
              {myScore}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-stone-500 tracking-[0.3em] uppercase mb-0.5">Round</span>
            <div className="text-3xl md:text-5xl font-bold text-transparent hover:cursor-pointer bg-clip-text font-toxia bg-linear-to-r from-red-500 via-amber-400 to-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]">
              {gameState !== "ended" ? roundDisplay.toString().padStart(2, "0") : "END"}
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] text-red-500/70 tracking-[0.25em] uppercase mb-0.5">Them</span>
            <span className="text-2xl md:text-3xl font-black text-red-400 tracking-tight">
              {opponentScore}
            </span>
          </div>
        </div>

        {gameState === "ended" ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="flex flex-col items-center justify-center min-h-95 w-full max-w-2xl mx-auto p-8 border border-slate-700/60 bg-slate-950/85 rounded-3xl relative overflow-hidden backdrop-blur-md text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {myScore > opponentScore ? (
              <>
                <Trophy className="w-16 h-16 my-2 text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                <h2 className="text-4xl md:text-5xl font-black tracking-wider text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] uppercase">
                  YOU WON
                </h2>
                <p className="text-sm text-stone-400 max-w-sm mt-3 leading-relaxed">
                  Ruthless. Calculated. Slightly evil.
                </p>
              </>
            ) : myScore < opponentScore ? (
              <>
                <Skull className="w-16 h-16 my-2 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.45)]" />
                <h2 className="text-4xl md:text-5xl font-black tracking-wider text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)] uppercase">
                  YOU LOST
                </h2>
                <p className="text-sm text-stone-400 max-w-sm mt-3 leading-relaxed">
                  Too trusting. Or just unlucky. Either way… ouch.
                </p>
              </>
            ) : (
              <>
                <Scale className="w-16 h-16 my-2 text-gray-300 drop-shadow-[0_0_20px_rgba(239,68,68,0.45)]" />
                <h2 className="text-4xl md:text-5xl font-black tracking-wider text-zinc-300 uppercase">
                  IT&apos;S A TIE
                </h2>
                <p className="text-sm text-stone-400 max-w-sm mt-3 leading-relaxed">
                  Equal chaos. Equal vibes. Peak humanity.
                </p>
              </>
            )}

            <div className="flex items-center gap-6 my-8 w-full justify-center">
              <div className="flex flex-col p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl min-w-28">
                <span className="text-[10px] text-stone-500 font-bold tracking-widest uppercase">Your Score</span>
                <span className={`text-3xl font-black mt-1 ${myScore >= opponentScore ? "text-emerald-400" : "text-stone-300"}`}>{myScore}</span>
              </div>
              <div className="text-lg font-bold text-slate-600 font-mono tracking-widest">VS</div>
              <div className="flex flex-col p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl min-w-28">
                <span className="text-[10px] text-stone-500 font-bold tracking-widest uppercase">Opponent</span>
                <span className={`text-3xl font-black mt-1 ${opponentScore >= myScore ? "text-emerald-400" : "text-stone-300"}`}>{opponentScore}</span>
              </div>
            </div>

            <div className="flex gap-3">  
              <Link 
                href="/play"
                className="px-7 py-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </Link>

              <Link
                href="/"
                className="px-7 py-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]"
              >
                <HomeIcon className="w-4 h-4" /> Go Home
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
              <motion.div layout className={`relative flex flex-col items-center justify-center border-2 p-6 rounded-3xl h-72 transition-all duration-700 overflow-hidden ${myLocked ? "bg-emerald-950/35 border-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.25)]" : "bg-slate-900/45 border-slate-700/60"}`}>
                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${myLocked ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <span className="text-[10px] text-emerald-500/70 font-bold tracking-[0.25em] uppercase">You</span>
                </div>
                <AnimatePresence mode="wait">
                  {gameState !== "result" ? (
                    <motion.div key="deciding" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
                      <div className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-5 font-bold text-lg tracking-widest ${myLocked ? "border-emerald-400 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]" : "border-slate-600 text-slate-500"}`}>
                        {myLocked ? (
                          <motion.div>
                            {myChoice === "cooperate" ? (
                              <Handshake className="w-16 h-16 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                            ) : (
                              <Axe className="w-16 h-16 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                            )}
                          </motion.div>
                        ) : (
                          <span className="text-3xl text-slate-500">?</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 tracking-wide font-medium">
                        {myLocked
                          ? myChoice === "cooperate"
                            ? "LOCKED IN • COOPERATE"
                            : "LOCKED IN • DEFECT"
                          : "WAITING FOR YOUR MOVE"}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="revealed" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} className="text-center">
                      {myChoice === "cooperate" ? (
                        <div className="text-emerald-400">
                          <Handshake className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">COOPERATED</span>
                        </div>
                      ) : (
                        <div className="text-red-500">
                          <Axe className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">DEFECTED</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div layout className={`relative flex flex-col items-center justify-center border-2 p-6 rounded-3xl h-72 transition-all duration-700 overflow-hidden ${opponentLocked ? "bg-red-950/25 border-red-500/55 shadow-[0_0_35px_rgba(239,68,68,0.18)]" : "bg-slate-900/45 border-slate-700/60"}`}>
                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${opponentLocked ? "bg-red-500 animate-pulse" : "bg-slate-600"}`} />
                  <span className="text-[10px] text-red-500/70 font-bold tracking-[0.25em] uppercase">Opponent</span>
                </div>
                <AnimatePresence mode="wait">
                  {gameState === "deciding" || gameState === "revealing" ? (
                    <motion.div key="opp-deciding" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
                      <div className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-5 font-bold text-lg tracking-widest ${opponentLocked ? "border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse" : "border-slate-600 text-slate-500"}`}>
                        {opponentLocked ? <Lock className="w-11 h-11" /> : <span className="text-2xl tracking-widest">•••</span>}
                      </div>
                      <p className="text-xs text-stone-400 tracking-wide font-medium">
                        {opponentLocked ? "OPPONENT ACTED" : "STILL DECIDING..."}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="opp-revealed" initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} className="text-center">
                      {opponentChoice === "cooperate" ? (
                        <div className="text-emerald-400">
                          <Handshake className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">COOPERATED</span>
                        </div>
                      ) : (
                        <div className="text-red-500">
                          <Axe className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">DEFECTED</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <div className="w-full max-h-35 flex items-center justify-center bg-black/65 border border-slate-700/50 rounded-3xl p-5 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <AnimatePresence mode="wait">
                {gameState === "deciding" ? (
                  <motion.div key="actions" initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col sm:flex-row gap-5 w-full justify-center">
                    <button
                      disabled={myLocked}
                      onClick={() => handleLockIn("cooperate")}
                      className="group relative cursor-pointer flex-1 max-w-xs py-4 px-5 rounded-2xl border-2 border-emerald-500/55 bg-emerald-950/25 hover:bg-emerald-900/35 text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 active:translate-y-0"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Handshake className="w-9 h-9 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-lg font-bold font-toxia tracking-[0.2em]">COOPERATE</span>
                      </div>
                    </button>
                    <button
                      disabled={myLocked}
                      onClick={() => handleLockIn("defect")}
                      className="group relative cursor-pointer flex-1 max-w-xs py-4 px-5 rounded-2xl border-2 border-red-500/55 bg-red-950/25 hover:bg-red-900/35 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.35)] hover:-translate-y-1 active:translate-y-0"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Axe className="w-9 h-9 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="text-lg font-bold font-toxia tracking-widest">DEFECT</span>
                      </div>
                    </button>
                  </motion.div>
                ) : gameState === "revealing" ? (
                  <motion.div key="revealing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                    <div className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-[0.3em] animate-pulse">
                      DECRYPTING CHOICES
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-emerald-400"
                          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="outcome"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 140, damping: 18 }}
                    className="flex flex-col sm:flex-row items-center justify-between w-full gap-5 px-2"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3.5 rounded-2xl border ${
                          outcome === "dopamine"
                            ? "bg-amber-500/10 border-amber-400/40 text-amber-400"
                            : outcome === "shame"
                            ? "bg-red-500/10 border-red-500/40 text-red-500"
                            : outcome === "hooray"
                            ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-400"
                            : "bg-zinc-500/10 border-zinc-500/40 text-zinc-400"
                        }`}
                      >
                        {outcome === "dopamine" && <Trophy className="w-10 h-10" />}
                        {outcome === "shame" && <ShieldAlert className="w-10 h-10" />}
                        {outcome === "hooray" && <Handshake className="w-10 h-10" />}
                        {outcome === "ruin" && <Skull className="w-10 h-10" />}
                      </div>
                      <div>
                        {outcome === "dopamine" && (
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-amber-400 tracking-wide drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                              THE BETRAYAL PAID OFF 💰
                            </h3>
                            <p className="text-xs text-amber-300/70 mt-1 tracking-wide">
                              They trusted you. Big mistake.
                            </p>
                          </div>
                        )}
                        {outcome === "shame" && (
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-red-500 tracking-wide drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                              YOU GOT BAMBOOZLED
                            </h3>
                            <p className="text-xs text-red-400/70 mt-1 tracking-wide">
                              Brought a handshake to an axe fight.
                            </p>
                          </div>
                        )}
                        {outcome === "hooray" && (
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-emerald-400 tracking-wide drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                              NO BACKSTABBING TODAY 🤝
                            </h3>
                            <p className="text-xs text-emerald-400/70 mt-1 tracking-wide">
                              Friendship is magic… until next round.
                            </p>
                          </div>
                        )}
                        {outcome === "ruin" && (
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-zinc-300 tracking-wide">
                              CLOWN TO A CLOWN 🤡
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1 tracking-wide">
                              Nobody wins. Peak entertainment.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-full sm:w-48 flex flex-col gap-1.5 shrink-0 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
                      <div className="flex justify-between items-center text-[10px] tracking-widest font-bold">
                        <span className="text-stone-400 uppercase">Next Round</span>
                        <span className="text-emerald-500/70 animate-pulse uppercase">Loading</span>
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
          </>
        )}
      </div>
    </div>
  );
}