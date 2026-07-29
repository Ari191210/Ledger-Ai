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

/**
 * A mechanical key click: a short noise burst through a bandpass, decaying
 * fast. Not a tone — a sine beep reads as a notification, and what a control
 * surface wants is the sound of a switch closing.
 *
 * Synthesised rather than loaded from a file: it is a few hundred bytes of
 * maths against a ~10 KB asset plus a request, and it cannot fail to load.
 */
function playClick(gain: number, centre: number) {
  try {
    const ac = getCtx()
    const length = Math.max(1, Math.floor(ac.sampleRate * 0.028))
    const buffer = ac.createBuffer(1, length, ac.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      // White noise under a steep exponential decay — the steeper the power,
      // the more it reads as a click rather than a hiss.
      samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 9)
    }

    const source = ac.createBufferSource()
    source.buffer = buffer

    const band = ac.createBiquadFilter()
    band.type = "bandpass"
    band.frequency.setValueAtTime(centre, ac.currentTime)
    band.Q.setValueAtTime(1.1, ac.currentTime)

    const env = ac.createGain()
    env.gain.setValueAtTime(gain, ac.currentTime)

    source.connect(band)
    band.connect(env)
    env.connect(ac.destination)
    source.start(ac.currentTime)
    source.stop(ac.currentTime + 0.05)
  } catch {}
}

export const sounds = {
  click() {
    play("sine", 800, 0.04, 0.08)
  },
  /** Key down — brighter and louder than the release. */
  keyDown() {
    playClick(0.085, 2100)
  },
  /** Key up — the switch returning. Quieter and duller, as on real hardware. */
  keyUp() {
    playClick(0.045, 1350)
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
