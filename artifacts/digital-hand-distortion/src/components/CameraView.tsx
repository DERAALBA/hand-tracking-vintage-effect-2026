import { useEffect, useRef } from 'react';
import { EFFECT_PRESETS } from '../effects/effectPresets';
import { MediaPipeHands } from '../handTracking/MediaPipeHands';
import type { TrackingFrame } from '../types';
import { renderFrame } from '../rendering/CanvasDistortionRenderer';

const DEBUG = false;
const DEFAULT_EFFECT_INDEX = Math.max(0, EFFECT_PRESETS.findIndex((preset) => preset.mode === 'crt'));

type CameraViewProps = { stream: MediaStream };

export function CameraView({ stream }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<TrackingFrame>({ left: null, right: null, timestamp: 0 });
  const presetIndex = useRef(DEFAULT_EFFECT_INDEX);
  const frameAlpha = useRef(0);
  const targetFrameAlpha = useRef(0);
  const transitionAt = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    void video.play();
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const source = document.createElement('canvas');
    const sourceContext = source.getContext('2d', { alpha: false });
    if (!sourceContext) return;
    sourceRef.current = source;

    let displayWidth = 0;
    let displayHeight = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      displayWidth = window.innerWidth;
      displayHeight = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(displayWidth * dpr));
      canvas.height = Math.max(1, Math.floor(displayHeight * dpr));
      source.width = canvas.width;
      source.height = canvas.height;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const cycleEffect = () => {
      presetIndex.current = (presetIndex.current + 1) % EFFECT_PRESETS.length;
      transitionAt.current = performance.now();
    };
    const tracker = new MediaPipeHands(video, {
      onCycle: cycleEffect,
      onFrame: (hands, timestamp) => {
        frameRef.current = { ...hands, timestamp };
        targetFrameAlpha.current = hands.left?.open && hands.right?.open ? 1 : 0;
      },
    });
    void tracker.start().catch(() => {
      // The camera remains a useful mirror if the optional tracking model is blocked.
    });

    const draw = (now: number) => {
      frameAlpha.current += (targetFrameAlpha.current - frameAlpha.current) * (targetFrameAlpha.current > frameAlpha.current ? .12 : .19);
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        renderFrame({
          video,
          canvas,
          source,
          sourceContext,
          context,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          frame: frameRef.current,
          preset: EFFECT_PRESETS[presetIndex.current],
          frameAlpha: frameAlpha.current,
          now,
          transitionAt: transitionAt.current,
        });
      }
      if (DEBUG) console.debug('digital distortion frame', now);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      tracker.stop();
      window.removeEventListener('resize', resize);
      video.pause();
      video.srcObject = null;
      sourceRef.current = null;
    };
  }, [stream]);

  return (
    <main className="camera-stage" data-testid="camera-stage">
      <video ref={videoRef} className="sr-only" autoPlay playsInline muted aria-hidden="true" />
      <canvas ref={canvasRef} className="camera-canvas" aria-label="Live mirrored camera installation" />
    </main>
  );
}
