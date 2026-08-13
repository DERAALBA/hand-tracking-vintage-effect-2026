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

export class DoubleTapDetector {
  private isPinching = false;
  private firstTapAt = -Infinity;
  private lastTriggerAt = -Infinity;

  // Dibuat lebih longgar supaya tidak perlu
  // menempelkan jempol dan telunjuk dengan presisi.
  private readonly pinchThreshold = 0.11;

  // Jari cukup menjauh sedikit untuk dianggap release.
  private readonly releaseThreshold = 0.13;

  // Waktu antar dua tap diperlonggar.
  private readonly doubleTapWindow = 1000;

  // Mencegah satu gerakan menghasilkan banyak trigger.
  private readonly cooldown = 700;

  update(points: Landmark[], now: number): boolean {
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

    // Sedang dalam kondisi tap.
    // Tunggu sampai jari sedikit menjauh.
    if (this.isPinching) {
      if (released) {
        this.isPinching = false;
      }

      return false;
    }

    // Belum cukup dekat untuk dianggap tap.
    if (!pinching) {
      return false;
    }

    // Tap baru dimulai.
    this.isPinching = true;

    // Cooldown setelah efek berubah.
    if (now - this.lastTriggerAt < this.cooldown) {
      return false;
    }

    // Tap pertama.
    if (now - this.firstTapAt > this.doubleTapWindow) {
      this.firstTapAt = now;
      return false;
    }

    // Tap kedua berhasil.
    this.lastTriggerAt = now;
    this.firstTapAt = -Infinity;

    return true;
  }
}
