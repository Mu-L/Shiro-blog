'use client'

import { useQuery } from '@tanstack/react-query'
import {
  forwardRef,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { FC } from 'react'

import {
  useActivityPresenceByRoomName,
  useActivityPresenceBySessionId,
  useIsMobile,
  useSocketSessionId,
} from '~/atoms/hooks'
import { FloatPopover } from '~/components/ui/float-popover'
import { RootPortal } from '~/components/ui/portal'
import { EmitKeyMap } from '~/constants/keys'
import { useEventCallback } from '~/hooks/common/use-event-callback'
import { useIsClient } from '~/hooks/common/use-is-client'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { useReadPercent } from '~/hooks/shared/use-read-percent'
import { getColorScheme, stringToHue } from '~/lib/color'
import { formatSeconds } from '~/lib/datetime'
import { debounce } from '~/lib/lodash'
import { apiClient } from '~/lib/request'
import { springScrollTo } from '~/lib/scroller'
import {
  useWrappedElementPosition,
  useWrappedElementSize,
} from '~/providers/shared/WrappedElementProvider'
import { queries } from '~/queries/definition'
import { socketClient } from '~/socket'

import { useRoomContext } from './Room'

export const Presence = () => {
  const isMobile = useIsMobile()

  const isClient = useIsClient()

  return isMobile ? null : isClient ? <PresenceImpl /> : null
}

const PresenceImpl = () => {
  const { roomName } = useRoomContext()

  const { refetch } = useQuery({
    ...queries.activity.presence(roomName),

    refetchOnMount: true,
    refetchInterval: 30_000,
  })

  const identity = useSocketSessionId()

  const update = useCallback(
    debounce((position: number) => {
      apiClient.activity.updatePresence({
        identity,
        position,
        sid: socketClient.socket.id!,
        roomName,
      })
    }, 1000),
    [identity],
  )

  const percent = useReadPercent()

  const updateWithPercent = useEventCallback(() => update(percent))

  useEffect(() => {
    const handler = () => {
      refetch()
      updateWithPercent()
    }
    window.addEventListener(EmitKeyMap.SocketConnected, handler)

    return () => {
      window.removeEventListener(EmitKeyMap.SocketConnected, handler)
    }
  }, [refetch, updateWithPercent])

  useEffect(() => {
    update(percent)
  }, [percent, update])

  return <ReadPresenceTimeline />
}

const ReadPresenceTimeline = () => {
  const sessionId = useSocketSessionId()
  const activityPresence = useActivityPresenceBySessionId(sessionId)
  const { roomName } = useRoomContext()
  const activityPresenceIdsCurrentRoom = useActivityPresenceByRoomName(roomName)
  // console.log(

  //   activityPresence,
  //   'activityPresence',
  //   sessionId,
  //   useActivityPresence(),
  // )
  const position = activityPresence?.position
  if (typeof position !== 'number') return null

  return (
    <RootPortal>
      <div className="fixed bottom-0 left-0 top-[4.5rem] z-[3]">
        {activityPresenceIdsCurrentRoom.map((identity) => {
          return (
            <TimelineItem
              key={identity}
              identity={identity}
              type={identity === sessionId ? 'current' : 'other'}
            />
          )
        })}
      </div>
    </RootPortal>
  )
}

interface TimelineItemProps {
  identity: string
  type: 'current' | 'other'
}
const TimelineItem: FC<TimelineItemProps> = memo(({ type, identity }) => {
  const presence = useActivityPresenceBySessionId(identity)

  const readPercent = useReadPercent()
  const isCurrent = type === 'current'

  const position = useDeferredValue(
    isCurrent ? readPercent : presence?.position,
  )
  const isDark = useIsDark()
  const bgColor = useMemo(() => {
    if (type === 'current') return ''
    if (!presence) return ''
    return getColorScheme(stringToHue(presence.identity))[
      isDark ? 'dark' : 'light'
    ].background
  }, [isDark, presence, type])
  if (!presence && isCurrent) return null

  if (typeof position !== 'number') return null
  const readingDuration = presence
    ? formatSeconds((presence.operationTime - presence.connectedAt) / 1000)
    : ''

  return (
    <FloatPopover
      asChild
      placement="right"
      offset={30}
      strategy="fixed"
      type="tooltip"
      triggerElement={
        <MoitonBar
          bgColor={bgColor}
          isCurrent={isCurrent}
          position={position}
        />
      }
    >
      {isCurrent ? (
        <p>你在这里。</p>
      ) : (
        <p>读者 {presence?.identity.slice(0, 2).toUpperCase()} 在这里。</p>
      )}
      <p>阅读进度 {position}%</p>

      {readingDuration && <p>阅读了 {readingDuration}</p>}
    </FloatPopover>
  )
})

TimelineItem.displayName = 'TimelineItem'

const MoitonBar = forwardRef<
  HTMLButtonElement,
  {
    position: number
    bgColor: string
    isCurrent: boolean
  }
>(({ bgColor, isCurrent, position, ...rest }, ref) => {
  const elRef = useRef<HTMLButtonElement>(null)

  const [memoedPosition] = useState(position)
  useLayoutEffect(() => {
    const el = elRef.current
    if (!el) return
    el.style.top = `${memoedPosition}%`
  }, [memoedPosition])

  const animateRef = useRef<Animation | null>(null)
  useEffect(() => {
    if (isCurrent) {
      return
    }
    const el = elRef.current
    if (!el) return

    if (animateRef.current) animateRef.current.finish()
    animateRef.current = el.animate(
      [
        {
          filter: 'blur(5px)',
        },
        {
          top: `${position}%`,
          filter: 'blur(0px)',
        },
      ],
      {
        duration: 200,
        fill: 'forwards',
        easing: 'ease-in-out',
      },
    )
  }, [isCurrent, position])
  const { y } = useWrappedElementPosition()
  const { h } = useWrappedElementSize()

  useImperativeHandle(ref, () => elRef.current!)
  return (
    <button
      onClick={() => {
        // read percent calc:  Math.floor(Math.min(Math.max(0, ((scrollTop - y) / h) * 100), 100)) || 0
        // so the reversal is
        springScrollTo(y + (position / 100) * h)
      }}
      aria-label={isCurrent ? '你在这里' : `读者在这里 - ${position}%`}
      ref={elRef}
      className="absolute h-2 -translate-x-4 rounded-full bg-accent duration-200 hover:-translate-x-2 hover:opacity-50"
      style={{
        top: isCurrent ? `${position}%` : void 0,
        backgroundColor: bgColor,
        opacity: isCurrent ? 0.3 : 0.15,
        width: isCurrent ? '45px' : '30px',
      }}
      {...rest}
    />
  )
})

MoitonBar.displayName = 'MoitonBar'