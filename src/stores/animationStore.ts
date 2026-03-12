// ============================================================
// src/stores/animationStore.ts — Global animation player state
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AnimationPlayerState,
  FrameCount,
  PlaybackMode,
  PlaybackSpeed,
} from '@/types/animation'
import {
  DEFAULT_SPEED_MS,
  MIN_SPEED_MS,
  MAX_SPEED_MS,
  SPEED_STEP_MS,
} from '@/types/animation'

interface AnimationStore extends AnimationPlayerState {
  // Actions
  play: () => void
  pause: () => void
  toggle: () => void
  setFrame: (frame: number) => void
  nextFrame: () => void
  prevFrame: () => void
  setFrameCount: (count: FrameCount) => void
  setMode: (mode: PlaybackMode) => void
  increaseSpeed: () => void
  decreaseSpeed: () => void
  setSpeed: (ms: PlaybackSpeed) => void
  toggleGrid: () => void
  setTotalFrames: (n: number) => void
  reset: () => void
}

const defaultState: AnimationPlayerState = {
  isPlaying: true,
  currentFrame: 0,
  totalFrames: 0,
  frameCount: 24,
  mode: 'loop',
  speedMs: DEFAULT_SPEED_MS,
  showGrid: false,
  direction: 1,
}

export const useAnimationStore = create<AnimationStore>()(
  persist(
    (set) => ({
      ...defaultState,

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

      setFrame: (frame) => set({ currentFrame: frame }),

      nextFrame: () =>
        set((s) => {
          const next = s.currentFrame + 1
          if (next >= s.totalFrames) {
            if (s.mode === 'rock') return { currentFrame: s.totalFrames - 2, direction: -1 as const }
            return { currentFrame: 0 }
          }
          return { currentFrame: next }
        }),

      prevFrame: () =>
        set((s) => {
          const prev = s.currentFrame - 1
          if (prev < 0) {
            if (s.mode === 'rock') return { currentFrame: 1, direction: 1 as const }
            return { currentFrame: s.totalFrames - 1 }
          }
          return { currentFrame: prev }
        }),

      setFrameCount: (count) => set({ frameCount: count, currentFrame: 0 }),

      setMode: (mode) => set({ mode, direction: 1 }),

      increaseSpeed: () =>
        set((s) => ({ speedMs: Math.max(MIN_SPEED_MS, s.speedMs - SPEED_STEP_MS) })),

      decreaseSpeed: () =>
        set((s) => ({ speedMs: Math.min(MAX_SPEED_MS, s.speedMs + SPEED_STEP_MS) })),

      setSpeed: (ms) => set({ speedMs: Math.max(MIN_SPEED_MS, Math.min(MAX_SPEED_MS, ms)) }),

      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

      setTotalFrames: (n) =>
        set((s) => ({
          totalFrames: n,
          currentFrame: Math.min(s.currentFrame, n - 1),
        })),

      reset: () => set(defaultState),
    }),
    {
      name: 'animation-preferences',
      partialize: (s) => ({
        frameCount: s.frameCount,
        mode: s.mode,
        speedMs: s.speedMs,
        showGrid: s.showGrid,
      }),
    }
  )
)
