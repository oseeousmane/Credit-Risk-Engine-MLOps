'use client'
import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL, INTERNAL_TOKEN_KEY } from './api-client'

export type SseConnectionState = 'connecting' | 'connected' | 'disconnected'

/**
 * Subscribes to the NestJS SSE stream at GET /monitoring/events.
 * On each event, invalidates the relevant React Query cache keys so
 * the dashboard data refreshes immediately without polling delay.
 */
export function useMonitoringSSE() {
  const queryClient = useQueryClient()
  const [connectionState, setConnectionState] = React.useState<SseConnectionState>('connecting')
  const [lastEvent, setLastEvent] = React.useState<{ type: string; timestamp: string } | null>(null)

  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(INTERNAL_TOKEN_KEY) : null
    // EventSource doesn't support custom headers — pass token as query param
    const url = `${API_BASE_URL}/monitoring/events${token ? `?token=${encodeURIComponent(token)}` : ''}`

    let es: EventSource
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      setConnectionState('connecting')
      es = new EventSource(url)

      es.onopen = () => setConnectionState('connected')

      es.onerror = () => {
        setConnectionState('disconnected')
        es.close()
        // Reconnect after 5s
        reconnectTimer = setTimeout(connect, 5000)
      }

      es.onmessage = (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data) as { type: string; data: Record<string, any>; timestamp: string }
          setLastEvent({ type: payload.type, timestamp: payload.timestamp })

          // Invalidate the appropriate React Query keys per event type
          switch (payload.type) {
            case 'alert.created':
              queryClient.invalidateQueries({ queryKey: ['monitoring-alerts'] })
              break
            case 'decision.submitted':
              queryClient.invalidateQueries({ queryKey: ['monitoring-metrics'] })
              queryClient.invalidateQueries({ queryKey: ['monitoring-history'] })
              break
            case 'model.status_changed':
              queryClient.invalidateQueries({ queryKey: ['monitoring-metrics'] })
              queryClient.invalidateQueries({ queryKey: ['monitoring-degradation'] })
              queryClient.invalidateQueries({ queryKey: ['monitoring-alerts'] })
              break
            case 'scoring.completed':
              queryClient.invalidateQueries({ queryKey: ['monitoring-quality-trend'] })
              queryClient.invalidateQueries({ queryKey: ['monitoring-fallback'] })
              break
            default:
              queryClient.invalidateQueries({ queryKey: ['monitoring-metrics'] })
          }
        } catch {
          // ignore malformed SSE data
        }
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer)
      es?.close()
    }
  }, [queryClient])

  return { connectionState, lastEvent }
}
