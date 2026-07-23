// lib/audio.ts

let isMuted = false;
let activeTrackName: string | null = null;
let bgmAudio: HTMLAudioElement | null = null;

export const getIsMuted = () => isMuted;

// --- SFX Helper ---
const playSFX = (fileName: string, volume = 0.6) => {
  if (typeof window === "undefined" || isMuted) return;
  try {
    const audio = new Audio(`/audio/${fileName}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (err) {
    console.error("SFX Error:", err);
  }
};

// --- BGM Core Logic ---
const playBGM = (fileName: string, volume = 0.3) => {
  if (typeof window === "undefined") return;

  // Remember what track SHOULD be playing
  activeTrackName = fileName;

  // If muted, stop any playing track and don't start a new one
  if (isMuted) {
    stopActiveAudio();
    return;
  }

  // If this exact track is ALREADY playing, don't restart it
  if (bgmAudio && !bgmAudio.paused && bgmAudio.src.includes(`${fileName}.mp3`)) {
    return;
  }

  // Stop old audio track before starting the new one
  stopActiveAudio();

  try {
    const audio = new Audio(`/audio/${fileName}.mp3`);
    audio.volume = volume;
    audio.loop = true;
    
    audio.play().catch((err) => {
      console.warn("BGM playback blocked by browser:", err);
    });

    bgmAudio = audio;
  } catch (err) {
    console.error("BGM Error:", err);
  }
};

// Internal helper to stop audio WITHOUT forgetting activeTrackName
const stopActiveAudio = () => {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
  }
};

export const stopBGM = () => {
  activeTrackName = null;
  stopActiveAudio();
};

// --- Toggle Logic ---
export const toggleMute = (): boolean => {
  isMuted = !isMuted;

  if (isMuted) {
    stopActiveAudio();
  } else if (activeTrackName) {
    // If unmuted and we have a track saved, play it!
    const track = activeTrackName;
    activeTrackName = null; // force playBGM to re-trigger
    playBGM(track);
  }

  return isMuted;
};

// --- Exported Triggers ---
export const playMainpageBGM = () => playBGM("mainpage", 0.4);
export const playGameplayBGM = () => playBGM("gameplay", 0.3);
export const playLoadingBGM = () => playBGM("loading", 0.3);

export const playDopamine = () => playSFX("dopamine");
export const playHooray = () => playSFX("hooray");
export const playShame = () => playSFX("shame");
export const playRuin = () => playSFX("ruin");
export const playWin = () => playSFX("win");
export const playLost = () => playSFX("lost");