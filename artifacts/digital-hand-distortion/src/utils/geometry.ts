import type { Landmark, Point } from '../types';

export const FINGERTIP_INDICES = { thumb: 4, index: 8 };

export function lerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

export function smoothLandmarks(previous: Landmark[] | null, incoming: Landmark[], amount = .32): Landmark[] {
  if (!previous || previous.length !== incoming.length) return incoming.map((point) => ({ ...point }));
  return incoming.map((point, index) => ({
    x: lerp(previous[index].x, point.x, amount),
    y: lerp(previous[index].y, point.y, amount),
    z: lerp(previous[index].z ?? 0, point.z ?? 0, amount),
  }));
}

export function coverMetrics(videoWidth: number, videoHeight: number, width: number, height: number) {
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const drawnWidth = videoWidth * scale;
  const drawnHeight = videoHeight * scale;
  return { drawnWidth, drawnHeight, offsetX: (width - drawnWidth) / 2, offsetY: (height - drawnHeight) / 2 };
}

/** The one intentional mirror lives here: source landmarks are mirrored into the visible selfie canvas. */
export function landmarkToCanvas(landmark: Landmark, videoWidth: number, videoHeight: number, width: number, height: number): Point {
  const metrics = coverMetrics(videoWidth, videoHeight, width, height);
  return {
    x: metrics.offsetX + (1 - landmark.x) * metrics.drawnWidth,
    y: metrics.offsetY + landmark.y * metrics.drawnHeight,
  };
}

export function orderedFrame(left: Landmark[], right: Landmark[], videoWidth: number, videoHeight: number, width: number, height: number): Point[] {
  // Preserve the requested P1 → P2 → P3 → P4 order. Never sort or convex-hull this list.
  return [
    landmarkToCanvas(left[4], videoWidth, videoHeight, width, height),
    landmarkToCanvas(left[8], videoWidth, videoHeight, width, height),
    landmarkToCanvas(right[8], videoWidth, videoHeight, width, height),
    landmarkToCanvas(right[4], videoWidth, videoHeight, width, height),
  ];
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
