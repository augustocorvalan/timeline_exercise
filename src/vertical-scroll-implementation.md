# Implementation Instructions: Vertical Scroll Synchronization

## Objective
Enable vertical scrolling via click-and-drag on the right pane (timeline grid), while maintaining synchronization with the left pane (task titles).

---

## File to Modify
`/src/TimelineBoard.tsx`

---

## Current Behavior Analysis

The `onPointerDown` handler (lines 411-444) currently:
1. Captures pointer on left-click or touch
2. Tracks only horizontal movement (`startX`, `dx`)
3. Updates only `scroller.scrollLeft`

The `onScroll` handler (lines 394-406) already syncs vertical scroll:
- When `scrollerRef` (right pane) scrolls, it updates `leftScrollerRef.scrollTop`
- Uses `syncingRef` to prevent infinite scroll loops

**Key insight**: Vertical sync already works via the `onScroll` event. We only need to add vertical panning to trigger it.

---

## Implementation Steps

### Step 1: Add vertical tracking variables

**Location**: Inside the `onPointerDown` handler, after line 419 (`const startX = e.clientX`)

**Add these two lines**:
```typescript
const startY = e.clientY
const startScrollTop = scroller.scrollTop
```

### Step 2: Update the `onMove` handler to include vertical scrolling

**Location**: Inside the `onMove` function (lines 430-433)

**Current code**:
```typescript
const onMove = (ev: PointerEvent) => {
  if (!panning) return
  const dx = ev.clientX - startX
  scroller.scrollLeft = startScrollLeft - dx
}
```

**Replace with**:
```typescript
const onMove = (ev: PointerEvent) => {
  if (!panning) return
  const dx = ev.clientX - startX
  const dy = ev.clientY - startY
  scroller.scrollLeft = startScrollLeft - dx
  scroller.scrollTop = startScrollTop - dy
}
```

### Step 3: Update the comment for clarity

**Location**: Line 412

**Current code**:
```typescript
// Begin horizontal panning on left mouse or touch
```

**Replace with**:
```typescript
// Begin 2D panning on left mouse or touch
```

---

## Complete Code Block (for reference)

The modified `onPointerDown` handler should look like this:

```typescript
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
```

---

## Why This Works

1. **Vertical panning**: Setting `scroller.scrollTop` during drag moves the right pane vertically
2. **Left pane sync**: The existing `onScroll` handler on `scrollerRef` fires when `scrollTop` changes, which then syncs `leftScrollerRef.scrollTop`
3. **No sync loops**: The existing `syncingRef` guard prevents infinite scroll event chains

---

## Testing Checklist

- [ ] Click and drag horizontally on right pane → timeline pans left/right
- [ ] Click and drag vertically on right pane → timeline pans up/down
- [ ] Click and drag diagonally on right pane → timeline pans in both directions
- [ ] During vertical drag, left pane (task titles) scrolls in sync
- [ ] Scroll left pane directly → right pane still syncs (existing behavior)
- [ ] Mouse wheel scroll on right pane → left pane syncs (existing behavior)
- [ ] Touch drag works on mobile/tablet
- [ ] Cursor changes to "grabbing" during drag
- [ ] No console errors or warnings

---

## Edge Cases Handled

| Case | Behavior |
|------|----------|
| Drag past content bounds | Native scroll clamping prevents over-scroll |
| Very fast drag | Pointer events fire frequently enough for smooth tracking |
| Drag + release outside window | `pointerup`/`pointercancel` on `window` ensures cleanup |
| Concurrent scroll events | `syncingRef` prevents feedback loops |

---

## Lines Changed Summary

| Line(s) | Change |
|---------|--------|
| 412 | Update comment from "horizontal" to "2D" |
| 420 | Add `const startY = e.clientY` |
| 421 | Add `const startScrollTop = scroller.scrollTop` |
| 432 | Add `const dy = ev.clientY - startY` |
| 434 | Add `scroller.scrollTop = startScrollTop - dy` |

**Total**: 4 new lines, 1 comment update
