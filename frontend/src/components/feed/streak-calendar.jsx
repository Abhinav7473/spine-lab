import { useState, useEffect } from 'react'
import { api } from '../../utils/api'
import '../../styles/streak-calendar.css'

const RANGES = [
  { label: '2w', days: 14  },
  { label: '1m', days: 30  },
  { label: '3m', days: 90  },
  { label: '1y', days: 365 },
]

// Intensity bucket: 0 = none, 1-4 = light → heavy
function level(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4)  return 3
  return 4
}

// Build week columns from a flat date→count map
function buildGrid(data, days) {
  // data: [{date, count}, ...]
  const map = Object.fromEntries(data.map(d => [d.date, d.count]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Pad start to a Sunday
  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))
  const dayOfWeek = start.getDay()  // 0=Sun
  const paddedStart = new Date(start)
  paddedStart.setDate(paddedStart.getDate() - dayOfWeek)

  const weeks = []
  let week = []
  let cursor = new Date(paddedStart)

  while (cursor <= today) {
    const iso = cursor.toISOString().split('T')[0]
    const isFuture = cursor > today
    const isInRange = cursor >= start
    week.push({
      date:    iso,
      count:   isInRange && !isFuture ? (map[iso] ?? 0) : null,
      inRange: isInRange && !isFuture,
    })
    cursor.setDate(cursor.getDate() + 1)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) weeks.push(week)
  return weeks
}

export function StreakCalendar({ userId }) {
  const [days,    setDays]    = useState(90)
  const [data,    setData]    = useState([])
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}/activity?days=${days}`).then(setData).catch(() => {})
  }, [userId, days])

  const weeks = buildGrid(data, days)
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="streak-cal">
      <div className="streak-cal-header">
        <span className="streak-cal-title">Activity</span>
        <div className="streak-cal-ranges">
          {RANGES.map(r => (
            <button
              key={r.days}
              className={`streak-range-btn ${days === r.days ? 'active' : ''}`}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="streak-cal-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="streak-week">
            {week.map((day, di) => (
              <div
                key={di}
                className={`streak-day level-${day.inRange ? level(day.count) : 'empty'}`}
                onMouseEnter={() => day.inRange && setTooltip({ date: day.date, count: day.count })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {tooltip && (
        <p className="streak-cal-tooltip">
          {tooltip.date} — {tooltip.count} session{tooltip.count !== 1 ? 's' : ''}
        </p>
      )}

      <p className="streak-cal-total">{total} sessions in this period</p>
    </div>
  )
}
