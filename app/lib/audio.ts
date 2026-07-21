

const playSFX = (fileName: string, volume = 0.6) => {
  if (typeof window === "undefined") return; 
  try {
    const audio = new Audio(`/audio/${fileName}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {
    });
  } catch (err) {
    console.error("SFX Error:", err);
  }
};

let currentBGM: HTMLAudioElement | null = null;
let currentBGMName: string | null = null;

const playBGM = (fileName: string, volume = 0.3) => {
  if (typeof window === "undefined") return;
  
  if (currentBGMName === fileName && currentBGM && !currentBGM.paused) return;

  if (currentBGM) {
    currentBGM.pause();
    currentBGM.currentTime = 0;
  }

  try {
    const audio = new Audio(`/audio/${fileName}.mp3`);
    audio.volume = volume;
    audio.loop = true;
    audio.play().catch(() => {});
    currentBGM = audio;
    currentBGMName = fileName;
  } catch (err) {
    console.error("BGM Error:", err);
  }
};

export const stopBGM = () => {
  if (currentBGM) {
    currentBGM.pause();
    currentBGM.currentTime = 0;
    currentBGM = null;
    currentBGMName = null;
  }
};


export const playDopamine = () => playSFX("dopamine");
export const playHooray = () => playSFX("hooray");
export const playShame = () => playSFX("shame");
export const playRuin = () => playSFX("ruin");
export const playWin = () => playSFX("win");
export const playLost = () => playSFX("lost");



export const playMainpageBGM = () => playBGM("mainpage", 0.4);
export const playGameplayBGM = () => playBGM("gameplay", 0.3);
export const playLoadingBGM = () => playBGM("loading", 0.3);