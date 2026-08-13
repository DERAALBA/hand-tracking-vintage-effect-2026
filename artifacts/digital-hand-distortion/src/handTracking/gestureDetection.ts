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
 * Detects a real double pinch:
 *
 * PINCH → RELEASE → PINCH
 *
 * Thumb tip = landmark 4
 * Index tip = landmark 8
 */
export class DoubleTapDetector {
  private pinching = false;
  private firstTapAt = -Infinity;
  private lastTriggerAt = -Infinity;

  // Increased so the gesture is easier to perform.
  private readonly pinchThreshold = 0.085;

  // Fingers must separate this much before another pinch.
  private readonly releaseThreshold = 0.105;

  // Maximum time between the two pinches.
  private readonly doubleTapWindow = 1000;

  // Prevent accidental multiple triggers.
  private readonly cooldown = 900;

  update(points: Landmark[], now: number): boolean {
    if (points.length < 21) {
      this.pinching = false;
      return false;
    }

    const thumbTip = points[4];
    const indexTip = points[8];

    if (!thumbTip || !indexTip) {
      this.pinching = false;
      return false;
    }

    const pinchDistance = distance(thumbTip, indexTip);

    const isPinch = pinchDistance <= this.pinchThreshold;
    const isRelease = pinchDistance >= this.releaseThreshold;

    /*
     * If the fingers are currently touching,
     * wait until they separate.
     */
    if (this.pinching) {
      if (isRelease) {
        this.pinching = false;
      }

      return false;
    }

    /*
     * Nothing happens until a new pinch starts.
     */
    if (!isPinch) {
      return false;
    }

    /*
     * Register this as a NEW pinch.
     */
    this.pinching = true;

    /*
     * Ignore gestures during cooldown.
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
     * Second pinch detected.
     * Change the effect.
     */
    this.lastTriggerAt = now;
    this.firstTapAt = -Infinity;

    return true;
  }
}
