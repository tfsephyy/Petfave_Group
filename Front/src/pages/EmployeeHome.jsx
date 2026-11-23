import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, UserRound } from 'lucide-react'
import { useSession } from '../lib/session'
import { Badge, PageHead } from '../components/ui'

export default function EmployeeHome() {
  const { user } = useSession()
  return (
    <>
      <PageHead
        eyebrow="YOUR PLACE ON THE TEAM"
        title="Employee workspace"
        description={`Welcome, ${user.name}. Your employee account is ready.`}
      />
      <div className="employee-home-grid">
        <section className="panel settings-panel">
          <div className="settings-title">
            <span className="mini-icon">
              <UserRound size={21} />
            </span>
            <h2>Your account</h2>
            <Badge tone="active">Active</Badge>
          </div>
          <dl className="details-grid">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>
          <Link className="button secondary employee-settings-link" to="/app/settings">
            Account settings <ArrowRight size={16} />
          </Link>
        </section>
        <section className="panel settings-panel">
          <div className="settings-title">
            <span className="mini-icon">
              <ShieldCheck size={21} />
            </span>
            <h2>Your access</h2>
          </div>
          <p className="muted">
            You can manage your profile and password. Clinic features will appear here when your
            administrator assigns access.
          </p>
        </section>
      </div>
    </>
  )
}
