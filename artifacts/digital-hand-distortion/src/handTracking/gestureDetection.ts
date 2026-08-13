```ts
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
 * Easy double-finger gesture.
 *
 * Gesture:
 *   🤏 → release sedikit → 🤏
 *
 * Tidak perlu menyentuhkan jempol dan telunjuk
 * dengan sangat rapat.
 */
export class DoubleTapDetector {
  private pinching = false;
  private firstTapAt = -Infinity;
  private lastTriggerAt = -Infinity;

  // Dibuat longgar supaya gesture mudah dilakukan.
  private readonly pinchThreshold = 0.11;

  // Tidak perlu membuka jari terlalu jauh.
  private readonly releaseThreshold = 0.13;

  // Waktu antar tap dibuat lebih panjang.
  private readonly doubleTapWindow = 1000;

  // Mencegah satu gesture menghasilkan banyak perubahan.
  private readonly cooldown = 700;

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
     * Kalau sedang dalam kondisi tap,
     * tunggu sampai jari sedikit menjauh.
     */
    if (this.pinching) {
      if (isRelease) {
        this.pinching = false;
      }

      return false;
    }

    /*
     * Belum melakukan tap.
     */
    if (!isPinch) {
      return false;
    }

    /*
     * Tap baru terdeteksi.
     */
    this.pinching = true;

    /*
     * Hindari trigger berulang terlalu cepat.
     */
    if (now - this.lastTriggerAt < this.cooldown) {
      return false;
    }

    /*
     * TAP PERTAMA
     */
    if (now - this.firstTapAt > this.doubleTapWindow) {
      this.firstTapAt = now;
      return false;
    }

    /*
     * TAP KEDUA
     *
     * Double tap berhasil.
     */
    this.lastTriggerAt = now;
    this.firstTapAt = -Infinity;

    return true;
  }
}
```
