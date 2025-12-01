import type { UniqueIdentifier } from '@dnd-kit/core'
import {
  DndContext,
  type DragEndEvent,
  DragOverlay as DragOverlayBase,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext as SortableContextBase, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { addDays, differenceInCalendarDays, format, isAfter, isBefore, isValid } from 'date-fns'
import { ChevronLeft, Plus } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// dnd-kit JSX typing workaround for React 19
const SortableCtx = SortableContextBase as unknown as React.FC<any>
const DragOL = DragOverlayBase as unknown as React.FC<any>

export interface TimelineTask {
  id: UniqueIdentifier
  title: string
  start: Date | null
  end: Date | null
  baseIndex: number
}

export interface TimelineViewport {
  start: Date
  end: Date
  pxPerDay?: number
}

export interface TimelineBoardProps {
  tasks: TimelineTask[]
  setTasks: React.Dispatch<React.SetStateAction<TimelineTask[]>>
  viewport: TimelineViewport
  onExtendViewport?: (direction: 'left' | 'right', days: number) => void
  onOrderChanged?: (orderedIds: string[], movedId?: string) => void
  onRowDoubleClick?: (taskId: string) => void
}

function clampDate(d: Date, start: Date, end: Date) {
  if (isBefore(d, start)) return start
  if (isAfter(d, end)) return end
  return d
}

function Row({ task, onDoubleClick }: { task: TimelineTask; onDoubleClick?: () => void }) {
  const sortable = useSortable({ id: task.id, data: { type: 'Row', task }, attributes: { roleDescription: 'Row' } })
  const transform = CSS.Transform.toString(sortable.transform)
  const style = { transform, transition: sortable.transition }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDoubleClick?.()
  }

  return (
    <div ref={sortable.setNodeRef} style={style as any} {...sortable.attributes} className="relative h-10">
      <div
        {...sortable.listeners}
        onDoubleClick={handleDoubleClick}
        className="absolute inset-0 flex items-center px-2 cursor-pointer"
      >
        <span className="text-sm text-gray-800 truncate">{task.title || 'Untitled'}</span>
      </div>
    </div>
  )
}

function BarsLayer({
  tasks,
  viewport,
  onBarDoubleClick,
}: {
  tasks: TimelineTask[]
  viewport: TimelineViewport
  onBarDoubleClick?: (taskId: string, barLeftPx: number) => void
}) {
  const days = Math.max(1, differenceInCalendarDays(viewport.end, viewport.start) + 1)
  const pxPerDay = viewport.pxPerDay ?? 16
  const totalPx = days * pxPerDay

  // Today marker position (clamped within viewport)
  const today = new Date()
  const clampedToday = clampDate(today, viewport.start, viewport.end)
  const isTodayInOuter =
    isValid(clampedToday as Date) && !(isBefore(today, viewport.start) || isAfter(today, viewport.end))
  const todayIndex = Math.max(0, Math.min(days - 1, differenceInCalendarDays(clampedToday, viewport.start)))
  const todayX = todayIndex * pxPerDay + Math.floor(pxPerDay / 2)

  return (
    <div className="relative" style={{ width: totalPx, height: '100%' }}>
      {/* vertical day grid - full width, no windowing */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full grid" style={{ gridTemplateColumns: `repeat(${days}, ${pxPerDay}px)` }}>
          {Array.from({ length: days }).map((_, i) => {
            const currentDate = addDays(viewport.start, i)
            const isWeekStart = currentDate.getDay() === 0 // Sunday
            return (
              <div key={i} className={isWeekStart ? 'border-l border-gray-300' : 'border-l border-gray-100'} />
            )
          })}
        </div>
      </div>

      {/* today marker */}
      {isTodayInOuter && (
        <div className="absolute top-0 bottom-0 w-px bg-blue-600" style={{ left: todayX, zIndex: 0 }} />
      )}

      {/* bars */}
      <div>
        {tasks.map((t, rowIndex) => {
          const start = t.start && isValid(t.start) ? clampDate(t.start, viewport.start, viewport.end) : null
          const end = t.end && isValid(t.end) ? clampDate(t.end, viewport.start, viewport.end) : null
          if (!start || !end) return null
          const startOffset = Math.max(0, differenceInCalendarDays(start, viewport.start)) * pxPerDay
          const daySpan = differenceInCalendarDays(end, start)
          const isSingleDay = daySpan === 0
          const width = Math.max(1, daySpan + 1) * pxPerDay

          // For single-day events, show as a point-in-time marker with diamond
          if (isSingleDay) {
            return (
              <div key={String(t.id)} className="absolute" style={{ top: rowIndex * 40 + 6, left: startOffset }}>
                <div
                  className="max-w-96 pl-0.5 pr-1.5 py-0.5 bg-white rounded-md shadow-sm border border-gray-200 inline-flex justify-start items-center gap-1.5 overflow-hidden cursor-pointer"
                  onDoubleClick={() => onBarDoubleClick?.(String(t.id), startOffset)}
                >
                  <div className="flex-1 pl-0.5 pr-1 py-0.5 rounded-md flex justify-start items-center gap-1.5">
                    <div className="flex justify-start items-center gap-1">
                      {/* Diamond marker to indicate point in time */}
                      <div className="w-2 h-2 bg-gray-600 rotate-45 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-700">{format(start, 'MMM d')}</span>
                      <span className="w-px h-3 bg-gray-300" />
                      <div className="justify-start text-gray-800 text-sm leading-tight">
                        {t.title || 'Untitled'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={String(t.id)} className="absolute" style={{ top: rowIndex * 40 + 6, left: startOffset, width }}>
              <div
                className="w-full pl-0.5 pr-1.5 py-0.5 bg-white rounded-md shadow-sm border border-gray-200 flex justify-start items-center gap-1.5 overflow-hidden cursor-pointer"
                onDoubleClick={() => onBarDoubleClick?.(String(t.id), startOffset)}
              >
                <div className="flex-1 pl-0.5 pr-1 py-0.5 rounded-md flex justify-start items-center gap-1.5 min-w-0">
                  <div className="text-gray-800 text-sm leading-tight truncate">{t.title || ''}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TimelineHeader = React.forwardRef<
  HTMLDivElement,
  {
    viewport: TimelineViewport
    scrollLeft?: number
  }
>(({ viewport, scrollLeft = 0 }, ref) => {
  const pxPerDay = viewport.pxPerDay ?? 16
  const daysTotal = Math.max(1, differenceInCalendarDays(viewport.end, viewport.start) + 1)
  const totalPx = daysTotal * pxPerDay

  // Months across full viewport
  const months: Array<{ label: string; span: number }> = []
  let cursor = viewport.start
  while (!isAfter(cursor, viewport.end)) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const to = isAfter(monthEnd, viewport.end) ? viewport.end : monthEnd
    const span = Math.max(1, differenceInCalendarDays(to, cursor) + 1)
    months.push({ label: format(cursor, 'LLLL yyyy'), span })
    cursor = addDays(to, 1)
  }

  // Today marker position
  const today = new Date()
  const clampedToday = clampDate(today, viewport.start, viewport.end)
  const isTodayInOuter =
    isValid(clampedToday as Date) && !(isBefore(today, viewport.start) || isAfter(today, viewport.end))
  const todayIndex = Math.max(0, Math.min(daysTotal - 1, differenceInCalendarDays(clampedToday, viewport.start)))
  const todayX = todayIndex * pxPerDay + Math.floor(pxPerDay / 2)

  return (
    <div ref={ref} className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="h-7 flex items-center text-xs text-gray-700">
        <div className="w-64 shrink-0 px-2 flex items-center justify-between">
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Plus size={16} className="text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="relative overflow-hidden pr-6">
            <div style={{ transform: `translateX(-${scrollLeft}px)` }}>
              <div
                className="grid"
                style={{ gridTemplateColumns: months.map((m) => `${m.span * pxPerDay}px`).join(' ') }}
              >
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="h-7 flex items-center border-l border-gray-200 px-2 font-medium text-left whitespace-nowrap overflow-hidden"
                  >
                    <span className="truncate">{m.label}</span>
                  </div>
                ))}
              </div>
              {isTodayInOuter && <div className="absolute top-0 bottom-0 w-px bg-blue-600" style={{ left: todayX }} />}
            </div>
          </div>
        </div>
      </div>
      <div className="h-6 flex items-center text-[11px] text-gray-500">
        <div className="w-64 shrink-0 px-2" />
        <div className="flex-1 overflow-hidden">
          <div className="relative overflow-visible">
            <div style={{ transform: `translateX(-${scrollLeft}px)` }}>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${daysTotal}, ${pxPerDay}px)` }}>
                {Array.from({ length: daysTotal }).map((_, i) => {
                  const currentDate = addDays(viewport.start, i)
                  const isWeekStart = currentDate.getDay() === 0 // Sunday
                  return (
                    <div key={i} className="h-6 flex items-center justify-center border-l border-gray-100">
                      {isWeekStart ? format(currentDate, 'd') : ''}
                    </div>
                  )
                })}
              </div>
              {isTodayInOuter && <div className="absolute top-0 bottom-0 w-px bg-blue-600" style={{ left: todayX }} />}
              {isTodayInOuter && (
                <>
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: todayX, top: '50%', zIndex: 2 }}
                    aria-label="Today"
                  >
                    <div className="px-2 h-5 rounded-lg bg-blue-600 text-white text-[11px] leading-5 font-medium shadow-sm inline-flex items-center justify-center">
                      {format(clampedToday, 'd')}
                    </div>
                  </div>
                  <div
                    className="absolute -translate-x-1/2"
                    style={{ left: todayX, top: 'calc(50% + 12px)', zIndex: 2 }}
                  >
                    <div className="rounded-full bg-blue-600" style={{ width: 6, height: 6 }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export function TimelineBoard({
  tasks,
  setTasks,
  viewport,
  onExtendViewport,
  onOrderChanged,
  onRowDoubleClick,
}: TimelineBoardProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )
  const [activeRow, setActiveRow] = useState<TimelineTask | null>(null)
  const activeRef = useRef<TimelineTask | null>(null)
  useEffect(() => {
    activeRef.current = activeRow
  }, [activeRow])

  // Measure viewport height to extend today marker fully even with few rows
  const rightPaneRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const leftScrollerRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const syncingRef = useRef(false)
  const [viewportH, setViewportH] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Infinite scroll configuration
  const EDGE_THRESHOLD_PX = 100
  const EXTEND_DAYS = 30

  // Track pending scroll adjustment after viewport extension
  const pendingScrollAdjustRef = useRef<number | null>(null)
  // Debounce extension calls
  const extensionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Flag to skip edge detection during programmatic scroll adjustments
  const isAdjustingScrollRef = useRef(false)
  // Flag to track if an extension is in progress
  const extensionInProgressRef = useRef(false)

  useEffect(() => {
    const el = rightPaneRef.current
    if (!el) return
    const update = () => setViewportH(el.clientHeight || 0)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Adjust scroll position after left-side viewport extension
  useEffect(() => {
    if (pendingScrollAdjustRef.current !== null && scrollerRef.current) {
      const adjustment = pendingScrollAdjustRef.current
      pendingScrollAdjustRef.current = null
      
      // Set flag to skip edge detection during programmatic adjustment
      isAdjustingScrollRef.current = true
      
      // Use requestAnimationFrame to ensure adjustment happens in sync with rendering
      requestAnimationFrame(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollLeft += adjustment
        }
        // Clear the flag after a frame to allow edge detection again
        requestAnimationFrame(() => {
          isAdjustingScrollRef.current = false
          extensionInProgressRef.current = false
        })
      })
    }
  }, [viewport.start]) // Trigger when viewport.start changes

  const tasksIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current
    if (data?.type === 'Row') setActiveRow(data.task)
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveRow(null)
    const { active, over } = e
    if (!over || !active) return
    const from = tasks.findIndex((t) => t.id === active.id)
    const to = tasks.findIndex((t) => t.id === over.id)
    if (from === -1 || to === -1 || from === to) return
    const next = arrayMove(tasks, from, to)
    setTasks(next)
    setTimeout(
      () =>
        onOrderChanged?.(
          next.map((t) => String(t.id)),
          String(active.id)
        ),
      0
    )
  }

  // Derive viewport pixel width for bars layer and header
  const days = Math.max(1, differenceInCalendarDays(viewport.end, viewport.start) + 1)
  const pxPerDay = viewport.pxPerDay ?? 16
  const totalPx = days * pxPerDay

  // Handler to scroll to a task's bar
  const scrollToTask = (taskId: string) => {
    const task = tasks.find((t) => String(t.id) === taskId)
    if (!task) return
    const scroller = scrollerRef.current
    if (!scroller) return

    const start = task.start && isValid(task.start) ? clampDate(task.start, viewport.start, viewport.end) : null
    if (!start) return

    const startOffset = Math.max(0, differenceInCalendarDays(start, viewport.start)) * pxPerDay
    const targetScrollLeft = startOffset - scroller.clientWidth / 2
    scroller.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
  }

  // Handle infinite scroll edge detection
  const handleEdgeDetection = useCallback(
    (currentScrollLeft: number, scrollWidth: number, clientWidth: number) => {
      // Skip if no handler, during programmatic adjustment, or if extension already in progress
      if (!onExtendViewport || isAdjustingScrollRef.current || extensionInProgressRef.current) {
        return
      }

      const atLeftEdge = currentScrollLeft < EDGE_THRESHOLD_PX
      const atRightEdge = currentScrollLeft + clientWidth > scrollWidth - EDGE_THRESHOLD_PX

      // Clear any pending extension
      if (extensionTimeoutRef.current) {
        clearTimeout(extensionTimeoutRef.current)
      }

      // Debounce to avoid rapid extensions
      extensionTimeoutRef.current = setTimeout(() => {
        // Double-check flags before executing
        if (isAdjustingScrollRef.current || extensionInProgressRef.current) {
          return
        }

        if (atLeftEdge) {
          // Mark extension in progress
          extensionInProgressRef.current = true
          // Store scroll adjustment for after state update
          pendingScrollAdjustRef.current = EXTEND_DAYS * pxPerDay
          onExtendViewport('left', EXTEND_DAYS)
        } else if (atRightEdge) {
          extensionInProgressRef.current = true
          onExtendViewport('right', EXTEND_DAYS)
          // For right extension, clear the flag after a short delay
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              extensionInProgressRef.current = false
            })
          })
        }
      }, 50)
    },
    [onExtendViewport, pxPerDay, EDGE_THRESHOLD_PX, EXTEND_DAYS]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (extensionTimeoutRef.current) {
        clearTimeout(extensionTimeoutRef.current)
      }
    }
  }, [])

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="h-full flex flex-col">
        <TimelineHeader
          ref={headerRef}
          viewport={viewport}
          scrollLeft={scrollLeft}
        />
        <div className="flex-1 min-h-0 flex">
          {/* Left list */}
          <div className="w-64 shrink-0 border-r border-gray-200">
            <div
              className="h-full overflow-auto"
              ref={leftScrollerRef as any}
              onScroll={(e) => {
                if (syncingRef.current) return
                const left = e.currentTarget
                const right = scrollerRef.current
                if (!right) return
                syncingRef.current = true
                right.scrollTop = left.scrollTop
                requestAnimationFrame(() => {
                  syncingRef.current = false
                })
              }}
            >
              <div className="relative" style={{ height: tasks.length * 40 }}>
                <SortableCtx items={tasksIds as any}>
                  {tasks.map((t) => (
                    <Row
                      key={String(t.id)}
                      task={t}
                      onDoubleClick={() => {
                        scrollToTask(String(t.id))
                        onRowDoubleClick?.(String(t.id))
                      }}
                    />
                  ))}
                </SortableCtx>
              </div>
            </div>
          </div>
          {/* Right timeline grid */}
          <div className="flex-1 overflow-auto relative" ref={rightPaneRef as any}>
            <div
              className="h-full overflow-auto"
              ref={scrollerRef as any}
              onScroll={(e) => {
                const scroller = e.currentTarget
                const { scrollLeft: currentScrollLeft, scrollWidth, clientWidth } = scroller

                setScrollLeft(currentScrollLeft)

                // Infinite scroll edge detection
                handleEdgeDetection(currentScrollLeft, scrollWidth, clientWidth)

                // vertical sync to left
                const left = leftScrollerRef.current
                if (!syncingRef.current && left) {
                  syncingRef.current = true
                  left.scrollTop = scroller.scrollTop
                  requestAnimationFrame(() => {
                    syncingRef.current = false
                  })
                }
              }}
            >
              <div
                className="relative min-h-full cursor-grab"
                style={{ width: totalPx, height: Math.max(tasks.length * 40, viewportH) }}
                onPointerDown={(e) => {
                  // Begin 2D panning on left mouse or touch
                  if (e.button !== 0 && e.pointerType !== 'touch') return
                  const scroller = (scrollerRef.current as HTMLElement) || null
                  if (!scroller) return
                  e.preventDefault()
                  try {
                    ;(e.currentTarget as unknown as Element).setPointerCapture?.(e.pointerId)
                  } catch {}
                  const startX = e.clientX
                  const startY = e.clientY
                  const startScrollLeft = scroller.scrollLeft
                  const startScrollTop = scroller.scrollTop
                  let panning = true
                  // Update cursor
                  const el = e.currentTarget as HTMLElement
                  const prevCursor = el.style.cursor
                  el.style.cursor = 'grabbing'
                  const onMove = (ev: PointerEvent) => {
                    if (!panning) return
                    const dx = ev.clientX - startX
                    const dy = ev.clientY - startY
                    scroller.scrollLeft = startScrollLeft - dx
                    scroller.scrollTop = startScrollTop - dy

                    // Trigger edge detection during panning
                    handleEdgeDetection(scroller.scrollLeft, scroller.scrollWidth, scroller.clientWidth)
                  }
                  const onUp = () => {
                    panning = false
                    el.style.cursor = prevCursor
                    window.removeEventListener('pointermove', onMove)
                    window.removeEventListener('pointerup', onUp)
                    window.removeEventListener('pointercancel', onUp)
                  }
                  window.addEventListener('pointermove', onMove)
                  window.addEventListener('pointerup', onUp)
                  window.addEventListener('pointercancel', onUp)
                }}
              >
                <BarsLayer
                  tasks={tasks}
                  viewport={viewport}
                  onBarDoubleClick={(taskId, barLeftPx) => {
                    const scroller = scrollerRef.current
                    if (!scroller) return
                    // Center the bar in the viewport
                    const targetScrollLeft = barLeftPx - scroller.clientWidth / 2
                    scroller.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && (
        <DragOL>
          {activeRow && (
            <div className="pointer-events-none">
              <div className="h-10 flex items-center px-2 rounded bg-white shadow-sm border">
                <span className="text-sm">{activeRow.title}</span>
              </div>
            </div>
          )}
        </DragOL>
      )}
    </DndContext>
  )
}
