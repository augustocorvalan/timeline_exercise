import { addDays } from 'date-fns'
import { useCallback, useState } from 'react'
import { TimelineBoard, type TimelineViewport } from './TimelineBoard'

const today = new Date()
const seedTasks = [
  { id: 'r-1', title: 'Kickoff', start: addDays(today, -10), end: addDays(today, -7) },
  { id: 'r-2', title: 'Design', start: addDays(today, -5), end: addDays(today, 8) },
  { id: 'r-3', title: 'Implementation Phase 1', start: addDays(today, 2), end: addDays(today, 18) },
  { id: 'r-4', title: 'Implementation Phase 2', start: addDays(today, 19), end: addDays(today, 35) },
  { id: 'r-5', title: 'QA & UAT', start: addDays(today, 28), end: addDays(today, 40) },
  { id: 'r-6', title: 'Launch Prep', start: addDays(today, 36), end: addDays(today, 45) },
  { id: 'r-7', title: 'Launch', start: addDays(today, 46), end: addDays(today, 46) },
  { id: 'r-8', title: 'Post-Launch Monitoring', start: addDays(today, 47), end: addDays(today, 60) },
  { id: 'r-9', title: 'Documentation', start: addDays(today, 5), end: addDays(today, 25) },
  { id: 'r-10', title: 'Security Audit', start: addDays(today, 20), end: addDays(today, 28) },
  { id: 'r-11', title: 'Performance Testing', start: addDays(today, 30), end: addDays(today, 38) },
  { id: 'r-12', title: 'User Training', start: addDays(today, 40), end: addDays(today, 48) },
  { id: 'r-13', title: 'Data Migration', start: addDays(today, 15), end: addDays(today, 22) },
  { id: 'r-14', title: 'API Integration', start: addDays(today, 10), end: addDays(today, 20) },
  { id: 'r-15', title: 'Code Review', start: addDays(today, 25), end: addDays(today, 30) },
  { id: 'r-16', title: 'Bug Fixes', start: addDays(today, 35), end: addDays(today, 42) },
  { id: 'r-17', title: 'Stakeholder Demo', start: addDays(today, 44), end: addDays(today, 44) },
  { id: 'r-18', title: 'Retrospective', start: addDays(today, 55), end: addDays(today, 56) },
  { id: 'r-19', title: 'Retrospective', start: addDays(today, 55), end: addDays(today, 56) },
  { id: 'r-20', title: 'Retrospective', start: addDays(today, 55), end: addDays(today, 56) },
  { id: 'r-21', title: 'Retrospective', start: addDays(today, 55), end: addDays(today, 56) },
  { id: 'r-22', title: 'Retrospective', start: addDays(today, 55), end: addDays(today, 56) },
  { id: 'r-23', title: 'Retrospective', start: addDays(today, 55), end: addDays(today, 56) },
].map((t, i) => ({ ...t, baseIndex: i }))

export function App() {
  const [tasks, setTasks] = useState(seedTasks)
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

  return (
    <div className="w-full h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-7xl h-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <TimelineBoard tasks={tasks as any} setTasks={setTasks as any} viewport={viewport} onExtendViewport={extendViewport} />
      </div>
    </div>
  )
}
