import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  Heart,
  Package,
  PawPrint,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useSession } from '../lib/session'
import { date, time } from '../lib/api'
import { useResource } from '../lib/hooks'
import { Badge, Empty, ErrorBox, PageHead, PetAvatar, Spinner } from '../components/ui'

export default function Dashboard() {
  const { user, staff, now } = useSession()
  const { data, error, loading, reload } = useResource('/dashboard')
  if (loading) return <Spinner />
  if (error) return <ErrorBox error={error} retry={reload} />
  const stats = staff
    ? [
        [Users, 'Active pet parents', data.stats.guardians, 'Families in our care', 'peach'],
        [
          PawPrint,
          'Registered patients',
          data.stats.animals,
          'A little love for every pet',
          'green',
        ],
        [
          CalendarDays,
          'Today’s appointments',
          data.stats.today,
          'Scheduled and completed today',
          'purple',
        ],
        [Package, 'Low-stock products', data.stats.low_stock, 'At or below reorder level', 'blue'],
      ]
    : [
        [PawPrint, 'My companions', data.stats.animals, 'Their care, all in one place', 'green'],
        [CalendarDays, 'Upcoming visits', data.stats.upcoming, 'Pending and confirmed', 'purple'],
        [ShieldCheck, 'Care reminders', data.stats.due, 'Due within 30 days or overdue', 'peach'],
      ]
  const max = Math.ceil(Math.max(1, ...data.series.map((s) => s.bookings)) / 4) * 4
  const hour = Number(
    new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Manila',
    }).format(now),
  )
  return (
    <>
      <PageHead
        eyebrow="A NEW DAY TO MAKE A DIFFERENCE"
        title={`Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]}.`}
        description={
          staff
            ? 'Here’s a little look at what’s happening at your clinic.'
            : 'A happy, healthy home for all your pet’s care.'
        }
      >
        <Link className="button" to="/app/appointments?new=1">
          <Plus size={17} /> New appointment
        </Link>
      </PageHead>
      <section className="welcome-banner">
        <div>
          <span className="banner-tag">
            <Sparkles size={13} /> BETTER CARE, TOGETHER
          </span>
          <h2>{staff ? 'Small moments. Healthier lives.' : 'Their wellbeing, a little closer.'}</h2>
          <p>
            {staff
              ? 'Every visit is a chance to make a tail wag. Let’s make today a good one.'
              : 'Keep their stories together, plan their next visit, and celebrate every milestone.'}
          </p>
          <Link to="/app/pets">
            {staff ? 'Meet your patients' : 'Meet your companions'}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="banner-art">
          <span className="banner-circle" />
          <PawPrint size={85} strokeWidth={1.4} />
          <Heart className="banner-heart" size={30} fill="currentColor" />
          <span className="banner-star">✦</span>
        </div>
      </section>
      <div className={`stats-grid ${staff ? '' : 'three'}`}>
        {stats.map(([Icon, label, value, caption, tone]) => (
          <article className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={20} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>
              <span className={`tiny-dot ${tone}`} />
              {caption}
            </small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Care at a glance</h2>
              <p>Appointments over the last six months</p>
            </div>
            <span className="period-pill">
              Last 6 months <ArrowDownRight size={14} />
            </span>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-bookings" /> All bookings
            </span>
            <span>
              <i className="legend-completed" /> Completed visits
            </span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={data.series
              .map((s) => `${s.label}: ${s.bookings} bookings, ${s.completed} completed`)
              .join('; ')}
          >
            <div className="chart-lines">
              {[1, 0.75, 0.5, 0.25, 0].map((t) => (
                <span key={t}>
                  <small>{Math.ceil(max * t)}</small>
                </span>
              ))}
            </div>
            <div className="chart-bars">
              {data.series.map((s) => (
                <div
                  className="chart-group"
                  key={s.label}
                  title={`${s.label}: ${s.bookings} bookings, ${s.completed} completed`}
                >
                  <div>
                    <span
                      className="bar bookings"
                      style={{ height: `${(s.bookings / max) * 100}%` }}
                    />
                    <span
                      className="bar completed"
                      style={{ height: `${(s.completed / max) * 100}%` }}
                    />
                  </div>
                  <small>{s.label.split(' ')[0]}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel reminders-panel">
          <div className="panel-heading">
            <div>
              <h2>A little heads-up</h2>
              <p>Small things that deserve attention</p>
            </div>
            <span className="soft-icon">
              <BellIcon />
            </span>
          </div>
          {!data.due_records.length && !data.low_stock.length ? (
            <Empty title="Looking good" text="No care reminders or low-stock alerts right now." />
          ) : (
            <div className="reminders">
              {data.due_records.slice(0, 3).map((r) => (
                <Link to={`/app/pets/${r.animal_id}`} className="reminder" key={r.id}>
                  <span className="reminder-icon peach">
                    <ShieldCheck size={19} />
                  </span>
                  <div>
                    <strong>
                      {r.animal?.name} · {r.title}
                    </strong>
                    <small>Due {date(r.due_on)}</small>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))}
              {data.low_stock.slice(0, 2).map((p) => (
                <Link to="/app/inventory" className="reminder" key={p.id}>
                  <span className="reminder-icon blue">
                    <Package size={19} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.quantity} {p.unit} remaining · reorder at {p.reorder_level}
                    </small>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          )}
          <div className="care-note">
            <Heart size={17} />
            <span>A little prevention goes a long way.</span>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Coming up next</h2>
            <p>A few friendly faces we’re looking forward to seeing</p>
          </div>
          <Link className="text-button" to="/app/appointments">
            View appointments <ArrowRight size={16} />
          </Link>
        </div>
        {data.upcoming.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Pet parent</th>
                  <th>Visit</th>
                  <th>Date & time</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.upcoming.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link className="table-person" to={`/app/pets/${b.animal_id}`}>
                        <PetAvatar animal={b.animal} />
                        <span>
                          <strong>{b.animal.name}</strong>
                          <small>{b.animal.species?.name}</small>
                        </span>
                      </Link>
                    </td>
                    <td>{b.animal.guardian?.name}</td>
                    <td>{b.service}</td>
                    <td>
                      <strong className="table-date">{date(b.starts_at)}</strong>
                      <small>
                        {time(b.starts_at)} – {time(b.ends_at)}
                      </small>
                    </td>
                    <td>
                      <Badge>{b.status}</Badge>
                    </td>
                    <td>
                      <Link
                        to="/app/appointments"
                        className="icon-button"
                        aria-label={`View appointment for ${b.animal.name}`}
                      >
                        <ArrowRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Room for a little care"
            text="New appointment requests will appear here."
            action={
              <Link to="/app/appointments?new=1" className="button secondary">
                Schedule a visit
              </Link>
            }
          />
        )}
      </section>
      <section>
        <div className="section-heading">
          <h2>{staff ? 'New to the family' : 'Your little family'}</h2>
          <Link to="/app/pets" className="text-button">
            All {staff ? 'patients' : 'pets'}
            <ArrowRight size={16} />
          </Link>
        </div>
        {data.recent_animals.length ? (
          <div className="recent-pets">
            {data.recent_animals.map((p) => (
              <Link to={`/app/pets/${p.id}`} key={p.id} className="recent-pet">
                <PetAvatar animal={p} size="large" />
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.breed?.name || p.species?.name}</p>
                  <small>{p.guardian?.name}</small>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="Every companion has a story"
            text="Register a pet to start their care journey."
            action={
              <Link to="/app/pets?new=1" className="button secondary">
                <Plus size={16} /> Add a pet
              </Link>
            }
          />
        )}
      </section>
    </>
  )
}
function BellIcon() {
  return <Heart size={20} />
}
