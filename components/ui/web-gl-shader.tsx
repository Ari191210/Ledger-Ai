"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

// Dark-mode bg — palette near-blacks
const PALETTE_BG_DARK: Record<string, [number, number, number]> = {
  porcelain: [0.055, 0.047, 0.031],
  ink:       [0.020, 0.039, 0.063],
  dusk:      [0.031, 0.020, 0.063],
  moss:      [0.020, 0.055, 0.024],
  rose:      [0.063, 0.024, 0.035],
  storm:     [0.031, 0.039, 0.055],
  ember:     [0.055, 0.031, 0.000],
  sand:      [0.047, 0.039, 0.024],
}
const DEFAULT_BG_DARK: [number, number, number] = [0.031, 0.031, 0.031]

// Light-mode bg — mid-tones so waves have contrast room
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
      precision highp float;
      uniform vec2  resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform vec2  mouse;
      uniform float distortion;
      uniform vec3  bgColor;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

        float mx = (mouse.x - 0.5) * 0.8;
        float my = (mouse.y - 0.5) * 0.6;

        float t = time;

        float w1 = 0.06 / abs(p.y + my        + sin((p.x - mx * 1.1 + t * 1.0       ) * xScale * 1.0) * yScale);
        float w2 = 0.05 / abs(p.y + my * 0.7  + sin((p.x - mx * 0.9 + t * 0.8 + 1.2) * xScale * 1.3) * yScale * 0.9);
        float w3 = 0.07 / abs(p.y + my * 1.2  + sin((p.x - mx       + t * 1.2 + 2.4) * xScale * 0.7) * yScale * 1.1);
        float w4 = 0.04 / abs(p.y + my * 0.5  + sin((p.x - mx * 1.2 + t * 0.6 + 3.6) * xScale * 1.6) * yScale * 0.7);
        float w5 = 0.05 / abs(p.y + my * 1.4  + sin((p.x - mx * 0.8 + t * 1.4 + 0.8) * xScale * 0.9) * yScale * 0.8);

        vec3 c1 = vec3(1.00, 0.30, 0.15) * w1;
        vec3 c2 = vec3(1.00, 0.72, 0.08) * w2;
        vec3 c3 = vec3(0.58, 0.12, 1.00) * w3;
        vec3 c4 = vec3(0.08, 0.88, 0.62) * w4;
        vec3 c5 = vec3(1.00, 0.18, 0.62) * w5;

        vec3 wave = c1 + c2 + c3 + c4 + c5;
        gl_FragColor = vec4(wave + bgColor, 1.0);
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
      xScale:     { value: 1.2 },
      yScale:     { value: 0.8 },
      distortion: { value: 0.12 },
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
        refs.uniforms.time.value = (refs.uniforms.time.value as number) + 0.012

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
        opacity: 1.0,
      }}
    />
  )
}
