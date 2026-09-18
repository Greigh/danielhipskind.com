// Voice Commands Module
// Integrates speech recognition for hands-free operation

export const voiceState = {
  recognition: null,
  isListening: false,
  commands: {
    'start timer': () => window.startTimer(),
    'stop timer': () => window.stopTimer(),
    'new note': () => window.createNewNote(),
    'save note': () => window.saveCurrentNote(),
    'next script': () => window.loadNextScript(),
    'previous script': () => window.loadPreviousScript(),
  },
};

export function initializeVoiceCommands() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceState.recognition = new SpeechRecognition();
    voiceState.recognition.continuous = true;
    voiceState.recognition.interimResults = false;
    voiceState.recognition.lang = 'en-US';

    voiceState.recognition.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.toLowerCase();
      processCommand(transcript);
    };

    voiceState.recognition.onend = () => {
      voiceState.isListening = false;
    };

    setupVoiceUI();
  }
}

function setupVoiceUI() {
  // Add voice button to UI
}

export function startListening() {
  if (voiceState.recognition && !voiceState.isListening) {
    voiceState.recognition.start();
    voiceState.isListening = true;
  }
}

export function stopListening() {
  if (voiceState.recognition && voiceState.isListening) {
    voiceState.recognition.stop();
    voiceState.isListening = false;
  }
}

function processCommand(transcript) {
  for (const [command, action] of Object.entries(voiceState.commands)) {
    if (transcript.includes(command)) {
      action();
      break;
    }
  }
}
