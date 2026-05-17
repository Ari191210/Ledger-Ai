let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === "suspended") ctx.resume()
  return ctx
}

function play(
  type: OscillatorType,
  freq: number,
  gain: number,
  duration: number,
  _fadeStart = 0.6,
) {
  try {
    const ac  = getCtx()
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(ac.destination)
    osc.type      = type
    osc.frequency.setValueAtTime(freq, ac.currentTime)
    env.gain.setValueAtTime(gain, ac.currentTime)
    env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + duration)
  } catch {}
}

export const sounds = {
  click() {
    play("sine", 800, 0.04, 0.08)
  },
  toggleOn() {
    play("sine", 520, 0.06, 0.12)
    setTimeout(() => play("sine", 760, 0.04, 0.10), 60)
  },
  toggleOff() {
    play("sine", 760, 0.05, 0.10)
    setTimeout(() => play("sine", 480, 0.03, 0.12), 60)
  },
  select() {
    play("sine", 660, 0.05, 0.10)
  },
  success() {
    play("sine", 520, 0.05, 0.12)
    setTimeout(() => play("sine", 660, 0.05, 0.12), 80)
    setTimeout(() => play("sine", 880, 0.04, 0.20), 160)
  },
  error() {
    play("sawtooth", 220, 0.04, 0.18)
  },
  aiStart() {
    play("sine", 440, 0.03, 0.15)
  },
  aiDone() {
    play("sine", 440, 0.03, 0.10)
    setTimeout(() => play("sine", 660, 0.03, 0.15), 80)
  },
}
