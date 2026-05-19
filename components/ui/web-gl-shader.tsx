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

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef  = useRef<{
    scene:      THREE.Scene | null
    camera:     THREE.OrthographicCamera | null
    renderer:   THREE.WebGLRenderer | null
    mesh:       THREE.Mesh | null
    uniforms:   Record<string, { value: unknown }> | null
    animationId: number | null
    target:     THREE.Vector3
    mouse:      THREE.Vector2   // lerped cursor position 0-1
    mouseTgt:   THREE.Vector2   // raw cursor target
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

    // Wave distorted by mouse: mouse.xy warps wave centre + chromatic channels
    const fragmentShader = `
      precision highp float;
      uniform vec2  resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;
      uniform vec3  colorMix;
      uniform vec2  mouse;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

        // Remap mouse from [0,1] to [-0.5,0.5] then scale influence
        float mx = (mouse.x - 0.5) * 0.5;
        float my = (mouse.y - 0.5) * 0.35;

        float d = length(p - vec2(mx, -my)) * distortion;

        float rx = (p.x - mx * 1.1) * (1.0 + d * 1.3);
        float gx = (p.x - mx);
        float bx = (p.x - mx * 0.9) * (1.0 - d);

        float r = 0.05 / abs(p.y + my + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + my * 0.85 + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + my * 1.15 + sin((bx + time) * xScale) * yScale);

        gl_FragColor = vec4(r * colorMix.r, g * colorMix.g, b * colorMix.b, 1.0);
      }
    `

    refs.scene    = new THREE.Scene()
    refs.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    refs.renderer.setClearColor(new THREE.Color(0x000000))
    refs.camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

    const initialPalette = document.documentElement.dataset.palette ?? ""
    const [mr, mg, mb]   = PALETTE_COLORS[initialPalette] ?? DEFAULT_MIX
    refs.target.set(mr, mg, mb)

    refs.uniforms = {
      resolution: { value: [window.innerWidth, window.innerHeight] },
      time:       { value: 0.0 },
      xScale:     { value: 1.0 },
      yScale:     { value: 0.5 },
      distortion: { value: 0.05 },
      colorMix:   { value: new THREE.Vector3(mr, mg, mb) },
      mouse:      { value: new THREE.Vector2(0.5, 0.5) },
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
        1.0 - e.clientY / window.innerHeight,  // flip Y for GL coords
      )
    }

    const animate = () => {
      if (refs.uniforms) {
        refs.uniforms.time.value = (refs.uniforms.time.value as number) + 0.006

        // Lerp colour
        const mix = refs.uniforms.colorMix.value as THREE.Vector3
        mix.x += (refs.target.x - mix.x) * 0.03
        mix.y += (refs.target.y - mix.y) * 0.03
        mix.z += (refs.target.z - mix.z) * 0.03

        // Lerp mouse
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
      const p = document.documentElement.dataset.palette ?? ""
      const [r, g, b] = PALETTE_COLORS[p] ?? DEFAULT_MIX
      refs.target.set(r, g, b)
      const isLight = document.documentElement.dataset.mode === "light"
      if (canvasRef.current) {
        canvasRef.current.style.opacity = isLight ? "0.22" : "1"
      }
    }
    const observer = new MutationObserver(applyTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-mode"] })
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
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 0 }}
    />
  )
}
