import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  List,
  Plus,
  X,
} from 'lucide-react'
import { date, localInput, time } from '../lib/api'
import { useSession } from '../lib/session'
import { useResource } from '../lib/hooks'
import { SaveForm } from '../components/forms'
import BookingDatePicker from '../components/BookingDatePicker'
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHead,
  Pagination,
  PetAvatar,
  Spinner,
} from '../components/ui'

const services = [
  'Consultation',
  'Vaccination',
  'Wellness exam',
  'Surgery',
  'Dental care',
  'Follow-up',
  'Grooming',
]
const dayKey = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

export default function Appointments() {
  const { staff, notify, now } = useSession()
  const [params, setParams] = useSearchParams()
  const today = dayKey(now)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [view, setView] = useState('calendar'),
    [page, setPage] = useState(1),
    [status, setStatus] = useState('')
  const [edit, setEdit] = useState(params.has('new') ? {} : null),
    [selected, setSelected] = useState(null),
    [transition, setTransition] = useState(null)
  const first = new Date(`${month}-01T00:00:00Z`)
  const end = new Date(first)
  end.setUTCMonth(end.getUTCMonth() + 1)
  const from = `${month}-01T00:00:00+08:00`,
    to = `${end.toISOString().slice(0, 10)}T00:00:00+08:00`
  const { data, error, loading, reload } = useResource(
    `/bookings?page=${page}&per_page=${view === 'calendar' ? 100 : 10}&direction=asc${status ? `&status=${status}` : ''}${view === 'calendar' ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ''}`,
  )
  const entries = data?.data || []
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first)
    day.setUTCDate(index - first.getUTCDay() + 1)
    return day.toISOString().slice(0, 10)
  })
  const shift = (amount) => {
    const day = new Date(first)
    day.setUTCMonth(day.getUTCMonth() + amount)
    setMonth(day.toISOString().slice(0, 7))
    setPage(1)
  }
  const closeEdit = () => {
    setEdit(null)
    setParams({})
  }
  const saved = () => {
    closeEdit()
    setSelected(null)
    reload()
  }
  return (
    <>
      <PageHead
        eyebrow="MAKE A LITTLE TIME FOR WELLBEING"
        title={staff ? 'The care calendar' : 'Their next happy visit'}
        description={
          staff
            ? 'A thoughtful schedule for every patient and care team.'
            : 'Request a visit and keep up with your appointments.'
        }
      >
        <button className="button" onClick={() => setEdit({})}>
          <Plus size={17} /> New appointment
        </button>
      </PageHead>
      <div className="schedule-note">
        <Clock3 size={16} />
        <span>
          All times shown in Philippine time (Asia/Manila). Pending requests reserve their time
          until reviewed.
        </span>
      </div>
      <section className="panel">
        <div className="list-toolbar">
          <div className="calendar-navigation">
            <button className="icon-button" aria-label="Previous month" onClick={() => shift(-1)}>
              <ChevronLeft size={19} />
            </button>
            <h2>{date(first, { month: 'long', year: 'numeric', day: undefined })}</h2>
            <button className="icon-button" aria-label="Next month" onClick={() => shift(1)}>
              <ChevronRight size={19} />
            </button>
            <button
              className="button secondary small"
              onClick={() => {
                setMonth(today.slice(0, 7))
                setPage(1)
              }}
            >
              Today
            </button>
          </div>
          <div className="toolbar-right">
            <select
              value={status}
              aria-label="Filter by booking status"
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              {['pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'no_show'].map(
                (s) => (
                  <option key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </option>
                ),
              )}
            </select>
            <div className="segmented">
              <button
                className={view === 'calendar' ? 'selected' : ''}
                aria-label="Calendar view"
                onClick={() => {
                  setView('calendar')
                  setPage(1)
                }}
              >
                <CalendarDays size={16} />
              </button>
              <button
                className={view === 'list' ? 'selected' : ''}
                aria-label="List view"
                onClick={() => {
                  setView('list')
                  setPage(1)
                }}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Spinner />
        ) : view === 'calendar' ? (
          <>
            <div className="calendar-scroll">
              <div className="calendar">
                <div className="calendar-weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="calendar-days">
                  {days.map((day) => (
                    <div
                      key={day}
                      className={`calendar-day ${day.slice(0, 7) !== month ? 'outside' : ''} ${day === today ? 'today' : ''}`}
                    >
                      <span className="day-number">{Number(day.slice(-2))}</span>
                      {entries
                        .filter((b) => dayKey(b.starts_at) === day)
                        .map((b) => (
                          <button
                            className={`calendar-event ${b.status}`}
                            key={b.id}
                            onClick={() => setSelected(b)}
                          >
                            <span>{time(b.starts_at)}</span>
                            <strong>{b.animal.name}</strong>
                            <small>{b.service}</small>
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {data?.total > 100 && (
              <div className="calendar-overflow-note">
                Showing 100 of {data.total} appointments. Use list view to see every booking.
              </div>
            )}
            <div className="calendar-legend">
              <Badge>pending</Badge>
              <Badge>confirmed</Badge>
              <Badge>completed</Badge>
              <span>
                {staff
                  ? 'Click an appointment to manage it'
                  : 'Your appointments are private to you and your care team'}
              </span>
            </div>
          </>
        ) : entries.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Service & team</th>
                    <th>Date & time</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link className="table-person" to={`/app/pets/${b.animal_id}`}>
                          <PetAvatar animal={b.animal} />
                          <span>
                            <strong>{b.animal.name}</strong>
                            <small>{b.animal.guardian?.name}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {b.service}
                        <small>{b.resource?.name}</small>
                      </td>
                      <td>
                        {date(b.starts_at)}
                        <small>
                          {time(b.starts_at)} – {time(b.ends_at)}
                        </small>
                      </td>
                      <td>
                        <Badge>{b.status}</Badge>
                      </td>
                      <td>
                        <button className="button secondary small" onClick={() => setSelected(b)}>
                          View visit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data} onPage={setPage} />
          </>
        ) : (
          !error && (
            <Empty
              title="A little room in the schedule"
              text="Your appointments will appear here."
              action={
                <button className="button secondary" onClick={() => setEdit({})}>
                  Request a visit
                </button>
              }
            />
          )
        )}
      </section>
      {edit && (
        <BookingForm
          booking={edit.id ? edit : null}
          initialPet={params.get('pet')}
          onClose={closeEdit}
          onSaved={saved}
        />
      )}
      {selected && (
        <Modal
          title={`${selected.animal.name}’s ${selected.service.toLowerCase()}`}
          onClose={() => setSelected(null)}
        >
          <div className="booking-detail">
            <Badge>{selected.status}</Badge>
            <dl className="details-grid">
              <div>
                <dt>Date</dt>
                <dd>{date(selected.starts_at)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>
                  {time(selected.starts_at)} – {time(selected.ends_at)}
                </dd>
              </div>
              <div>
                <dt>Care team</dt>
                <dd>{selected.resource?.name}</dd>
              </div>
              <div>
                <dt>Pet parent</dt>
                <dd>{selected.animal.guardian?.name}</dd>
              </div>
            </dl>
            {selected.notes && <p className="profile-notes">{selected.notes}</p>}
            {selected.cancellation_reason && (
              <p className="profile-notes">Reason: {selected.cancellation_reason}</p>
            )}
            <div className="booking-actions">
              {['pending', 'confirmed'].includes(selected.status) &&
                new Date(selected.starts_at) > now && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setEdit(selected)
                      setSelected(null)
                    }}
                  >
                    <Edit3 size={16} /> Reschedule
                  </button>
                )}
              {(staff
                ? {
                    pending: ['confirmed', 'cancelled', 'rejected'],
                    confirmed: ['completed', 'cancelled', 'no_show'],
                  }[selected.status] || []
                : ['pending', 'confirmed'].includes(selected.status) &&
                    new Date(selected.starts_at) > now
                  ? ['cancelled']
                  : []
              ).map((s) => (
                <button
                  className={`button ${s === 'confirmed' || s === 'completed' ? '' : 'secondary'}`}
                  key={s}
                  onClick={() => setTransition({ booking: selected, status: s })}
                >
                  {s === 'confirmed' ? (
                    <Check size={16} />
                  ) : s === 'cancelled' ? (
                    <X size={16} />
                  ) : null}
                  {
                    {
                      confirmed: 'Confirm visit',
                      completed: 'Complete visit',
                      cancelled: 'Cancel visit',
                      rejected: 'Decline request',
                      no_show: 'Mark no-show',
                    }[s]
                  }
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {transition && (
        <Modal
          title={`${transition.status.replaceAll('_', ' ')} appointment?`}
          onClose={() => setTransition(null)}
        >
          <SaveForm
            path={`/bookings/${transition.booking.id}/status`}
            method="PATCH"
            onClose={() => setTransition(null)}
            onSaved={() => {
              notify('Appointment status updated.')
              setTransition(null)
              setSelected(null)
              reload()
            }}
            label="Update appointment"
          >
            <input type="hidden" name="status" value={transition.status} />
            {['cancelled', 'rejected', 'no_show'].includes(transition.status) ? (
              <Field label="Reason">
                <textarea name="reason" required maxLength={500} rows={3} />
              </Field>
            ) : (
              <p className="muted">
                This updates the saved appointment status for {transition.booking.animal.name}.
              </p>
            )}
          </SaveForm>
        </Modal>
      )}
    </>
  )
}

function BookingForm({ booking, initialPet, onClose, onSaved }) {
  const { notify, now } = useSession()
  const options = useResource('/options')
  const [chosenDate, setChosenDate] = useState(localInput(booking?.starts_at).slice(0, 10))
  const [chosenTime, setChosenTime] = useState(localInput(booking?.starts_at))
  const today = dayKey(now)
  const validDate = chosenDate >= today && new Date(`${chosenDate}T00:00:00Z`).getUTCDay() !== 0
  const availability = useResource(
    validDate
      ? `/availability?date=${chosenDate}${booking ? `&booking_id=${booking.id}` : ''}`
      : null,
  )
  const slots =
    !availability.loading && !availability.error
      ? (availability.data?.data || []).filter((slot) => new Date(slot.starts_at) > now)
      : []
  const selectedSlot = slots.find((slot) => localInput(slot.starts_at) === chosenTime)
  return (
    <Modal
      title={booking ? 'Make a little change of plans' : 'Plan a little time for care'}
      subtitle="Your clinic will review and confirm the request."
      onClose={onClose}
      wide
    >
      {options.loading ? (
        <Spinner />
      ) : options.error ? (
        <ErrorBox error={options.error} retry={options.reload} />
      ) : (
        <SaveForm
          path={booking ? `/bookings/${booking.id}` : '/bookings'}
          method={booking ? 'PUT' : 'POST'}
          onClose={onClose}
          label={booking ? 'Save new time' : 'Request appointment'}
          disabled={!selectedSlot}
          onError={(error) => {
            if (error.errors?.starts_at) {
              setChosenTime('')
              availability.reload()
            }
          }}
          onSaved={() => {
            notify(booking ? 'Appointment rescheduled.' : 'Your visit request is on its way.')
            onSaved()
          }}
          transform={(v) => ({
            ...v,
            starts_at: selectedSlot?.starts_at,
            ends_at: selectedSlot?.ends_at,
          })}
        >
          <div className="form-grid">
            <Field label="Patient">
              <select
                name="animal_id"
                defaultValue={booking?.animal_id || initialPet || ''}
                required
              >
                {booking ? (
                  <option value={booking.animal_id}>{booking.animal.name}</option>
                ) : (
                  <>
                    <option value="">Choose a pet</option>
                    {options.data.animals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.guardian?.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </Field>
            <Field label="Service">
              <select name="service" defaultValue={booking?.service || 'Consultation'}>
                {services.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="booking-schedule-grid">
            <BookingDatePicker
              value={chosenDate}
              today={today}
              onChange={(day) => {
                setChosenDate(day)
                setChosenTime('')
              }}
            />
            <fieldset className="booking-time-picker">
              <legend>Choose time</legend>
              {!validDate ? (
                <p className="muted">Choose a date to see available times.</p>
              ) : availability.loading ? (
                <p className="muted" role="status">
                  Loading available times…
                </p>
              ) : availability.error ? (
                <ErrorBox error={availability.error} retry={availability.reload} />
              ) : slots.length ? (
                <>
                  <p className="muted">Each appointment is 15 minutes.</p>
                  {[
                    ['Morning · 8 AM–12 noon', true],
                    ['Afternoon · 1–4:30 PM', false],
                  ].map(([label, morning]) => {
                    const times = slots.filter(
                      (slot) => Number(localInput(slot.starts_at).slice(11, 13)) < 12 === morning,
                    )
                    return (
                      <div className="booking-time-group" key={label}>
                        <h3>{label}</h3>
                        {times.length ? (
                          <div className="booking-time-grid">
                            {times.map((slot) => (
                              <label className="booking-time-option" key={slot.starts_at}>
                                <input
                                  type="radio"
                                  name="appointment_time"
                                  value={slot.starts_at}
                                  required
                                  checked={chosenTime === localInput(slot.starts_at)}
                                  onChange={() => setChosenTime(localInput(slot.starts_at))}
                                />
                                <span>{time(slot.starts_at)}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">No times available.</p>
                        )}
                      </div>
                    )
                  })}
                </>
              ) : (
                <p className="muted" role="status">
                  No times available on this date. Please choose another date.
                </p>
              )}
            </fieldset>
          </div>
          <Field label="Anything we should know?">
            <textarea
              name="notes"
              rows={3}
              maxLength={3000}
              defaultValue={booking?.notes || ''}
              placeholder="Let us know what your companion needs."
            />
          </Field>
          {!options.data.animals.length && !booking && (
            <p className="form-hint">Register a pet before requesting their first appointment.</p>
          )}
        </SaveForm>
      )}
    </Modal>
  )
}
