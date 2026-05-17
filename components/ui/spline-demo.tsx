'use client'

import { SplineScene } from '@/components/ui/spline-scene'
import { Card } from '@/components/ui/card'
import { Spotlight } from '@/components/ui/spotlight'

export function SplineSceneBasic() {
  return (
    <Card className="w-full h-[500px] relative overflow-hidden">
      <Spotlight size={300} />

      <div className="flex h-full relative z-10">
        {/* Left — text */}
        <div className="flex-1 p-8 flex flex-col justify-center">
          <h1
            className="text-4xl md:text-5xl font-bold"
            style={{ fontFamily: 'var(--serif)', color: 'var(--ink)' }}
          >
            Interactive 3D
          </h1>
          <p className="mt-4 max-w-lg text-base" style={{ color: 'var(--ink-2)' }}>
            Bring your UI to life with beautiful 3D scenes. Create immersive experiences
            that capture attention and enhance your design.
          </p>
        </div>

        {/* Right — Spline */}
        <div className="flex-1 relative">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div>
      </div>
    </Card>
  )
}
