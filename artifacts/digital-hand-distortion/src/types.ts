export type Point = { x: number; y: number };
export type Landmark = Point & { z?: number };
export type Side = 'left' | 'right';

export type TrackedHand = {
  side: Side;
  landmarks: Landmark[];
  open: boolean;
};

export type TrackingFrame = {
  left: TrackedHand | null;
  right: TrackedHand | null;
  timestamp: number;
};
