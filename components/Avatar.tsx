'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type MouthState = 'closed' | 'small' | 'medium' | 'wide'

const MOUTH_STATES: MouthState[] = ['closed', 'small', 'medium', 'wide']

function amplitudeToMouth(amp: number): MouthState {
  if (amp < 0.15) return 'closed'
  if (amp < 0.4)  return 'small'
  if (amp < 0.72) return 'medium'
  return 'wide'
}

interface AvatarProps {
  isPlaying: boolean
}

export default function Avatar({ isPlaying }: AvatarProps) {
  const [mouthState, setMouthState] = useState<MouthState>('closed')
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!isPlaying) {
      setMouthState('closed')
      cancelAnimationFrame(rafRef.current)
      return
    }

    // Drive mouth animation with a sine wave — the Web Speech API doesn't expose
    // an audio stream, so we simulate natural-looking movement with smooth oscillation
    let t = 0
    const tick = () => {
      t += 0.1
      const amp = (Math.sin(t) + 1) / 2  // oscillates 0→1→0 smoothly
      setMouthState(amplitudeToMouth(amp))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying])

  return (
    <div className="flex items-center justify-center">
      {/*
        All 4 images rendered and preloaded at once, stacked via absolute positioning.
        Only the active frame is visible — CSS opacity swap, no network fetch, no flicker.
      */}
      <div className="relative w-[200px] h-[200px] md:w-[300px] md:h-[300px]">
        {MOUTH_STATES.map((state) => (
          <Image
            key={state}
            src={`/avatar/mouth-${state}.png`}
            alt={state === 'closed' ? 'Mood companion' : ''}
            fill
            priority
            className={`object-contain transition-none ${
              mouthState === state ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
