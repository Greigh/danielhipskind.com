// Camera Integration Module
// Allows photo capture during calls

export const cameraState = {
  stream: null,
  canvas: null,
  photos: [],
};

export function initializeCamera() {
  setupCameraEventListeners();
}

function setupCameraEventListeners() {
  // Add event listeners for camera button
}

export async function startCamera() {
  try {
    cameraState.stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    const video = document.getElementById('camera-video');
    if (video) {
      video.srcObject = cameraState.stream;
    }
  } catch (err) {
    console.error('Camera access denied:', err);
  }
}

export function stopCamera() {
  if (cameraState.stream) {
    cameraState.stream.getTracks().forEach((track) => track.stop());
    cameraState.stream = null;
  }
}

export function capturePhoto() {
  const video = document.getElementById('camera-video');
  const canvas =
    document.getElementById('camera-canvas') ||
    document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  const photo = canvas.toDataURL('image/png');
  cameraState.photos.push(photo);
  return photo;
}

export function getPhotos() {
  return cameraState.photos;
}
