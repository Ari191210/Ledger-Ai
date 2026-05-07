"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

const PALETTE_COLORS: Record<string, [number, number, number]> = {
  porcelain: [1.0, 0.65, 0.10],
  ink:       [0.05, 0.80, 1.00],
  dusk:      [0.80, 0.10, 1.00],
  moss:      [0.15, 1.00, 0.20],
}
const DEFAULT_MIX: [number, number, number] = [1.0, 0.90, 0.80]

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    uniforms: Record<string, { value: unknown }> | null
    animationId: number | null
    target: THREE.Vector3
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
    target: new THREE.Vector3(...DEFAULT_MIX),
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;
      uniform vec3 colorMix;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        float d = length(p) * distortion;

        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

        gl_FragColor = vec4(r * colorMix.r, g * colorMix.g, b * colorMix.b, 1.0);
      }
    `

    refs.scene = new THREE.Scene()
    refs.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    refs.renderer.setPixelRatio(window.devicePixelRatio)
    refs.renderer.setClearColor(new THREE.Color(0x000000))

    refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

    const initialPalette = document.documentElement.dataset.palette ?? ""
    const [mr, mg, mb] = PALETTE_COLORS[initialPalette] ?? DEFAULT_MIX
    refs.target.set(mr, mg, mb)

    refs.uniforms = {
      resolution: { value: [window.innerWidth, window.innerHeight] },
      time:       { value: 0.0 },
      xScale:     { value: 1.0 },
      yScale:     { value: 0.5 },
      distortion: { value: 0.05 },
      colorMix:   { value: new THREE.Vector3(mr, mg, mb) },
    }

    const positions = new THREE.BufferAttribute(
      new Float32Array([-1,-1,0, 1,-1,0, -1,1,0, 1,-1,0, -1,1,0, 1,1,0]),
      3
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

    const animate = () => {
      if (refs.uniforms) {
        refs.uniforms.time.value = (refs.uniforms.time.value as number) + 0.008
        const mix = refs.uniforms.colorMix.value as THREE.Vector3
        mix.x += (refs.target.x - mix.x) * 0.04
        mix.y += (refs.target.y - mix.y) * 0.04
        mix.z += (refs.target.z - mix.z) * 0.04
      }
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera)
      }
      refs.animationId = requestAnimationFrame(animate)
    }

    const observer = new MutationObserver(() => {
      const p = document.documentElement.dataset.palette ?? ""
      const [r, g, b] = PALETTE_COLORS[p] ?? DEFAULT_MIX
      refs.target.set(r, g, b)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] })

    handleResize()
    animate()
    window.addEventListener("resize", handleResize)

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      observer.disconnect()
      window.removeEventListener("resize", handleResize)
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
