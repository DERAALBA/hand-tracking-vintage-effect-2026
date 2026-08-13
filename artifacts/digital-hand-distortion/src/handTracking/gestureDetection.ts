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

  const extended = FINGER_PAIRS.filter(
    ([tip, joint]) =>
      distance(points[tip], points[0]) >
      distance(points[joint], points[0]) + palm * 0.12,
  ).length;

  const thumbExtended =
    distance(points[4], points[0]) >
    distance(points[3], points[0]) + palm * 0.07;

  return extended + (thumbExtended ? 1 : 0) >= 3;
}

/**
 * Detects:
 *
 * PINCH → RELEASE → PINCH
 *
 * using the thumb tip (4) and index finger tip (8).
 *
 * One successful sequence = one effect change.
 */
export class DoubleTapDetector {
  private isPinching = false;
  private firstTapAt = -Infinity;
  private lastTriggerAt = -Infinity;

  // How close thumb and index finger must be.
  private readonly pinchThreshold = 0.055;

  // How far they must separate before another tap is allowed.
  private readonly releaseThreshold = 0.075;

  // Maximum time allowed between first and second tap.
  private readonly doubleTapWindow = 650;

  // Prevent accidental repeated triggers.
  private readonly cooldown = 800;

  update(points: Landmark[], now: number) {
    if (points.length < 21) {
      this.isPinching = false;
      return false;
    }

    const thumbTip = points[4];
    const indexTip = points[8];

    if (!thumbTip || !indexTip) {
      this.isPinching = false;
      return false;
    }

    const pinchDistance = distance(thumbTip, indexTip);

    const pinching = pinchDistance <= this.pinchThreshold;
    const released = pinchDistance >= this.releaseThreshold;

    /*
     * While fingers are still touching,
     * do nothing. This prevents repeated triggers.
     */
    if (this.isPinching) {
      if (released) {
        this.isPinching = false;
      }

      return false;
    }

    /*
     * We only react when a NEW pinch begins.
     */
    if (!pinching) {
      return false;
    }

    this.isPinching = true;

    /*
     * Cooldown after a successful double tap.
     */
    if (now - this.lastTriggerAt < this.cooldown) {
      return false;
    }

    /*
     * First pinch.
     */
    if (now - this.firstTapAt > this.doubleTapWindow) {
      this.firstTapAt = now;
      return false;
    }

    /*
     * Second pinch within the allowed window.
     */
    this.lastTriggerAt = now;
    this.firstTapAt = -Infinity;

    return true;
  }
}
