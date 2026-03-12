'use client'
// ============================================================
// src/hooks/useAnimationPlayer.ts — Controls for image loop
// ============================================================
import { useEffect, useRef, useCallback } from 'react'
import { useAnimationStore } from '@/stores/animationStore'
import type { AnimationFrame } from '@/types/animation'

interface UseAnimationPlayerOptions {
  frames: AnimationFrame[]
  onFrameChange?: (frame: number) => void
}

export function useAnimationPlayer({ frames, onFrameChange }: UseAnimationPlayerOptions) {
  const store = useAnimationStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const directionRef = useRef<1 | -1>(1)

  // Sync total frames when frames array changes
  useEffect(() => {
    store.setTotalFrames(frames.length)
  }, [frames.length])

  // Notify parent on frame change
  useEffect(() => {
    onFrameChange?.(store.currentFrame)
  }, [store.currentFrame])

  // Animation tick
  const tick = useCallback(() => {
    const { currentFrame, totalFrames, mode } = useAnimationStore.getState()

    if (totalFrames === 0) return
    if (mode === 'rock') {
      let next = currentFrame + directionRef.current
      if (next >= totalFrames) {
        directionRef.current = -1
        next = totalFrames - 2
      } else if (next < 0) {
        directionRef.current = 1
        next = 1
      }
      useAnimationStore.getState().setFrame(next)
    } else {
      // loop mode
      const next = (currentFrame + 1) % totalFrames
      useAnimationStore.getState().setFrame(next)
    }
  }, [])

  // Start/stop interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (store.isPlaying && frames.length > 0) {
      intervalRef.current = setInterval(tick, store.speedMs)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [store.isPlaying, store.speedMs, frames.length, tick])

  const currentFrame = frames[store.currentFrame] ?? null

  return {
    currentFrame,
    currentIndex: store.currentFrame,
    totalFrames: store.totalFrames,
    isPlaying: store.isPlaying,
    speedMs: store.speedMs,
    mode: store.mode,
    frameCount: store.frameCount,
    showGrid: store.showGrid,
    // Controls
    play: store.play,
    pause: store.pause,
    toggle: store.toggle,
    goToFrame: store.setFrame,
    nextFrame: store.nextFrame,
    prevFrame: store.prevFrame,
    setFrameCount: store.setFrameCount,
    setMode: store.setMode,
    increaseSpeed: store.increaseSpeed,
    decreaseSpeed: store.decreaseSpeed,
    toggleGrid: store.toggleGrid,
  }
}
