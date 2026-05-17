'use client'

import { Suspense, lazy } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ color: 'var(--ink-3)' }}
        >
          <span
            style={{
              display: 'block',
              width: 28,
              height: 28,
              border: '2px solid var(--rule)',
              borderTopColor: 'var(--ink-2)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}
