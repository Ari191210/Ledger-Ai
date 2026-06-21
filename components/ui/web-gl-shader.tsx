"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import gsap from "gsap"

// Dark-mode bg — deep near-blacks so aurora blobs pop hard
const PALETTE_BG_DARK: Record<string, [number, number, number]> = {
  porcelain: [0.04, 0.03, 0.02],
  ink:       [0.01, 0.02, 0.05],
  dusk:      [0.02, 0.01, 0.05],
  moss:      [0.01, 0.04, 0.02],
  rose:      [0.05, 0.02, 0.03],
  storm:     [0.02, 0.03, 0.05],
  ember:     [0.05, 0.02, 0.00],
  sand:      [0.04, 0.03, 0.02],
}
const DEFAULT_BG_DARK: [number, number, number] = [0.02, 0.02, 0.02]

// Light-mode bg — mid-tones so blobs remain visible
const PALETTE_BG_LIGHT: Record<string, [number, number, number]> = {
  porcelain: [0.76, 0.68, 0.52],
  ink:       [0.48, 0.62, 0.76],
  dusk:      [0.64, 0.54, 0.76],
  moss:      [0.48, 0.72, 0.52],
  rose:      [0.76, 0.56, 0.64],
  storm:     [0.54, 0.60, 0.74],
  ember:     [0.76, 0.60, 0.40],
  sand:      [0.72, 0.64, 0.48],
}
const DEFAULT_BG_LIGHT: [number, number, number] = [0.65, 0.60, 0.55]

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef  = useRef<{
    scene:       THREE.Scene | null
    camera:      THREE.OrthographicCamera | null
    renderer:    THREE.WebGLRenderer | null
    mesh:        THREE.Mesh | null
    uniforms:    Record<string, { value: unknown }> | null
    animationId: number | null
    mouse:       THREE.Vector2
    mouseTgt:    THREE.Vector2
  }>({
    scene: null, camera: null, renderer: null, mesh: null,
    uniforms: null, animationId: null,
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
      precision mediump float;
      uniform vec2  resolution;
      uniform float time;
      uniform vec2  mouse;
      uniform vec3  bgColor;
      uniform float brightness;

      float gauss(vec2 p, vec2 c, float r) {
        vec2 d = p - c;
        return exp(-dot(d, d) / (r * r));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        float ar = resolution.x / resolution.y;
        vec2 p  = vec2((uv.x - 0.5) * ar, uv.y - 0.5);
        vec2 m  = vec2((mouse.x - 0.5) * ar * 0.18, (mouse.y - 0.5) * 0.18);
        float t = time * 0.14;

        /* Five blobs — coherent warm-to-cool aurora palette */
        vec2 c0 = vec2(sin(t * 0.71) * 0.68 + m.x * 0.28,  cos(t * 0.53) * 0.40 + m.y * 0.28);
        vec2 c1 = vec2(cos(t * 0.47 + 1.3) * 0.74 - m.x * 0.18, sin(t * 0.61 + 2.1) * 0.46 - m.y * 0.18);
        vec2 c2 = vec2(sin(t * 0.53 + 2.7) * 0.56 + m.x * 0.12, cos(t * 0.79 + 0.9) * 0.54 + m.y * 0.12);
        vec2 c3 = vec2(cos(t * 0.31 + 3.2) * 0.68 - m.x * 0.08, sin(t * 0.43 + 1.5) * 0.38 - m.y * 0.08);
        vec2 c4 = vec2(sin(t * 0.67 + 1.1) * 0.44 + m.x * 0.14, cos(t * 0.37 + 2.3) * 0.60 + m.y * 0.14);

        float g0 = gauss(p, c0, 0.56);
        float g1 = gauss(p, c1, 0.48);
        float g2 = gauss(p, c2, 0.62);
        float g3 = gauss(p, c3, 0.44);
        float g4 = gauss(p, c4, 0.38);

        /* Cinnabar red → deep violet → electric blue → magenta → warm ember */
        vec3 col =
          vec3(0.90, 0.17, 0.08) * g0 +
          vec3(0.42, 0.04, 0.78) * g1 +
          vec3(0.04, 0.32, 0.88) * g2 +
          vec3(0.68, 0.04, 0.38) * g3 +
          vec3(0.82, 0.26, 0.04) * g4;

        float total = g0 + g1 + g2 + g3 + g4;
        if (total > 1.0) col /= total;

        /* Cinematic tone curve — lift shadows, compress highlights */
        col = pow(col, vec3(0.80));
        col *= 0.52;

        float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.0;
        col *= clamp(vig, 0.0, 1.0);

        col *= brightness;
        vec3 final = bgColor + col;
        gl_FragColor = vec4(clamp(final, 0.0, 1.0), 1.0);
      }
    `

    refs.scene    = new THREE.Scene()
    refs.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    refs.camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

    const initialPalette = document.documentElement.dataset.palette ?? ""
    const isLightInit    = document.documentElement.dataset.mode === "light"
    const [ibr, ibg, ibb] = isLightInit
      ? (PALETTE_BG_LIGHT[initialPalette] ?? DEFAULT_BG_LIGHT)
      : (PALETTE_BG_DARK[initialPalette]  ?? DEFAULT_BG_DARK)

    refs.renderer.setClearColor(new THREE.Color(ibr, ibg, ibb))

    refs.uniforms = {
      resolution: { value: [window.innerWidth, window.innerHeight] },
      time:       { value: 0.0 },
      mouse:      { value: new THREE.Vector2(0.5, 0.5) },
      bgColor:    { value: new THREE.Vector3(ibr, ibg, ibb) },
      brightness: { value: 1.0 },
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
        refs.uniforms.time.value = (refs.uniforms.time.value as number) + 0.016

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
      const isLight = document.documentElement.dataset.mode === "light"
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

    const handleAIComplete = () => {
      if (!refs.uniforms) return
      const u = refs.uniforms.brightness
      gsap.fromTo(
        u,
        { value: 1.0 },
        { value: 1.8, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" },
      )
    }

    handleResize()
    animate()
    window.addEventListener("resize",      handleResize,    { passive: true })
    window.addEventListener("mousemove",   handleMouse,     { passive: true })
    window.addEventListener("ai-complete", handleAIComplete)

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      observer.disconnect()
      window.removeEventListener("resize",      handleResize)
      window.removeEventListener("mousemove",   handleMouse)
      window.removeEventListener("ai-complete", handleAIComplete)
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
        opacity: 1.0,
      }}
    />
  )
}
