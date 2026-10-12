/**
 * AlarmSound — synthesises an urgent alarm tone using the Web Audio API.
 *
 * No external audio files required. Runs entirely in the browser.
 * The alarm is a repeating two-tone beep pattern (high-low-high-low)
 * designed to be loud and attention-grabbing without being a medical device sound.
 *
 * Usage:
 *   AlarmSound.playUrgent()   — plays the alarm (for urgent vital-sign events)
 *   AlarmSound.stop()         — stops any playing alarm
 *   AlarmSound.isPlaying()    — whether the alarm is currently active
 *
 * The alarm auto-stops after MAX_DURATION_MS to prevent it running indefinitely.
 * The caregiver can also stop it explicitly.
 *
 * Browser note: Web Audio requires a user gesture before sound can play.
 * The alarm will only work after the user has interacted with the page
 * (e.g. clicked Start). This is a browser security requirement.
 */

const HIGH_FREQ_HZ = 880   // A5 — high tone
const LOW_FREQ_HZ  = 660   // E5 — low tone
const BEEP_MS      = 200   // each beep duration
const GAP_MS       = 100   // gap between beeps
const PAIR_GAP_MS  = 400   // gap between hi-lo pairs
const VOLUME       = 0.85  // 0–1; kept below 1 to avoid clipping
const MAX_DURATION_MS = 30_000 // auto-stop after 30 seconds

let _ctx: AudioContext | null = null
let _stopTimer: ReturnType<typeof setTimeout> | null = null
let _playing = false
let _beepInterval: ReturnType<typeof setInterval> | null = null

function getContext(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext()
  }
  return _ctx
}

function playTone(ctx: AudioContext, freqHz: number, startTime: number, durationS: number): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(freqHz, startTime)

  // Sharp attack, short release to make a clean beep
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(VOLUME, startTime + 0.01)
  gainNode.gain.setValueAtTime(VOLUME, startTime + durationS - 0.02)
  gainNode.gain.linearRampToValueAtTime(0, startTime + durationS)

  oscillator.start(startTime)
  oscillator.stop(startTime + durationS)
}

function scheduleOnePair(ctx: AudioContext): void {
  const now = ctx.currentTime
  const beatS = BEEP_MS / 1000
  const gapS  = GAP_MS  / 1000

  playTone(ctx, HIGH_FREQ_HZ, now,            beatS)
  playTone(ctx, LOW_FREQ_HZ,  now + beatS + gapS, beatS)
}

export const AlarmSound = {
  /**
   * Play a repeating urgent alarm tone.
   * Safe to call multiple times — ignored if already playing.
   */
  playUrgent(): void {
    if (_playing) return

    let ctx: AudioContext
    try {
      ctx = getContext()
      // Resume suspended context (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { /* silently fail if user hasn't interacted yet */ })
      }
    } catch {
      return // AudioContext not available (test environment etc.)
    }

    _playing = true
    const pairPeriodMs = (BEEP_MS * 2) + GAP_MS + PAIR_GAP_MS

    scheduleOnePair(ctx)
    _beepInterval = setInterval(() => {
      if (!_playing) return
      scheduleOnePair(ctx)
    }, pairPeriodMs)

    // Auto-stop safety
    _stopTimer = setTimeout(() => AlarmSound.stop(), MAX_DURATION_MS)
  },

  /** Stop any playing alarm immediately. */
  stop(): void {
    _playing = false
    if (_beepInterval !== null) {
      clearInterval(_beepInterval)
      _beepInterval = null
    }
    if (_stopTimer !== null) {
      clearTimeout(_stopTimer)
      _stopTimer = null
    }
  },

  isPlaying(): boolean {
    return _playing
  },
}
