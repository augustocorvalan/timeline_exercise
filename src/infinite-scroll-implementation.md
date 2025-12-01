# Infinite Horizontal Scroll - Implementation Spec

## Overview
Implement infinite horizontal scrolling for the timeline by dynamically extending the viewport boundaries when the user scrolls near the edges.

## Configuration Constants
```typescript
const EDGE_THRESHOLD_PX = 100  // Pixels from edge to trigger extension
const EXTEND_DAYS = 5          // Days to add when extending
```

---

## Task 1: Make Viewport Stateful in App.tsx

### File: `src/App.tsx`

### Current Code (lines 32-37):
```typescript
const viewport: TimelineViewport = useMemo(() => {
  const start = addDays(today, -14)
  const end = addDays(today, 70)
  return { start, end, pxPerDay: 16 }
}, [])
```

### Required Changes:
1. Replace `useMemo` with `useState` for viewport
2. Create `extendViewport` callback function
3. Pass `extendViewport` to `TimelineBoard`

### New Code:
```typescript
const [viewport, setViewport] = useState<TimelineViewport>(() => ({
  start: addDays(today, -14),
  end: addDays(today, 70),
  pxPerDay: 16,
}))

const extendViewport = useCallback((direction: 'left' | 'right', days: number) => {
  setViewport((prev) => ({
    ...prev,
    start: direction === 'left' ? addDays(prev.start, -days) : prev.start,
    end: direction === 'right' ? addDays(prev.end, days) : prev.end,
  }))
}, [])
```

### Updated JSX:
```typescript
<TimelineBoard 
  tasks={tasks as any} 
  setTasks={setTasks as any} 
  viewport={viewport}
  onExtendViewport={extendViewport}
/>
```

### Import Changes:
- Add `useCallback` to the react import
- Import `TimelineViewport` type if not already (it is exported from TimelineBoard)

---

## Task 2: Update TimelineBoard Props Interface

### File: `src/TimelineBoard.tsx`

### Current Interface (lines 35-41):
```typescript
export interface TimelineBoardProps {
  tasks: TimelineTask[]
  setTasks: React.Dispatch<React.SetStateAction<TimelineTask[]>>
  viewport: TimelineViewport
  onOrderChanged?: (orderedIds: string[], movedId?: string) => void
  onRowDoubleClick?: (taskId: string) => void
}
```

### New Interface:
```typescript
export interface TimelineBoardProps {
  tasks: TimelineTask[]
  setTasks: React.Dispatch<React.SetStateAction<TimelineTask[]>>
  viewport: TimelineViewport
  onExtendViewport?: (direction: 'left' | 'right', days: number) => void
  onOrderChanged?: (orderedIds: string[], movedId?: string) => void
  onRowDoubleClick?: (taskId: string) => void
}
```

---

## Task 3: Add Edge Detection and Scroll Position Preservation

### File: `src/TimelineBoard.tsx`

### 3.1 Update Component Destructuring (line 266-272):
```typescript
export function TimelineBoard({
  tasks,
  setTasks,
  viewport,
  onExtendViewport,
  onOrderChanged,
  onRowDoubleClick,
}: TimelineBoardProps) {
```

### 3.2 Add Constants and Refs (after line 290, after `const [scrollLeft, setScrollLeft] = useState(0)`):
```typescript
// Infinite scroll configuration
const EDGE_THRESHOLD_PX = 100
const EXTEND_DAYS = 5

// Track pending scroll adjustment after viewport extension
const pendingScrollAdjustRef = useRef<number | null>(null)
// Debounce extension calls
const extensionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

### 3.3 Add Effect for Scroll Position Adjustment (after the ResizeObserver useEffect, around line 300):
```typescript
// Adjust scroll position after left-side viewport extension
useEffect(() => {
  if (pendingScrollAdjustRef.current !== null && scrollerRef.current) {
    const adjustment = pendingScrollAdjustRef.current
    scrollerRef.current.scrollLeft += adjustment
    pendingScrollAdjustRef.current = null
  }
}, [viewport.start]) // Trigger when viewport.start changes
```

### 3.4 Create Edge Detection Handler (before the return statement, around line 340):
```typescript
// Handle infinite scroll edge detection
const handleEdgeDetection = useCallback(
  (scrollLeft: number, scrollWidth: number, clientWidth: number) => {
    if (!onExtendViewport) return

    const pxPerDay = viewport.pxPerDay ?? 16
    const atLeftEdge = scrollLeft < EDGE_THRESHOLD_PX
    const atRightEdge = scrollLeft + clientWidth > scrollWidth - EDGE_THRESHOLD_PX

    // Clear any pending extension
    if (extensionTimeoutRef.current) {
      clearTimeout(extensionTimeoutRef.current)
    }

    // Debounce to avoid rapid extensions
    extensionTimeoutRef.current = setTimeout(() => {
      if (atLeftEdge) {
        // Store scroll adjustment for after state update
        pendingScrollAdjustRef.current = EXTEND_DAYS * pxPerDay
        onExtendViewport('left', EXTEND_DAYS)
      } else if (atRightEdge) {
        onExtendViewport('right', EXTEND_DAYS)
      }
    }, 50)
  },
  [onExtendViewport, viewport.pxPerDay]
)

// Cleanup timeout on unmount
useEffect(() => {
  return () => {
    if (extensionTimeoutRef.current) {
      clearTimeout(extensionTimeoutRef.current)
    }
  }
}, [])
```

### 3.5 Update the onScroll Handler (around line 395-410):
Find this existing code:
```typescript
onScroll={(e) => {
  const scroller = e.currentTarget

  setScrollLeft(scroller.scrollLeft)

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
```

Replace with:
```typescript
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
```

---

## Task 4: Handle Panning Edge Detection

### File: `src/TimelineBoard.tsx`

The panning handler (onPointerDown) also updates scroll position but bypasses the onScroll event during active dragging. Update the `onMove` handler inside the `onPointerDown` callback.

### Find this code (around line 420-430):
```typescript
const onMove = (ev: PointerEvent) => {
  if (!panning) return
  const dx = ev.clientX - startX
  const dy = ev.clientY - startY
  scroller.scrollLeft = startScrollLeft - dx
  scroller.scrollTop = startScrollTop - dy
}
```

### Replace with:
```typescript
const onMove = (ev: PointerEvent) => {
  if (!panning) return
  const dx = ev.clientX - startX
  const dy = ev.clientY - startY
  scroller.scrollLeft = startScrollLeft - dx
  scroller.scrollTop = startScrollTop - dy
  
  // Trigger edge detection during panning
  handleEdgeDetection(scroller.scrollLeft, scroller.scrollWidth, scroller.clientWidth)
}
```

---

## Summary of All Changes

### `src/App.tsx`
| Line | Change |
|------|--------|
| 2 | Add `useCallback` to import |
| 32-37 | Replace `useMemo` with `useState` for viewport |
| After viewport | Add `extendViewport` callback |
| JSX | Add `onExtendViewport={extendViewport}` prop |

### `src/TimelineBoard.tsx`
| Location | Change |
|----------|--------|
| Props interface | Add `onExtendViewport?: (direction: 'left' \| 'right', days: number) => void` |
| Destructuring | Add `onExtendViewport` |
| After state declarations | Add constants and refs for infinite scroll |
| After ResizeObserver effect | Add scroll adjustment effect |
| Before return | Add `handleEdgeDetection` callback and cleanup effect |
| onScroll handler | Add `handleEdgeDetection` call |
| onPointerDown > onMove | Add `handleEdgeDetection` call |

---

## Testing Checklist

1. **Scroll Right Extension**
   - Scroll to right edge using scrollbar
   - Scroll to right edge using click-and-drag pan
   - Verify viewport extends by 5 days
   - Verify no scroll position jump

2. **Scroll Left Extension**
   - Scroll to left edge using scrollbar
   - Scroll to left edge using click-and-drag pan
   - Verify viewport extends by 5 days
   - Verify scroll position is preserved (no jump to 0)

3. **Header Sync**
   - Verify month labels extend correctly
   - Verify day numbers extend correctly
   - Verify today marker stays in correct position

4. **Task Bars**
   - Verify existing task bars remain positioned correctly
   - Verify bars don't shift unexpectedly

5. **Performance**
   - Rapid scrolling should not cause multiple extensions (debounce works)
   - No visible jank on extension

---

## Edge Cases to Handle

1. **Double-click to scroll** - `scrollToTask` function uses viewport for calculations, should work automatically since viewport is reactive

2. **Tasks outside viewport** - Task bars are already clamped to viewport bounds via `clampDate`, this behavior is preserved

3. **Very fast scrolling** - Debounce timeout (50ms) prevents rapid-fire extensions

4. **Initial scroll position** - User starts at scrollLeft=0, might immediately trigger left extension if threshold is too high. Current threshold of 100px with initial viewport of -14 days should be safe (14 * 16 = 224px buffer)
