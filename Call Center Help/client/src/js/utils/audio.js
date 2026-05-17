// Audio utility functions
let audioContext;
let timerSoundSource = null;
let activeAudio = null; // Declare this only once
let alertRepeatInterval = null; // For repeating alert sounds

// Add a global flag for repeat mode (default true for backward compatibility)
let repeatAlertSound = true;

// Sound URLs for different sound types
const SOUND_URLS = {
  endgame: '/audio/endgame.mp3', // End game sound
  bell: '/audio/bell.mp3', // Bell sound
  towerbell: '/audio/tower.mp3', // Tower Bell sound
  custom: null, // Will be set by user
};

/**
 * Initialize the audio context
 */
export function initAudio() {
  try {
    // Create audio context with auto-suspend to save resources
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 44100,
    });

    // Resume context on user interaction
    document.addEventListener(
      'click',
      function resumeAudio() {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
        document.removeEventListener('click', resumeAudio);
      },
      { once: true }
    );
  } catch (e) {
    console.error('Web Audio API not supported:', e);
  }
}

// Generate a beep sound
export function playBeep(frequency = 440, duration = 0.5, volume = 0.5) {
  if (!audioContext) {
    console.warn('Audio context not initialized');
    return null;
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  try {
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Create gain node for volume and fade out
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start and stop with slight fade out
    const now = audioContext.currentTime;
    oscillator.start(now);

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.stop(now + duration);

    return oscillator;
  } catch (e) {
    console.error('Error generating beep:', e);
    return null;
  }
}

// Play a repeating beep until stopped
function startRepeatingBeep() {
  stopTimerSound();
  function play() {
    timerSoundSource = playBeep(880, 0.2, 0.7);
  }
  play();
  if (repeatAlertSound) {
    alertRepeatInterval = setInterval(play, 600); // Repeat every 600ms
  }
}

// Play a repeating audio file until stopped
function startRepeatingAudio(url) {
  stopTimerSound();
  function play() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    const audio = new Audio(url);
    activeAudio = audio;
    audio.play();
    audio.onended = () => {
      if (repeatAlertSound && alertRepeatInterval) {
        // Only repeat if not stopped
        setTimeout(() => {
          if (repeatAlertSound && alertRepeatInterval) play();
        }, 200);
      }
    };
  }
  play();
  if (repeatAlertSound) {
    alertRepeatInterval = true; // Just a flag for audio
  }
}

// This is the first missing export
export function playTimerExpiredSound(soundType = 'beep', customUrl = null) {
  stopTimerSound();
  if (soundType === 'beep') {
    startRepeatingBeep();
  } else {
    const url = soundType === 'custom' ? customUrl : SOUND_URLS[soundType];
    if (url) {
      startRepeatingAudio(url);
    } else {
      startRepeatingBeep();
    }
  }
}

// This is the second missing export
export function stopTimerSound() {
  if (alertRepeatInterval) {
    if (typeof alertRepeatInterval === 'number') {
      clearInterval(alertRepeatInterval);
    }
    alertRepeatInterval = null;
  }
  if (timerSoundSource) {
    try {
      timerSoundSource.stop();
    } catch {
      // ignore
    }
    timerSoundSource = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

// Play a sound from URL or beep, repeating until stopped
export function playSound(
  soundType = 'beep',
  customUrl = null,
  isTest = false
) {
  stopTimerSound();
  if (soundType === 'beep') {
    if (isTest) {
      playBeep(440, 0.2, 0.3);
    } else {
      startRepeatingBeep();
    }
    return;
  }
  let soundUrl = soundType === 'custom' ? customUrl : SOUND_URLS[soundType];
  // Add support for custom URLs: if customUrl is provided and not empty, use it
  if (soundType === 'custom' && (!customUrl || customUrl.trim() === '')) {
    // If no custom URL is set, fall back to beep
    if (isTest) {
      playBeep(440, 0.2, 0.3);
    } else {
      startRepeatingBeep();
    }
    return;
  }
  if (!soundUrl) {
    if (isTest) {
      playBeep(440, 0.2, 0.3);
    } else {
      startRepeatingBeep();
    }
    return;
  }
  if (isTest) {
    // Play once for test
    const audio = new Audio(soundUrl);
    activeAudio = audio;
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().catch(() => playBeep(440, 0.5, 0.5));
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 1200);
  } else {
    startRepeatingAudio(soundUrl);
  }
}

// Make sure the playAlertSound function is exported
export function playAlertSound(soundType, customUrl, isTest = false) {
  if (isTest) {
    playSound(soundType, customUrl, true);
  } else {
    playSound(soundType, customUrl, false);
  }
}

// Allow setting repeat mode from settings
export function setRepeatAlertSoundMode(repeat) {
  repeatAlertSound = !!repeat;
}
