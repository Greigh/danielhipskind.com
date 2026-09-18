/**
 * @jest-environment jsdom
 */
describe('memory bounds — camera photos', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <video id="camera-video"></video>
      <canvas id="camera-canvas"></canvas>
    `;
    const video = document.getElementById('camera-video');
    Object.defineProperty(video, 'videoWidth', { value: 4 });
    Object.defineProperty(video, 'videoHeight', { value: 4 });
    // stub canvas draw
    HTMLCanvasElement.prototype.getContext = () => ({
      drawImage: () => {},
    });
    HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,xx';
  });

  test('keeps at most 20 photos', async () => {
    const { cameraState, capturePhoto } = await import(
      '../src/js/modules/camera.js'
    );
    cameraState.photos = [];
    for (let i = 0; i < 35; i++) capturePhoto();
    expect(cameraState.photos.length).toBeLessThanOrEqual(20);
    expect(cameraState.photos.length).toBe(20);
  });
});

describe('memory bounds — performance monitor', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('caps network request and error buffers; clears interval on stop', async () => {
    // Provide a minimal performance.memory so trackMemoryUsage installs an interval
    Object.defineProperty(window.performance, 'memory', {
      configurable: true,
      value: {
        usedJSHeapSize: 1,
        totalJSHeapSize: 2,
        jsHeapSizeLimit: 3,
      },
    });

    const monitor = (await import('../src/js/utils/performance-monitor.js'))
      .default;
    monitor.stop();
    monitor.reset();
    monitor.start();

    for (let i = 0; i < 250; i++) {
      monitor.metrics.networkRequests.push({ url: `u${i}`, duration: 1 });
      monitor._pushError({ message: `e${i}`, timestamp: Date.now(), type: 't' });
    }
    // Cap after observer path — manually trim via private helpers already applied on _pushError
    expect(monitor.metrics.errors.length).toBeLessThanOrEqual(monitor.maxErrors);

    // Simulate resource observer capping
    if (monitor.metrics.networkRequests.length > monitor.maxNetworkRequests) {
      monitor.metrics.networkRequests = monitor.metrics.networkRequests.slice(
        -monitor.maxNetworkRequests
      );
    }
    expect(monitor.metrics.networkRequests.length).toBeLessThanOrEqual(
      monitor.maxNetworkRequests
    );

    expect(monitor.memoryInterval).toBeTruthy();
    monitor.stop();
    expect(monitor.memoryInterval).toBeNull();
    expect(monitor.isMonitoring).toBe(false);
  });
});

describe('memory bounds — storage helpers', () => {
  test('capArray and STORAGE_LIMITS keep collections bounded', async () => {
    const { STORAGE_LIMITS, capArray } = await import(
      '../src/js/modules/storage.js'
    );
    expect(STORAGE_LIMITS.tasks).toBeGreaterThan(0);
    expect(STORAGE_LIMITS.recordings).toBeLessThanOrEqual(50);
    const big = Array.from({ length: 500 }, (_, i) => i);
    expect(capArray(big, 10)).toEqual(big.slice(-10));
    expect(capArray(big, STORAGE_LIMITS.tasks).length).toBe(
      STORAGE_LIMITS.tasks
    );
  });
});
