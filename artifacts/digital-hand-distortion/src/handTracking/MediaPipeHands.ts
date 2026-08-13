import type { Landmark, Side, TrackedHand } from '../types';
import { smoothLandmarks } from '../utils/geometry';
import { DoubleTapDetector, isHandOpen } from './gestureDetection';

type Results = {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
  multiHandedness?: Array<{ label?: string; classification?: Array<{ label?: string }> }>;
};

type HandsInstance = {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: Results) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
};

declare global {
  interface Window {
    Hands?: new (options: { locateFile: (file: string) => string }) => HandsInstance;
  }
}

let handsScript: Promise<void> | null = null;

function loadScript() {
  if (window.Hands) return Promise.resolve();
  if (!handsScript) {
    handsScript = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-mediapipe-hands]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Hand tracking library could not load.')));
        return;
      }
      const script = document.createElement('script');
      script.dataset.mediapipeHands = 'true';
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Hand tracking library could not load.'));
      document.head.appendChild(script);
    });
  }
  return handsScript;
}

export type HandTrackingCallbacks = {
  onFrame: (hands: { left: TrackedHand | null; right: TrackedHand | null }, timestamp: number) => void;
  onCycle: () => void;
};

export class MediaPipeHands {
  private instance: HandsInstance | null = null;
  private streamLoop = 0;
  private active = true;
  private sending = false;
  private leftLandmarks: Landmark[] | null = null;
  private rightLandmarks: Landmark[] | null = null;
  private leftIndexTap = new DoubleTapDetector();
  private rightIndexTap = new DoubleTapDetector();

  constructor(private video: HTMLVideoElement, private callbacks: HandTrackingCallbacks) {}

  async start() {
    await loadScript();
    if (!window.Hands) throw new Error('Hand tracking is unavailable in this browser.');
    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: .64, minTrackingConfidence: .6 });
    hands.onResults((results) => this.handleResults(results));
    this.instance = hands;
    this.tick();
  }

  stop() {
    this.active = false;
    cancelAnimationFrame(this.streamLoop);
    this.instance?.close?.();
    this.instance = null;
  }

  private tick = () => {
    if (!this.active) return;
    if (this.instance && this.video.readyState >= 2 && !this.sending) {
      this.sending = true;
      this.instance.send({ image: this.video }).catch(() => undefined).finally(() => { this.sending = false; });
    }
    this.streamLoop = requestAnimationFrame(this.tick);
  };

  private handleResults(results: Results) {
    const next: Record<Side, TrackedHand | null> = { left: null, right: null };
    (results.multiHandLandmarks ?? []).forEach((raw, index) => {
      const points = raw.map((point) => ({ x: point.x, y: point.y, z: point.z }));
      const handedness = results.multiHandedness?.[index];
      const label = (handedness?.label ?? handedness?.classification?.[0]?.label ?? '').toLowerCase();
      // MediaPipe labels the unmirrored source. The visible selfie sides are therefore reversed.
      const side: Side = label === 'right' ? 'left' : label === 'left' ? 'right' : (points[0]?.x ?? .5) > .5 ? 'left' : 'right';
      const previous = side === 'left' ? this.leftLandmarks : this.rightLandmarks;
      const smoothed = smoothLandmarks(previous, points, .28);
      if (side === 'left') this.leftLandmarks = smoothed;
      else this.rightLandmarks = smoothed;
      next[side] = { side, landmarks: smoothed, open: isHandOpen(smoothed) };
    });
    const now = performance.now();

const leftTap = next.left?.landmarks
  ? this.leftIndexTap.update(next.left.landmarks, now)
  : false;

const rightTap = next.right?.landmarks
  ? this.rightIndexTap.update(next.right.landmarks, now)
  : false;

if (leftTap || rightTap) this.callbacks.onCycle();
    this.callbacks.onFrame(next, now);
  }
}
