import type { Landmark } from '../types';
import { distance } from '../utils/geometry';

const FINGER_PAIRS = [
  [8, 5],
  [12, 9],
  [16, 13],
  [20, 17],
] as const;

export function isHandOpen(points: Landmark[]) {
  if (points.length < 21) return false;
  const palm = Math.max(distance(points[0], points[9]), 0.035);
  const extended = FINGER_PAIRS.filter(([tip, joint]) => distance(points[tip], points[0]) > distance(points[joint], points[0]) + palm * .12).length;
  const thumbExtended = distance(points[4], points[0]) > distance(points[3], points[0]) + palm * .07;
  return extended + (thumbExtended ? 1 : 0) >= 3;
}

export class DoubleTapDetector {
  private previous: { x: number; y: number; time: number } | null = null;
  private lastTap = -Infinity;
  private armedAt = -Infinity;

  update(point: Landmark, now: number) {
    if (!this.previous) {
      this.previous = { x: point.x, y: point.y, time: now };
      return false;
    }
    const dt = Math.max(1, now - this.previous.time);
    const movement = Math.hypot(point.x - this.previous.x, point.y - this.previous.y);
    const velocity = movement / dt;
    this.previous = { x: point.x, y: point.y, time: now };
    const tap = velocity > .00125 && movement > .008;
    if (!tap || now - this.lastTap < 650) return false;
    if (now - this.armedAt >= 150 && now - this.armedAt <= 450) {
      this.lastTap = now;
      this.armedAt = -Infinity;
      return true;
    }
    this.armedAt = now;
    return false;
  }
}
