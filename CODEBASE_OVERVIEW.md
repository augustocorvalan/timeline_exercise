# Timeline Exercise - Codebase Overview

## Project Summary

A React-based interactive timeline/Gantt chart component built with modern tooling. Users can view project tasks on a horizontal timeline, drag-and-drop to reorder tasks, and pan horizontally through the timeline.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Date Utilities | date-fns |
| Icons | lucide-react |
| Language | TypeScript |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  - Manages task state (seedTasks)                           │
│  - Defines viewport (start, end, pxPerDay)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   TimelineBoard.tsx                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              TimelineHeader (sticky)                   │  │
│  │  - Month labels  - Day numbers  - Today marker         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌─────────────┬─────────────────────────────────────────┐  │
│  │  Left Pane  │           Right Pane (Scrollable)       │  │
│  │  (Rows)     │           BarsLayer                      │  │
│  │  - Task     │  - Vertical grid lines                  │  │
│  │    titles   │  - Today marker                         │  │
│  │  - Sortable │  - Task bars (positioned absolutely)    │  │
│  │    via DnD  │  - Horizontal panning                   │  │
│  └─────────────┴─────────────────────────────────────────┘  │
│                    DndContext (wraps everything)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Data Structures

### TimelineTask
```typescript
interface TimelineTask {
  id: UniqueIdentifier    // Unique identifier for drag-and-drop
  title: string           // Display name
  start: Date | null      // Start date
  end: Date | null        // End date
  baseIndex: number       // Original position in list
}
```

### TimelineViewport
```typescript
interface TimelineViewport {
  start: Date             // Viewport start date
  end: Date               // Viewport end date
  pxPerDay?: number       // Pixels per day (default: 16)
}
```

---

## Component Breakdown

### `App.tsx` (Entry Point)
- **State**: `tasks` - array of `TimelineTask` objects
- **Viewport**: Fixed 84-day window (-14 to +70 days from today)
- **Renders**: `TimelineBoard` with tasks, setter, and viewport

### `TimelineBoard.tsx` (Main Component)
| Sub-Component | Responsibility |
|---------------|----------------|
| `TimelineHeader` | Sticky header with month/day labels and today marker |
| `Row` | Individual sortable task row (left pane) |
| `BarsLayer` | Renders task bars positioned on the timeline grid |

### Key Features Implemented
1. **Drag-and-Drop Reordering** - Uses `@dnd-kit` with Mouse, Touch, and Keyboard sensors
2. **Synchronized Scrolling** - Left (titles) and right (bars) panes scroll vertically together
3. **Horizontal Panning** - Click-and-drag to pan the timeline
4. **Today Marker** - Blue vertical line indicating current date
5. **Single-Day Events** - Diamond marker style for tasks with same start/end date
6. **Double-Click Actions** - Scrolls to center the clicked task's bar

---

## Layout Math

```
totalPx = days × pxPerDay
taskBarLeft = differenceInDays(taskStart, viewportStart) × pxPerDay
taskBarWidth = (differenceInDays(taskEnd, taskStart) + 1) × pxPerDay
rowHeight = 40px
```

---

## Extension Points (for new features)

| Feature Area | Where to Modify |
|--------------|-----------------|
| Add new task fields | `TimelineTask` interface + `seedTasks` in App.tsx |
| Task bar styling | `BarsLayer` component |
| Task editing | Add `onClick` handler to bars/rows |
| Zoom in/out | Modify `pxPerDay` in viewport |
| Date range selection | Add date picker, update `viewport.start/end` |
| Task creation | Implement `Plus` button handler in `TimelineHeader` |
| Task dependencies | Add `dependencies` field to task, render lines in `BarsLayer` |
| Persistence | Replace `useState` with API calls or localStorage |

---

## File Structure Summary

```
src/
├── main.tsx           # React entry point
├── App.tsx            # Root component, task state, viewport config
├── TimelineBoard.tsx  # Main timeline component (478 lines)
│   ├── Row            # Sortable task row
│   ├── BarsLayer      # Task bar visualization
│   └── TimelineHeader # Sticky month/day header
└── index.css          # Tailwind imports + base styles
```

---

## Running the Project

```bash
npm install    # Install dependencies
npm run dev    # Start Vite dev server (hot reload)
npm run build  # Production build
```
