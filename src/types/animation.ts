// ============================================================
// src/types/animation.ts — Image loop player types
// ============================================================

export type PlaybackMode = 'loop' | 'rock' // loop = A→Z→A, rock = A→Z→A→Z (ping-pong)

export type FrameCount = 12 | 24 | 36 | 48 | 60 | 72 | 84 | 96 | 120 | 150 | 180 | 240

export const FRAME_COUNT_OPTIONS: FrameCount[] = [
  12, 24, 36, 48, 60, 72, 84, 96, 120, 150, 180, 240,
]

/** Milliseconds between frames — lower = faster */
export type PlaybackSpeed = number

export const DEFAULT_SPEED_MS = 200
export const MIN_SPEED_MS = 50
export const MAX_SPEED_MS = 1000
export const SPEED_STEP_MS = 50

export interface AnimationPlayerState {
  isPlaying: boolean
  currentFrame: number
  totalFrames: number
  frameCount: FrameCount
  mode: PlaybackMode
  speedMs: PlaybackSpeed
  showGrid: boolean
  direction: 1 | -1 // for rock mode
}

export interface AnimationFrame {
  url: string
  timestamp: Date
  loaded: boolean
  error?: boolean
}
