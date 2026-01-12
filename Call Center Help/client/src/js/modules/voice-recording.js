// Voice Recording Integration Module - Cisco Unified Communications Manager
import { showToast } from '../utils/toast.js';

export function initializeVoiceRecording() {
  const connectBtn = document.getElementById('connect-cucm');
  const startBtn = document.getElementById('start-recording');
  const stopBtn = document.getElementById('stop-recording');
  const statusDiv = document.getElementById('recording-status');
  const recordingsList = document.getElementById('recordings-list');

  // If we are on a page without these elements, just return
  if (!connectBtn || !startBtn || !stopBtn || !statusDiv || !recordingsList) {
    // console.warn('Voice recording elements not found'); // Suppress warning for pages that don't have it
    return;
  }

  let mediaRecorder;
  let recordedChunks = [];
  let isRecording = false;
  let isConnected = false;
  let recordings = JSON.parse(localStorage.getItem('recordings')) || [];

  function updateStatus() {
    if (!statusDiv) return;
    if (isRecording) {
      statusDiv.textContent = 'Status: Recording...';
      statusDiv.style.color = 'red';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else if (isConnected) {
      statusDiv.textContent = 'Status: Connected';
      statusDiv.style.color = 'green';
      startBtn.disabled = false;
      stopBtn.disabled = true;
    } else {
      statusDiv.textContent = 'Status: Disconnected';
      statusDiv.style.color = 'gray';
      startBtn.disabled = true;
      stopBtn.disabled = true;
    }
  }
  //... rest of logic ...
  function connectCUCM() {
    isConnected = !isConnected;
    updateStatus();
    if (isConnected) {
      showToast('Connected to CUCM (simulated)', 'success');
    } else {
      showToast('Disconnected from CUCM (simulated)', 'info');
    }
  }

  function startRecording() {
    if (!isConnected) {
      showToast('Please connect to CUCM first', 'warning');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          const recording = {
            id: Date.now(),
            url: url,
            timestamp: new Date(),
            duration: 0,
          };
          recordings.push(recording);
          localStorage.setItem('recordings', JSON.stringify(recordings));
          updateRecordingsList();
          showToast('Recording saved', 'success');
        };

        mediaRecorder.start();
        isRecording = true;
        updateStatus();
        showToast('Recording started', 'info');
      })
      .catch((error) => {
        console.error('Error accessing microphone:', error);
        showToast('Failed to access microphone: ' + error.message, 'error');
      });
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      isRecording = false;
      updateStatus();
    }
  }

  function updateRecordingsList() {
    recordingsList.innerHTML = '';
    const recent = recordings.slice(-5).reverse();
    if (recent.length === 0) {
      recordingsList.innerHTML =
        '<li class="recording-item">No recordings yet</li>';
      return;
    }
    recent.forEach((recording) => {
      const li = document.createElement('li');
      li.className = 'recording-item';
      li.innerHTML = `
        <div class="recording-info">
          <span>${new Date(recording.timestamp).toLocaleString()}</span>
          <audio controls src="${recording.url}"></audio>
        </div>
      `;
      recordingsList.appendChild(li);
    });
  }

  // Event listeners
  connectBtn.addEventListener('click', connectCUCM);
  startBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);

  // Initialize
  updateStatus();
  updateRecordingsList();
}
