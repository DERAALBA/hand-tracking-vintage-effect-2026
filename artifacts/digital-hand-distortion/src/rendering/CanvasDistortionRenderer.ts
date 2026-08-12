import type { EffectPreset } from '../effects/effectPresets';
import type { Landmark, Point, TrackingFrame, TrackedHand } from '../types';
import { coverMetrics, landmarkToCanvas, orderedFrame } from '../utils/geometry';

const FINGER_PATHS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const PALM_PATH = [0, 5, 9, 13, 17];

export type RendererInput = {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  source: HTMLCanvasElement;
  sourceContext: CanvasRenderingContext2D;
  context: CanvasRenderingContext2D;
  videoWidth: number;
  videoHeight: number;
  frame: TrackingFrame;
  preset: EffectPreset;
  frameAlpha: number;
  now: number;
  transitionAt: number;
};

function drawCover(context: CanvasRenderingContext2D, source: CanvasImageSource, videoWidth: number, videoHeight: number, width: number, height: number) {
  const metrics = coverMetrics(videoWidth, videoHeight, width, height);
  context.drawImage(source, metrics.offsetX, metrics.offsetY, metrics.drawnWidth, metrics.drawnHeight);
}

function clipFrame(context: CanvasRenderingContext2D, frame: Point[]) {
  context.beginPath();
  context.moveTo(frame[0].x, frame[0].y);
  for (let index = 1; index < frame.length; index += 1) context.lineTo(frame[index].x, frame[index].y);
  context.closePath();
  // Non-zero fill preserves both lobes of a bow-tie without reordering its points.
  context.clip('nonzero');
}

function drawDisplacedCamera(context: CanvasRenderingContext2D, source: HTMLCanvasElement, width: number, height: number, preset: EffectPreset, now: number) {
  const rows = preset.pixel > .04 ? 24 : 38;
  const rowHeight = height / rows;
  const pulse = now * .001;
  context.save();
  context.globalCompositeOperation = 'source-over';
  for (let row = 0; row < rows; row += 1) {
    const y = row * rowHeight;
    const normalized = row / rows;
    const sine = Math.sin(normalized * 16 + pulse * 2.2) * preset.wave * width;
    const liquid = Math.sin(normalized * 37 - pulse * 1.6) * preset.liquid * width;
    const tear = Math.sin(row * 41.17 + pulse * 8.3) > .975 ? preset.tear * width : 0;
    const pixelShift = preset.pixel * width * Math.sin(row * 2.7 + pulse * 4.2) * .35;
    const offset = sine + liquid + tear + pixelShift;
    context.drawImage(source, 0, y, width, rowHeight + 1, offset, y + Math.sin(row * .6 + pulse) * preset.liquid * height, width, rowHeight + 1);
  }
  context.restore();
}

function drawChromaticGhost(context: CanvasRenderingContext2D, source: HTMLCanvasElement, width: number, height: number, amount: number, now: number) {
  if (amount <= .001) return;
  const offset = (Math.sin(now * .0023) * .45 + .55) * amount * width;
  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = .22;
  context.globalCompositeOperation = 'lighter';
  context.drawImage(source, offset, 0, width, height);
  context.globalAlpha = .14;
  context.drawImage(source, -offset * 1.35, Math.sin(now * .001) * amount * height, width, height);
  context.restore();
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawAnalogSignalImage(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
  preset: EffectPreset,
  now: number,
) {
  const strength = preset.crtStrength ?? .8;
  const rows = strength > 1 ? 44 : 54;
  const rowHeight = height / rows;
  const pulse = now * .001;
  const signalBucket = Math.floor(now / 185);

  context.save();
  // Warm the source itself so faces and objects stay recognizable beneath the analog treatment.
  context.filter = `sepia(${.38 + strength * .08}) saturate(${.74 - strength * .06}) contrast(${1.02 + strength * .04}) brightness(${.99 - strength * .035})`;
  context.globalAlpha = .96;
  for (let row = 0; row < rows; row += 1) {
    const y = row * rowHeight;
    const wave = Math.sin(row * .39 + pulse * 1.25) * width * (.0022 + strength * .0012);
    const tracking = Math.sin(row * .11 - pulse * .72) * height * (.0006 + strength * .00045);
    const unstable = pseudoRandom(signalBucket * 7.1 + row * .83) > .982
      ? (pseudoRandom(signalBucket * 11.3 + row) - .5) * width * (.018 + strength * .012)
      : 0;
    context.drawImage(source, 0, y, width, rowHeight + 1, wave + unstable, y + tracking, width, rowHeight + 1);
  }
  context.restore();

  // A short phosphor trail gives moving faces a soft, aged persistence without becoming blur.
  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = .045 + strength * .018;
  context.filter = 'sepia(.6) saturate(.5) blur(1px)';
  const ghostX = Math.sin(pulse * .8) * (1.2 + strength * 1.5);
  const ghostY = Math.sin(pulse * .45) * .7;
  context.drawImage(source, ghostX, ghostY, width, height);
  context.restore();
}

function drawAnalogChromaticMisalignment(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
  strength: number,
  now: number,
) {
  const shift = (1.3 + Math.sin(now * .0021) * .45) * strength;
  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = .07 + strength * .025;
  context.filter = 'sepia(.3) saturate(.7) hue-rotate(-18deg)';
  context.drawImage(source, -shift, Math.sin(now * .0013) * .35, width, height);
  context.filter = 'sepia(.22) saturate(.62) hue-rotate(26deg)';
  context.globalAlpha = .055 + strength * .02;
  context.drawImage(source, shift * 1.35, -Math.sin(now * .0011) * .35, width, height);
  context.restore();
}

function drawCrtScanlines(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: EffectPreset,
  now: number,
) {
  const strength = preset.crtStrength ?? .8;
  const gap = Math.max(4, Math.round(height / (strength > 1 ? 155 : 185)));
  const drift = Math.sin(now * .0007) * gap;

  context.save();
  context.globalCompositeOperation = 'multiply';
  context.lineWidth = Math.max(1, height / 1100);
  for (let y = -gap; y < height + gap; y += gap) {
    const variance = .55 + .45 * Math.sin(y * .047 + now * .0015);
    context.globalAlpha = (.045 + preset.scan * .34) * variance;
    context.strokeStyle = 'rgba(87, 56, 17, .78)';
    context.beginPath();
    context.moveTo(0, y + drift);
    context.lineTo(width, y + drift);
    context.stroke();
  }
  context.restore();
}

function drawAnalogNoise(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: EffectPreset,
  now: number,
) {
  const strength = preset.crtStrength ?? .8;
  const grainBucket = Math.floor(now / 55);
  const particleCount = strength > 1 ? 300 : 190;

  context.save();
  context.globalCompositeOperation = 'screen';
  for (let index = 0; index < particleCount; index += 1) {
    const seed = grainBucket * .91 + index * 17.17;
    const x = pseudoRandom(seed) * width;
    const y = pseudoRandom(seed + 3.7) * height;
    const size = .35 + pseudoRandom(seed + 8.2) * (strength > 1 ? 1.35 : .9);
    const bright = .06 + pseudoRandom(seed + 12.8) * (.15 + strength * .06);
    context.globalAlpha = bright;
    context.fillStyle = pseudoRandom(seed + 4.4) > .18
      ? 'rgba(255, 225, 162, .9)'
      : 'rgba(57, 40, 19, .72)';
    context.fillRect(x, y, size, size);
  }
  context.restore();
}

function drawAnalogSparks(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: EffectPreset,
  now: number,
) {
  const strength = preset.crtStrength ?? .8;
  const bucketDuration = 145;
  const bucket = Math.floor(now / bucketDuration);
  const sparks = strength > 1 ? 18 : 11;

  context.save();
  context.globalCompositeOperation = 'screen';
  context.lineCap = 'round';
  for (let index = 0; index < sparks; index += 1) {
    const seed = bucket * 19.17 + index * 31.41;
    const start = bucket * bucketDuration + pseudoRandom(seed) * 125;
    const lifetime = 80 + pseudoRandom(seed + 2.4) * 220;
    const age = now - start;
    if (age < 0 || age > lifetime) continue;

    const lifeProgress = age / lifetime;
    const fade = Math.sin(Math.PI * lifeProgress);
    const x = pseudoRandom(seed + 5.2) * width;
    const y = pseudoRandom(seed + 9.8) * height;
    const length = 2 + pseudoRandom(seed + 13.4) * (5 + strength * 12);
    const angle = (pseudoRandom(seed + 16.9) - .5) * Math.PI;
    const size = .7 + pseudoRandom(seed + 21.6) * (1.4 + strength);

    context.globalAlpha = fade * (.35 + pseudoRandom(seed + 25.1) * .65);
    context.strokeStyle = pseudoRandom(seed + 27.7) > .1
      ? 'rgba(255, 220, 132, .95)'
      : 'rgba(213, 246, 236, .9)';
    context.lineWidth = size;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();

    if (pseudoRandom(seed + 30.3) > .7) {
      context.beginPath();
      context.moveTo(x + Math.cos(angle) * length * .35, y + Math.sin(angle) * length * .35);
      context.lineTo(x + Math.cos(angle + .7) * length * .7, y + Math.sin(angle + .7) * length * .7);
      context.stroke();
    }
    context.fillStyle = 'rgba(255, 245, 207, .95)';
    context.beginPath();
    context.arc(x, y, size * 1.2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawCrtVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: EffectPreset,
  now: number,
) {
  const strength = preset.crtStrength ?? .8;
  const flicker = .99 + Math.sin(now * .012) * .012 + Math.sin(now * .0026) * .008;
  const gradient = context.createRadialGradient(width * .5, height * .47, Math.min(width, height) * .12, width * .5, height * .5, Math.max(width, height) * .68);
  gradient.addColorStop(0, `rgba(255, 236, 175, ${Math.max(0, (flicker - .98) * .22)})`);
  gradient.addColorStop(.58, 'rgba(102, 62, 19, .02)');
  gradient.addColorStop(1, `rgba(24, 14, 5, ${.19 + strength * .08})`);

  context.save();
  context.globalCompositeOperation = 'multiply';
  context.globalAlpha = .86;
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawAnalogCrt(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
  preset: EffectPreset,
  now: number,
) {
  const strength = preset.crtStrength ?? .8;
  drawAnalogSignalImage(context, source, width, height, preset, now);
  drawAnalogChromaticMisalignment(context, source, width, height, strength, now);
  drawCrtScanlines(context, width, height, preset, now);
  drawAnalogNoise(context, width, height, preset, now);
  drawAnalogSparks(context, width, height, preset, now);
  drawCrtVignette(context, width, height, preset, now);
}

function traceHand(context: CanvasRenderingContext2D, hand: TrackedHand, videoWidth: number, videoHeight: number, width: number, height: number, now: number, alpha: number) {
  const points = hand.landmarks.map((point) => landmarkToCanvas(point, videoWidth, videoHeight, width, height));
  context.save();
  context.globalAlpha = alpha;
  context.lineWidth = Math.max(0.7, Math.min(width, height) * .00125);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = 'rgba(112, 246, 237, .68)';
  context.shadowColor = 'rgba(81, 226, 255, .72)';
  context.shadowBlur = Math.max(3, Math.min(width, height) * .008);
  FINGER_PATHS.forEach((path, pathIndex) => {
    context.setLineDash([Math.max(3, width * .006), Math.max(3, width * .0045)]);
    context.lineDashOffset = -(now * (.012 + pathIndex * .002)) % 20;
    context.beginPath();
    path.forEach((landmarkIndex, pointIndex) => {
      const point = points[landmarkIndex];
      if (pointIndex === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
    const pulsePosition = (now * (.00018 + pathIndex * .000025) + pathIndex * .19) % 1;
    const segmentPosition = pulsePosition * (path.length - 1);
    const segment = Math.min(path.length - 2, Math.floor(segmentPosition));
    const segmentT = segmentPosition - segment;
    const pulseStart = points[path[segment]];
    const pulseEnd = points[path[segment + 1]];
    const pulseX = pulseStart.x + (pulseEnd.x - pulseStart.x) * segmentT;
    const pulseY = pulseStart.y + (pulseEnd.y - pulseStart.y) * segmentT;
    context.setLineDash([]);
    context.fillStyle = 'rgba(167, 255, 247, .8)';
    context.beginPath();
    context.arc(pulseX, pulseY, Math.max(1, Math.min(width, height) * .0017), 0, Math.PI * 2);
    context.fill();
  });
  context.setLineDash([4, 12]);
  context.lineDashOffset = now * -.006;
  context.strokeStyle = 'rgba(156, 151, 255, .36)';
  context.shadowBlur = 0;
  context.beginPath();
  PALM_PATH.forEach((landmarkIndex, pointIndex) => {
    const point = points[landmarkIndex];
    if (pointIndex === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();
  context.setLineDash([]);
  [4, 8, 12, 16, 20].forEach((index, nodeIndex) => {
    const point = points[index];
    const radius = Math.max(1.25, Math.min(width, height) * .0023);
    context.fillStyle = nodeIndex === 1 ? 'rgba(255, 220, 124, .96)' : 'rgba(115, 255, 246, .92)';
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    if (nodeIndex === 1) {
      context.strokeStyle = 'rgba(255, 220, 124, .55)';
      context.lineWidth = .7;
      context.beginPath();
      context.arc(point.x, point.y, radius * (3 + (Math.sin(now * .005) + 1) * 1.6), 0, Math.PI * 2);
      context.stroke();
    }
  });
  context.restore();
}

export function renderFrame(input: RendererInput) {
  const { context, source, sourceContext, video, canvas, frame, preset, now } = input;
  const width = canvas.width;
  const height = canvas.height;
  sourceContext.setTransform(1, 0, 0, 1, 0, 0);
  sourceContext.clearRect(0, 0, width, height);
  // Draw the single mirrored source once. Every composite layer reuses this exact orientation.
  sourceContext.save();
  sourceContext.translate(width, 0);
  sourceContext.scale(-1, 1);
  drawCover(sourceContext, video, input.videoWidth, input.videoHeight, width, height);
  sourceContext.restore();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0);

  const leftHand = frame.left;
  const rightHand = frame.right;
  const canFrame = leftHand?.open && rightHand?.open && leftHand.landmarks.length >= 21 && rightHand.landmarks.length >= 21;
  const alpha = input.frameAlpha;
  if (canFrame && alpha > .008) {
    const polygon = orderedFrame(leftHand.landmarks, rightHand.landmarks, input.videoWidth, input.videoHeight, width, height);
    context.save();
    context.globalAlpha = alpha;
    clipFrame(context, polygon);
    if (preset.mode === 'crt') {
      drawAnalogCrt(context, source, width, height, preset, now);
    } else {
      drawDisplacedCamera(context, source, width, height, preset, now);
      drawChromaticGhost(context, source, width, height, preset.chroma, now);
    }
    const transition = Math.min(1, (now - input.transitionAt) / 230);
    if (transition < 1) {
      context.globalAlpha = (1 - transition) * .14;
      context.fillStyle = `rgb(${preset.tint[0] * 255}, ${preset.tint[1] * 255}, ${preset.tint[2] * 255})`;
      context.fillRect(0, 0, width, height);
    }
    context.restore();
    context.save();
    context.globalAlpha = alpha * .78;
    context.lineWidth = Math.max(1, Math.min(width, height) * .0017);
    context.strokeStyle = 'rgba(122, 255, 246, .82)';
    context.shadowColor = 'rgba(76, 233, 255, .85)';
    context.shadowBlur = Math.max(5, Math.min(width, height) * .012);
    context.beginPath();
    context.moveTo(polygon[0].x, polygon[0].y);
    polygon.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.stroke();
    context.restore();
  }

  const hands = [frame.left, frame.right];
  hands.forEach((hand) => {
    if (hand) traceHand(context, hand, input.videoWidth, input.videoHeight, width, height, now, alpha);
  });
}
