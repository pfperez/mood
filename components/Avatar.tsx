'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type MouthState = 'closed' | 'small' | 'medium' | 'wide'

const MOUTH_STATES: MouthState[] = ['closed', 'small', 'medium', 'wide']


interface AvatarProps {
  isPlaying: boolean
}

const LIP_CYCLE: MouthState[] = [
  'closed', 'small', 'medium', 'wide', 'medium', 'small',
  'closed', 'small', 'medium', 'wide', 'medium', 'small',
]

export default function Avatar({ isPlaying }: AvatarProps) {
  const [mouthState, setMouthState] = useState<MouthState>('closed')

  useEffect(() => {
    console.log('[Avatar] isPlaying:', isPlaying)

    if (!isPlaying) {
      setMouthState('closed')
      return
    }

    let idx = 0
    let timerId: ReturnType<typeof setTimeout>

    const step = () => {
      const next = LIP_CYCLE[idx % LIP_CYCLE.length]
      console.log('[Avatar] simulated mouth:', next)
      setMouthState(next)
      idx++
      timerId = setTimeout(step, 120 + Math.random() * 60)
    }
    timerId = setTimeout(step, 120 + Math.random() * 60)

    return () => {
      clearTimeout(timerId)
      setMouthState('closed')
    }
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
