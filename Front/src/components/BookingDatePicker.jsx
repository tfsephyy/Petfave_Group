import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { date } from '../lib/api'

export default function BookingDatePicker({ value, onChange, today }) {
  const [month, setMonth] = useState(value?.slice(0, 7) || today.slice(0, 7))
  const visibleMonth = month < today.slice(0, 7) ? today.slice(0, 7) : month
  const first = new Date(`${visibleMonth}-01T00:00:00Z`)
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first)
    day.setUTCDate(index - first.getUTCDay() + 1)
    return day.toISOString().slice(0, 10)
  })
  const shift = (amount) => {
    const next = new Date(first)
    next.setUTCMonth(next.getUTCMonth() + amount)
    setMonth(next.toISOString().slice(0, 7))
  }

  return (
    <fieldset className="booking-date-picker">
      <legend>Choose date</legend>
      <div className="booking-month">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous month"
          disabled={visibleMonth <= today.slice(0, 7)}
          onClick={() => shift(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <strong aria-live="polite">
          {date(`${visibleMonth}-01T00:00:00+08:00`, { month: 'long', day: undefined })}
        </strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          onClick={() => shift(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="booking-date-grid">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day} aria-hidden="true">
            {day}
          </span>
        ))}
        {days.map((day, index) => (
          <button
            key={day}
            type="button"
            disabled={day < today || index % 7 === 0 || day.slice(0, 7) !== visibleMonth}
            aria-label={date(`${day}T00:00:00+08:00`, { weekday: 'long', month: 'long' })}
            aria-pressed={value === day}
            aria-current={day === today ? 'date' : undefined}
            onClick={() => onChange(day)}
          >
            {Number(day.slice(-2))}
          </button>
        ))}
      </div>
      <p className="muted">Monday–Saturday. Sundays are closed.</p>
    </fieldset>
  )
}
