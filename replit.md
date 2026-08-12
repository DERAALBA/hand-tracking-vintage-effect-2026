# Digital Hand Distortion

An experimental browser camera installation where both hands shape a live digital distortion window with their fingertips.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/digital-hand-distortion/src/components/` — start screen and fullscreen camera surface
- `artifacts/digital-hand-distortion/src/handTracking/` — MediaPipe loader, smoothing, and gesture detection
- `artifacts/digital-hand-distortion/src/rendering/` — camera compositing, hand traces, frame masking, and distortion
- `artifacts/digital-hand-distortion/src/effects/` — the ten distortion presets
- `artifacts/digital-hand-distortion/src/utils/geometry.ts` — mirrored coordinate mapping and natural fingertip order
- `attached_assets/` — the original product brief and reference video

## Architecture decisions

- The camera is rendered once into a mirrored source canvas; both the normal background and the masked distortion reuse that same source to prevent orientation drift.
- The fingertip polygon keeps the exact left-thumb → left-index → right-index → right-thumb order; it is never convex-hulled or centroid-sorted, so ribbon and bow-tie shapes remain possible.
- High-frequency tracking and animation data live in refs and mutable renderer state instead of React state.
- MediaPipe Hands is loaded client-side from its browser distribution, so the camera installation does not require a backend.

## Product

- A minimal start screen requests camera access only after the user presses `START CAMERA`.
- The active experience is a clean fullscreen mirrored camera with no status overlay.
- Two open hands create a live distortion frame controlled by four fingertips, with liquid, chromatic, glitch, wave, VHS, pixel, and lens variations.
- Index-finger double taps cycle effects; closing either hand or leaving the frame hides the distortion while preserving the selected effect.
- Hands are traced with segmented cyan/lilac scan lines, moving pulses, and fingertip nodes rather than debug skeleton labels.

## User preferences

 - Keep the active camera surface free of informational overlays.
 - Prioritize stable tracking and orientation correctness over more aggressive visual effects.

## Gotchas

- Camera permissions and MediaPipe model loading only work in a secure browser context.
- The app is camera-dependent; the launch screen and passive mirror remain usable when access is denied, but hand effects cannot appear without permission and a model load.
- Never add a second horizontal mirror to the WebGL/canvas distortion source.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
