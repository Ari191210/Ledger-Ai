"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

const PALETTE_COLORS: Record<string, [number, number, number]> = {
  porcelain: [1.0,  0.65, 0.10],
  ink:       [0.05, 0.80, 1.00],
  dusk:      [0.80, 0.10, 1.00],
  moss:      [0.15, 1.00, 0.20],
  rose:      [1.0,  0.10, 0.50],
  storm:     [0.30, 0.55, 0.90],
  ember:     [1.0,  0.42, 0.05],
  sand:      [0.85, 0.65, 0.20],
}
const DEFAULT_MIX: [number, number, number] = [1.0, 0.90, 0.80]

// Dark-mode bg — palette near-blacks from lib/palette PALETTE_META.paper
const PALETTE_BG_DARK: Record<string, [number, number, number]> = {
  porcelain: [0.055, 0.047, 0.031],  // #0e0c08 — warm near-black
  ink:       [0.020, 0.039, 0.063],  // #050a10 — blue near-black
  dusk:      [0.031, 0.020, 0.063],  // #080510 — purple near-black
  moss:      [0.020, 0.055, 0.024],  // #050e06 — green near-black
  rose:      [0.063, 0.024, 0.035],  // #100609 — pink near-black
  storm:     [0.031, 0.039, 0.055],  // #080a0e — steel near-black
  ember:     [0.055, 0.031, 0.000],  // #0e0800 — amber near-black
  sand:      [0.047, 0.039, 0.024],  // #0c0a06 — sand near-black
}
const DEFAULT_BG_DARK: [number, number, number] = [0.031, 0.031, 0.031]  // #080808

// Light-mode bg — matches CSS [data-mode="light"][data-palette="X"] --paper
const PALETTE_BG_LIGHT: Record<string, [number, number, number]> = {
  porcelain: [0.980, 0.965, 0.933],  // #faf6ee — warm parchment
  ink:       [0.933, 0.957, 0.980],  // #eef4fa — cool blue-white
  dusk:      [0.957, 0.941, 0.980],  // #f4f0fa — pale lavender
  moss:      [0.933, 0.961, 0.933],  // #eef5ee — pale green
  rose:      [0.980, 0.941, 0.957],  // #faf0f4 — blush
  storm:     [0.933, 0.941, 0.961],  // #eef0f5 — cool grey
  ember:     [0.980, 0.957, 0.925],  // #faf4ec — warm cream
  sand:      [0.973, 0.957, 0.925],  // #f8f4ec — pale sand
}
const DEFAULT_BG_LIGHT: [number, number, number] = [0.867, 0.835, 0.784]  // #ddd5c8

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef  = useRef<{
    scene:       THREE.Scene | null
    camera:      THREE.OrthographicCamera | null
    renderer:    THREE.WebGLRenderer | null
    mesh:        THREE.Mesh | null
    uniforms:    Record<string, { value: unknown }> | null
    animationId: number | null
    target:      THREE.Vector3
    mouse:       THREE.Vector2
    mouseTgt:    THREE.Vector2
  }>({
    scene: null, camera: null, renderer: null, mesh: null,
    uniforms: null, animationId: null,
    target:   new THREE.Vector3(...DEFAULT_MIX),
    mouse:    new THREE.Vector2(0.5, 0.5),
    mouseTgt: new THREE.Vector2(0.5, 0.5),
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    const vertexShader = `
      attribute vec3 position;
      void main() { gl_Position = vec4(position, 1.0); }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2  resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;
      uniform vec3  colorMix;
      uniform vec2  mouse;
      uniform vec3  bgColor;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

        float mx = (mouse.x - 0.5) * 0.5;
        float my = (mouse.y - 0.5) * 0.35;

        float d = length(p - vec2(mx, -my)) * distortion;

        float rx = (p.x - mx * 1.1) * (1.0 + d * 1.3);
        float gx = (p.x - mx);
        float bx = (p.x - mx * 0.9) * (1.0 - d);

        float r = 0.05 / abs(p.y + my        + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + my * 0.85 + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + my * 1.15 + sin((bx + time) * xScale) * yScale);

        // Identical wave formula in both light and dark mode.
        // bgColor is near-black in dark mode, palette paper in light mode.
        // Between waves (r+g+b small): bgColor shows through.
        // At wave centres (r+g+b large): wave colour dominates.
        // mask*0.2 — background stays 98-99% bright between waves (no visible tint),
        // drops only near wave centres so the coloured glow is readable.
        vec3  wave = vec3(r * colorMix.r, g * colorMix.g, b * colorMix.b);
        float mask = clamp(r + g + b, 0.0, 1.0);
        gl_FragColor = vec4(wave + bgColor * (1.0 - mask * 0.2), 1.0);
      }
    `

    refs.scene    = new THREE.Scene()
    refs.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    refs.camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

    const initialPalette = document.documentElement.dataset.palette ?? ""
    const [mr, mg, mb]   = PALETTE_COLORS[initialPalette] ?? DEFAULT_MIX
    refs.target.set(mr, mg, mb)

    const isLightInit = document.documentElement.dataset.mode === "light"
    const [ibr, ibg, ibb] = isLightInit
      ? (PALETTE_BG_LIGHT[initialPalette] ?? DEFAULT_BG_LIGHT)
      : (PALETTE_BG_DARK[initialPalette]  ?? DEFAULT_BG_DARK)

    refs.renderer.setClearColor(new THREE.Color(ibr, ibg, ibb))

    refs.uniforms = {
      resolution: { value: [window.innerWidth, window.innerHeight] },
      time:       { value: 0.0 },
      xScale:     { value: 1.0 },
      yScale:     { value: 0.5 },
      distortion: { value: 0.05 },
      colorMix:   { value: new THREE.Vector3(mr, mg, mb) },
      mouse:      { value: new THREE.Vector2(0.5, 0.5) },
      bgColor:    { value: new THREE.Vector3(ibr, ibg, ibb) },
    }

    const positions = new THREE.BufferAttribute(
      new Float32Array([-1,-1,0, 1,-1,0, -1,1,0, 1,-1,0, -1,1,0, 1,1,0]), 3
    )
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", positions)

    const material = new THREE.RawShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: refs.uniforms,
      side: THREE.DoubleSide,
    })

    refs.mesh = new THREE.Mesh(geometry, material)
    refs.scene.add(refs.mesh)

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return
      refs.renderer.setSize(window.innerWidth, window.innerHeight, false)
      ;(refs.uniforms.resolution.value as number[]) = [window.innerWidth, window.innerHeight]
    }

    const handleMouse = (e: MouseEvent) => {
      refs.mouseTgt.set(
        e.clientX / window.innerWidth,
        1.0 - e.clientY / window.innerHeight,
      )
    }

    const animate = () => {
      if (refs.uniforms) {
        refs.uniforms.time.value = (refs.uniforms.time.value as number) + 0.006

        const mix = refs.uniforms.colorMix.value as THREE.Vector3
        mix.x += (refs.target.x - mix.x) * 0.03
        mix.y += (refs.target.y - mix.y) * 0.03
        mix.z += (refs.target.z - mix.z) * 0.03

        const m = refs.uniforms.mouse.value as THREE.Vector2
        m.x += (refs.mouseTgt.x - m.x) * 0.05
        m.y += (refs.mouseTgt.y - m.y) * 0.05
        refs.mouse.copy(m)
      }
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera)
      }
      refs.animationId = requestAnimationFrame(animate)
    }

    const applyTheme = () => {
      const p       = document.documentElement.dataset.palette ?? ""
      const [r, g, b] = PALETTE_COLORS[p] ?? DEFAULT_MIX
      refs.target.set(r, g, b)

      const isLight   = document.documentElement.dataset.mode === "light"
      const [br, bgR, bb] = isLight
        ? (PALETTE_BG_LIGHT[p] ?? DEFAULT_BG_LIGHT)
        : (PALETTE_BG_DARK[p]  ?? DEFAULT_BG_DARK)

      if (refs.uniforms) {
        (refs.uniforms.bgColor.value as THREE.Vector3).set(br, bgR, bb)
      }
      refs.renderer?.setClearColor(new THREE.Color(br, bgR, bb))
    }

    const observer = new MutationObserver(applyTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-palette", "data-mode"],
    })
    applyTheme()

    handleResize()
    animate()
    window.addEventListener("resize",    handleResize, { passive: true })
    window.addEventListener("mousemove", handleMouse,  { passive: true })

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      observer.disconnect()
      window.removeEventListener("resize",    handleResize)
      window.removeEventListener("mousemove", handleMouse)
      if (refs.mesh) {
        refs.scene?.remove(refs.mesh)
        refs.mesh.geometry.dispose()
        if (refs.mesh.material instanceof THREE.Material) refs.mesh.material.dispose()
      }
      refs.renderer?.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0,
      }}
    />
  )
}
