"use client";

import { useEffect, useState, useRef } from "react";
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
  LogOut,
  Eye,
  Brain,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import runAI from "@/lib/groq";
import {
  playDopamine,
  playGameplayBGM,
  playHooray,
  playLoadingBGM,
  playLost,
  playRuin,
  playShame,
  playWin,
  stopBGM,
} from "@/lib/audio";

type Choice = "cooperate" | "defect";
type RoundResult = "dopamine" | "shame" | "hooray" | "ruin" | null;

const maxRounds = Math.floor(Math.random() * 6) + 5;

interface ModelConfig {
  id: string;
  name: string;
  category: "Production" | "Preview";
  provider: string;
}

const GROQ_MODELS: ModelConfig[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", category: "Production", provider: "Meta" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Fast)", category: "Production", provider: "Meta" },
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", category: "Production", provider: "OpenAI" },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B", category: "Production", provider: "OpenAI" },
  { id: "qwen/qwen3.6-27b", name: "Qwen 3.6 27B", category: "Preview", provider: "Alibaba" },
  { id: "minimaxai/minimax-m2.7", name: "MiniMax M2.7", category: "Preview", provider: "MiniMax" },
];

export default function AISpectatorArena() {
  const [agentAChoice, setAgentAChoice] = useState<Choice | null>(null);
  const [agentBChoice, setAgentBChoice] = useState<Choice | null>(null);

  const [agentALocked, setAgentALocked] = useState(false);
  const [agentBLocked, setAgentBLocked] = useState(false);

  const [gameState, setGameState] = useState<"idle" | "deciding" | "revealing" | "result" | "ended">("idle");
  const [historyA, setHistoryA] = useState<string[]>([]);
  const [historyB, setHistoryB] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<RoundResult>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const roundRef = useRef(1);
  const [roundDisplay, setRoundDisplay] = useState(1);
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Model state selections
  const [alphaModel, setAlphaModel] = useState<string>(GROQ_MODELS[0].id);
  const [betaModel, setBetaModel] = useState<string>(GROQ_MODELS[1]?.id || GROQ_MODELS[0].id);

  const [alphaPersonality, setAlphaPersonality] = useState<string>("")
  const [betaPersonality, setBetaPersonality] = useState<string>("")

  useEffect(() => {
    if (gameState === "deciding") {
      playGameplayBGM();
    } else if (gameState === "ended") {
      if (scoreA > scoreB) playWin();
      else if (scoreA < scoreB) playLost();
    } else if (gameState === "idle") {
      playLoadingBGM();
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    if (gameState === "result") {
      if (roundRef.current < maxRounds) {
        timer = setTimeout(() => {
          resetNextRound();
        }, 3200);
      } else {
        setGameState("ended");
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [gameState]);

  const buildPrompt = (
    agentName: string,
    myHistory: string[],
    oppHistory: string[],
    myScore: number,
    oppScore: number,
    personality: string
  ) => {
    const myHist = myHistory.length
      ? myHistory.map((h, i) => `Round ${i + 1}: ${h}`).join(", ")
      : "None yet";
    const oppHist = oppHistory.length
      ? oppHistory.map((h, i) => `Round ${i + 1}: ${h}`).join(", ")
      : "None yet";

    return `
You are  playing iterated Prisoner's Dilemma against another AI.


Payoffs (You / Opponent):
Both defect: 0 / 0
Both cooperate: +2 / +2
You defect, Opponent cooperates: +3 / -1
You cooperate, Opponent defects: -1 / +3

State:
Round: ${roundRef.current} (total rounds randomly chosen between 5-10; you do not know exact remaining)
Your score: ${myScore}
Opponent score: ${oppScore}

History:
Yours: ${myHist}
Opponent's: ${oppHist}

your personality: ${personality}

Rules:
- Study the full history. Infer the opponent's pattern.
- Pick the single move that best raises your expected total score.
- You may voluntarily defect for strategic reasons.
- Think long-term. Weigh uncertainty about remaining rounds.

Reply with exactly one word: "cooperate" or "defect"
`;
  };

  const startMatch = async () => {
    if (gameState !== "idle") return;
    setGameState("deciding");
    await runRound();
  };

  const runRound = async () => {
    if (isQuerying) return;
    setIsQuerying(true);
    setAgentAChoice(null);
    setAgentBChoice(null);
    setAgentALocked(false);
    setAgentBLocked(false);
    setOutcome(null);

    const promptA = buildPrompt(
      "Agent Alpha",
      historyA,
      historyB,
      scoreA,
      scoreB,
      alphaPersonality || "[no input from user]"
    );

    const promptB = buildPrompt(
      "Agent Beta",
      historyB,
      historyA,
      scoreB,
      scoreA,
      betaPersonality || "[no input from user]"
    );

    try {
      const [rawA, rawB] = await Promise.all([
        runAI(promptA, alphaModel),
        runAI(promptB, betaModel),
      ]);

      const choiceA: Choice =
        rawA?.toLowerCase().includes("defect") ? "defect" : "cooperate";
      const choiceB: Choice =
        rawB?.toLowerCase().includes("defect") ? "defect" : "cooperate";

      setTimeout(() => {
        setAgentAChoice(choiceA);
        setAgentALocked(true);
      }, 900);

      setTimeout(() => {
        setAgentBChoice(choiceB);
        setAgentBLocked(true);
        triggerRevealSequence(choiceA, choiceB);
      }, 1800);
    } catch (err) {
      console.error(err);
      setTimeout(() => {
        setAgentAChoice("cooperate");
        setAgentALocked(true);
        setAgentBChoice("cooperate");
        setAgentBLocked(true);
        triggerRevealSequence("cooperate", "cooperate");
      }, 1200);
    } finally {
      setIsQuerying(false);
    }
  };

  const triggerRevealSequence = (a: Choice, b: Choice) => {
    setHistoryA((prev) => [...prev, a]);
    setHistoryB((prev) => [...prev, b]);

    setGameState("revealing");

    setTimeout(() => {
      setGameState("result");

      if (a === "defect" && b === "cooperate") {
        setOutcome("dopamine");
        setScoreA((prev) => prev + 3);
        setScoreB((prev) => prev - 1);
        if (roundRef.current < maxRounds) playDopamine();
      } else if (a === "cooperate" && b === "defect") {
        setOutcome("shame");
        setScoreB((prev) => prev + 3);
        setScoreA((prev) => prev - 1);
        if (roundRef.current < maxRounds) playShame();
      } else if (a === "cooperate" && b === "cooperate") {
        setOutcome("hooray");
        setScoreA((prev) => prev + 2);
        setScoreB((prev) => prev + 2);
        if (roundRef.current < maxRounds) playHooray();
      } else {
        setOutcome("ruin");
        if (roundRef.current < maxRounds) playRuin();
      }
    }, 1100);
  };

  const resetNextRound = () => {
    roundRef.current += 1;
    setRoundDisplay(roundRef.current);
    setAgentAChoice(null);
    setAgentBChoice(null);
    setAgentALocked(false);
    setAgentBLocked(false);
    setGameState("deciding");
    setOutcome(null);
    setTimeout(() => {
      runRound();
    }, 600);
  };

  const getModelName = (id: string) => {
    return GROQ_MODELS.find((m) => m.id === id)?.name || id;
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
    <div
      className={`min-h-screen lg:max-h-screen flex flex-col items-center justify-between p-4 md:p-6 select-none font-mono transition-all duration-1000 relative overflow-hidden ${ambientBg}`}
    >
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

      <div
        className={`relative z-10 w-full max-w-5xl flex flex-col items-center gap-5 transition-shadow duration-1000 ${ambientGlow}`}
      >
       { gameState !== "idle" && <div className="w-full flex justify-between items-center bg-black/75 border border-emerald-500/20 backdrop-blur-md px-5 py-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col">
            <span className="text-[15px] text-emerald-500/70 uppercase mb-0.5">
              {getModelName(alphaModel)}
            </span>
            <span className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tight">
              {scoreA}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-stone-500 tracking-[0.3em] uppercase mb-0.5">
              Round
            </span>
            <div className="text-3xl md:text-5xl font-bold text-transparent hover:cursor-pointer bg-clip-text font-toxia bg-linear-to-r from-red-500 via-amber-400 to-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]">
              {gameState !== "ended" ? roundDisplay.toString().padStart(2, "0") : "END"}
            </div>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[15px] text-red-500/70 uppercase mb-0.5">
              {getModelName(betaModel)}
            </span>
            <span className="text-2xl md:text-3xl font-black text-red-400 tracking-tight">
              {scoreB}
            </span>
          </div>
        </div>}

        {gameState === "idle" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-95 w-full max-w-3xl mx-auto p-6 md:p-8 border border-slate-700/60 bg-slate-950/85 rounded-3xl relative overflow-hidden backdrop-blur-md text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <Eye className="w-14 h-14 text-indigo-400 mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
            
            <h2 className="text-3xl md:text-4xl font-black tracking-wider text-indigo-300 uppercase mb-1">
              AI SPECTATOR ARENA
            </h2>

            <p className="text-xs md:text-sm text-stone-400 max-w-md mb-6 leading-relaxed">
              Watch two LLMs play the Iterated Prisoner's Dilemma. 
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-8 text-left">
              
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Agent Alpha
                  </label>
                  
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                    PREVIEW: {alphaModel || "Default"}
                  </span>
                </div>

                <select
                  value={alphaModel}
                  onChange={(e) => setAlphaModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 outline-none focus:border-emerald-400 cursor-pointer transition-colors"
                >
                  {GROQ_MODELS.map((m) => (
                    <option key={`alpha-${m.id}`} value={m.id} className="bg-slate-950 text-stone-200">
                      {m.name} ({m.provider}) {m.category === "Preview" && ` (${m.category})`}
                    </option>
                  ))}
                </select>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-stone-400">System Personality Prompt</span>
                  <textarea
                    value={alphaPersonality}
                    onChange={(e) => setAlphaPersonality(e.target.value)}
                    placeholder="Enter personality prompt (e.g., Aggressive, Trusting, Strategic)..."
                    rows={3}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-stone-300 placeholder:text-stone-600 outline-none focus:border-emerald-500/50 resize-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-900/60 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-rose-400 tracking-wider uppercase flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Agent Beta
                  </label>
                  
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300">
                    PREVIEW: {betaModel || "Default"}
                  </span>
                </div>

                <select
                  value={betaModel}
                  onChange={(e) => setBetaModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 outline-none focus:border-rose-400 cursor-pointer transition-colors"
                >
                  {GROQ_MODELS.map((m) => (
                    <option key={`beta-${m.id}`} value={m.id} className="bg-slate-950 text-stone-200">
                      {m.name} ({m.provider}) {m.category === "Preview" && ` (${m.category})`}
                    </option>
                  ))}
                </select>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-stone-400">System Personality Prompt</span>
                  <textarea
                    value={betaPersonality}
                    onChange={(e) => setBetaPersonality(e.target.value)}
                    placeholder="Enter personality prompt (e.g., Deceptive, Cooperative)..."
                    rows={3}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-stone-300 placeholder:text-stone-600 outline-none focus:border-rose-500/50 resize-none transition-colors"
                  />
                </div>
              </div>

            </div>

            <button
              onClick={startMatch}
              className="px-8 py-4 cursor-pointer rounded-xl border border-indigo-500/50 bg-indigo-950/40 hover:bg-indigo-500 hover:text-slate-950 text-indigo-300 text-sm font-bold tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-3 shadow-[0_0_25px_rgba(99,102,241,0.2)] hover:shadow-[0_0_35px_rgba(99,102,241,0.4)]"
            >
              <Brain className="w-5 h-5" />
              START MATCH
            </button>
          </motion.div>
        ) : gameState === "ended" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-95 w-full max-w-2xl mx-auto p-8 border border-slate-700/60 bg-slate-950/85 rounded-3xl relative overflow-hidden backdrop-blur-md text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {scoreA > scoreB ? (
              <>
                <Trophy className="w-16 h-16 my-2 text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                <h2 className="text-4xl md:text-5xl font-black tracking-wider text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] uppercase">
                  ALPHA WINS
                </h2>
                <p className="text-sm text-stone-400 max-w-sm mt-3 leading-relaxed">
                  winner: {getModelName(alphaModel)}
                </p>
              </>
            ) : scoreA < scoreB ? (
              <>
                <Skull className="w-16 h-16 my-2 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.45)]" />
                <h2 className="text-4xl md:text-5xl font-black tracking-wider text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)] uppercase">
                  BETA WINS
                </h2>
                <p className="text-sm text-stone-400 max-w-sm mt-3 leading-relaxed">
                  winner: {getModelName(betaModel)}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 my-2 rounded-full border-2 border-zinc-500 flex items-center justify-center text-zinc-400 text-2xl font-bold">
                  =
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-wider text-zinc-300 uppercase">
                  IT&apos;S A TIE
                </h2>
                <p className="text-sm text-stone-400 max-w-sm mt-3 leading-relaxed">
                  Equal chaos. Equal vibes. Peak machine humanity.
                </p>
              </>
            )}

            <div className="flex items-center gap-6 my-8 w-full justify-center">
              <div className="flex flex-col p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl min-w-28">
                <span className="text-[10px] text-stone-500 font-bold tracking-widest uppercase">
                  Alpha ({getModelName(alphaModel)})
                </span>
                <span
                  className={`text-3xl font-black mt-1 ${
                    scoreA >= scoreB ? "text-emerald-400" : "text-stone-300"
                  }`}
                >
                  {scoreA}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-600 font-mono tracking-widest">
                VS
              </div>
              <div className="flex flex-col p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl min-w-28">
                <span className="text-[10px] text-stone-500 font-bold tracking-widest uppercase">
                  Beta ({getModelName(betaModel)})
                </span>
                <span
                  className={`text-3xl font-black mt-1 ${
                    scoreB >= scoreA ? "text-emerald-400" : "text-stone-300"
                  }`}
                >
                  {scoreB}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-7 py-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]"
              >
                <RotateCcw className="w-4 h-4" /> Watch Again
              </button>

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

              <motion.div
                layout
                className={`relative flex flex-col items-center justify-center border-2 p-6 rounded-3xl h-72 transition-all duration-700 overflow-hidden ${
                  agentALocked
                    ? "bg-emerald-950/35 border-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.25)]"
                    : "bg-slate-900/45 border-slate-700/60"
                }`}
              >
                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      agentALocked ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                    }`}
                  />
                  <span className="text-[10px] text-emerald-500/70 font-bold tracking-[0.25em] uppercase">
                    Alpha
                  </span>
                </div>
                
                {/* Model Badge */}
                <div className="absolute top-4 right-4 bg-slate-950/80 border border-slate-800 text-[10px] text-emerald-400/80 px-2.5 py-1 rounded-full font-mono">
                  {getModelName(alphaModel)}
                </div>

                <AnimatePresence mode="wait">
                  {gameState !== "result" ? (
                    <motion.div
                      key="a-deciding"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center"
                    >
                      <div
                        className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-5 font-bold text-lg tracking-widest ${
                          agentALocked
                            ? "border-emerald-400 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                            : "border-slate-600 text-slate-500"
                        }`}
                      >
                        {agentALocked ? (
                          <motion.div>
                            {agentAChoice === "cooperate" ? (
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
                        {agentALocked
                          ? agentAChoice === "cooperate"
                            ? "LOCKED IN • COOPERATE"
                            : "LOCKED IN • DEFECT"
                          : "THINKING..."}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="a-revealed"
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 120, damping: 14 }}
                      className="text-center"
                    >
                      {agentAChoice === "cooperate" ? (
                        <div className="text-emerald-400">
                          <Handshake className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">
                            COOPERATED
                          </span>
                        </div>
                      ) : (
                        <div className="text-red-500">
                          <Axe className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">
                            DEFECTED
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                layout
                className={`relative flex flex-col items-center justify-center border-2 p-6 rounded-3xl h-72 transition-all duration-700 overflow-hidden ${
                  agentBLocked
                    ? "bg-red-950/25 border-red-500/55 shadow-[0_0_35px_rgba(239,68,68,0.18)]"
                    : "bg-slate-900/45 border-slate-700/60"
                }`}
              >
                <div className="absolute top-4 left-4 flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      agentBLocked ? "bg-red-500 animate-pulse" : "bg-slate-600"
                    }`}
                  />
                  <span className="text-[10px] text-red-500/70 font-bold tracking-[0.25em] uppercase">
                    Beta
                  </span>
                </div>

                <div className="absolute top-4 right-4 bg-slate-950/80 border border-slate-800 text-[10px] text-red-400/80 px-2.5 py-1 rounded-full font-mono">
                  {getModelName(betaModel)}
                </div>

                <AnimatePresence mode="wait">
                  {gameState === "deciding" || gameState === "revealing" ? (
                    <motion.div
                      key="b-deciding"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center"
                    >
                      <div
                        className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-5 font-bold text-lg tracking-widest ${
                          agentBLocked
                            ? " shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
                            : "border-slate-600 text-slate-500"
                        }`}
                      >
                        {agentBLocked ? (
                          agentBChoice === "cooperate" ? (
                              <Handshake className="w-16 h-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                            ) : (
                              <Axe className="w-16 h-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                            )
                        ) : (
                          <span className="text-2xl tracking-widest">•••</span>
                        )}
                        
                      </div>
                      <p className="text-xs text-stone-400 tracking-wide font-medium">
                        {agentBLocked ? "OPPONENT ACTED" : "STILL DECIDING..."}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="b-revealed"
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 120, damping: 14 }}
                      className="text-center"
                    >
                      {agentBChoice === "cooperate" ? (
                        <div className="text-emerald-400">
                          <Handshake className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">
                            COOPERATED
                          </span>
                        </div>
                      ) : (
                        <div className="text-red-500">
                          <Axe className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                          <span className="text-2xl font-bold tracking-widest">
                            DEFECTED
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Bottom Status / Outcome Panel */}
            <div className="w-full max-h-35 flex items-center justify-center bg-black/65 border border-slate-700/50 rounded-3xl p-5 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <AnimatePresence mode="wait">
                {gameState === "deciding" ? (
                  <motion.div
                    key="querying"
                    initial={{ opacity: 0, y: 9 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="text-xl md:text-2xl font-bold text-indigo-400 tracking-[0.25em] animate-pulse">
                      QUERYING MODELS
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-indigo-400"
                          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.9,
                            delay: i * 0.12,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : gameState === "revealing" ? (
                  <motion.div
                    key="revealing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-[0.3em] animate-pulse">
                      DECRYPTING CHOICES
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-emerald-400"
                          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.9,
                            delay: i * 0.12,
                          }}
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
                              ALPHA BETRAYED BETA 💰
                            </h3>
                            <p className="text-xs text-amber-300/70 mt-1 tracking-wide">
                              Cold. Calculated. Classic backstab.
                            </p>
                          </div>
                        )}
                        {outcome === "shame" && (
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-red-500 tracking-wide drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                              BETA BAMBOOZLED ALPHA
                            </h3>
                            <p className="text-xs text-red-400/70 mt-1 tracking-wide">
                              The pacifist just went nuclear.
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
                        <span className="text-emerald-500/70 animate-pulse uppercase">
                          Loading
                        </span>
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