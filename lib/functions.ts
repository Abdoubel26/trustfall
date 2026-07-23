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
${personality}

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


Rules:
- Study the full history. Infer the opponent's pattern.
- Pick the single move that best raises your expected total score.
- You may voluntarily defect for strategic reasons.
- Think long-term. Weigh uncertainty about remaining rounds.

Reply with exactly one word: "cooperate" or "defect"
`;
  };