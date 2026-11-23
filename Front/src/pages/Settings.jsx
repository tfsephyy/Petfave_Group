import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, Mail, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { useSession } from '../lib/session'
import { date } from '../lib/api'
import { useResource } from '../lib/hooks'
import { SaveForm } from '../components/forms'
import LogoutButton from '../components/LogoutButton'
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHead,
  Pagination,
  Spinner,
} from '../components/ui'

export function AccountSettings() {
  const { user, setUser, notify, theme, setTheme } = useSession()
  const [passwordForm, setPasswordForm] = useState(0)
  const [closing, setClosing] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <PageHead
        eyebrow="A LITTLE SPACE THAT’S ALL YOURS"
        title="Account settings"
        description="Keep your details up to date and your account protected."
      />
      <div className="settings-grid">
        <div>
          <section className="panel settings-panel">
            <div className="settings-title">
              <span className="mini-icon">
                <UserRound size={21} />
              </span>
              <div>
                <h2>Your details</h2>
                <p>One profile, kept in sync with your contact record.</p>
              </div>
              <Badge tone="active">{user.role}</Badge>
            </div>
            <SaveForm
              path="/settings/profile"
              method="PUT"
              onClose={() => notify('Your profile has not been changed.')}
              onSaved={(data) => {
                setUser(data.user)
                notify('Your details are up to date.')
              }}
              label="Save profile"
              transform={(v) => ({ ...v, email: v.email.toLowerCase() })}
            >
              <div className="form-grid">
                <Field label="Full name">
                  <input
                    name="name"
                    defaultValue={user.name}
                    required
                    maxLength={120}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email address">
                  <input
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    required
                    maxLength={254}
                    autoComplete="email"
                  />
                </Field>
                {user.guardian && (
                  <>
                    <Field label="Phone">
                      <input
                        name="phone"
                        defaultValue={user.guardian.phone || ''}
                        maxLength={40}
                        autoComplete="tel"
                      />
                    </Field>
                    <Field label="Address">
                      <input
                        name="address"
                        defaultValue={user.guardian.address || ''}
                        maxLength={500}
                        autoComplete="street-address"
                      />
                    </Field>
                  </>
                )}
              </div>
              <Field label="Current password" hint="Required when changing your email address.">
                <input name="current_password" type="password" autoComplete="current-password" />
              </Field>
            </SaveForm>
          </section>
          <section className="panel settings-panel">
            <div className="settings-title">
              <span className="mini-icon">
                <KeyRound size={21} />
              </span>
              <div>
                <h2>A stronger front door</h2>
                <p>Change your password and sign out other browser sessions.</p>
              </div>
            </div>
            <SaveForm
              key={passwordForm}
              path="/settings/password"
              method="PUT"
              onClose={() => setPasswordForm((v) => v + 1)}
              onSaved={() => {
                notify('Password changed. Other sessions have been signed out.')
                setPasswordForm((v) => v + 1)
              }}
              label="Update password"
            >
              <Field label="Current password">
                <input
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <div className="form-grid">
                <Field
                  label="New password"
                  hint="At least 12 characters, uppercase, lowercase, and a number."
                >
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </Field>
              </div>
            </SaveForm>
          </section>
        </div>
        <aside>
          <section className="panel settings-panel">
            <div className="settings-title">
              <span className="mini-icon">
                <ShieldCheck size={21} />
              </span>
              <h2>In good hands</h2>
            </div>
            <p className="muted">
              Your health records are shared with your clinic’s care team. Pet parents can only
              access their own pets and appointments.
            </p>
            <div className="security-point">
              <ShieldCheck size={17} />
              <span>Protected session sign-in</span>
            </div>
            <div className="security-point">
              <Mail size={17} />
              <span>Secure password recovery</span>
            </div>
          </section>
          <section className="panel settings-panel">
            <h2>Make yourself at home</h2>
            <p className="muted">Choose the look that feels right.</p>
            <div className="theme-options">
              <button
                className={theme === 'light' ? 'selected' : ''}
                onClick={() => setTheme('light')}
              >
                <Sun size={21} />
                Light
              </button>
              <button
                className={theme === 'dark' ? 'selected' : ''}
                onClick={() => setTheme('dark')}
              >
                <Moon size={21} />
                Dark
              </button>
            </div>
          </section>
          <section className="panel settings-panel">
            <div className="settings-title">
              <span className="mini-icon">
                <LogOut size={21} />
              </span>
              <h2>Your session</h2>
            </div>
            <p className="muted">Log out when you're finished using this browser.</p>
            <LogoutButton className="button secondary full settings-logout-button" />
          </section>
          {user.role === 'owner' && (
            <section className="panel settings-panel">
              <h2>Close your portal account</h2>
              <p className="muted">
                This disables portal sign-in. The clinic keeps medical records and existing
                appointments so care can continue. Contact your clinic about upcoming visits.
              </p>
              <button className="text-button close-account-button" onClick={() => setClosing(true)}>
                Close my account
              </button>
            </section>
          )}
        </aside>
      </div>
      {closing && (
        <Modal
          title="Close your portal account?"
          subtitle="Your clinic records will be retained. This disables your sign-in."
          onClose={() => setClosing(false)}
        >
          <SaveForm
            path="/settings/account"
            method="DELETE"
            onClose={() => setClosing(false)}
            label="Close my account"
            onSaved={() => {
              setUser(null)
              notify('Your portal account has been closed.')
              navigate('/login')
            }}
          >
            <Field label="Confirm your password">
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
          </SaveForm>
        </Modal>
      )}
    </>
  )
}
export function AuditLog() {
  const [page, setPage] = useState(1),
    [view, setView] = useState(null)
  const { data, error, loading, reload } = useResource(`/audit?page=${page}`)
  return (
    <>
      <PageHead
        eyebrow="THOUGHTFUL CARE. CLEAR ACCOUNTABILITY."
        title="The audit trail"
        description="A preserved history of access, clinical corrections, and important changes."
      />
      <section className="panel">
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Spinner />
        ) : data?.data?.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Record</th>
                    <th>Performed by</th>
                    <th>When</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <Badge tone="neutral">
                          {e.action.replaceAll('.', ' · ').replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td>
                        <strong>{e.subject_type}</strong>
                        <small>
                          {e.subject_id?.length > 12
                            ? `PF-${e.subject_id.slice(-8)}`
                            : e.subject_id}
                        </small>
                      </td>
                      <td>{e.actor?.name || 'System / account setup'}</td>
                      <td>{date(e.created_at, { hour: 'numeric', minute: '2-digit' })}</td>
                      <td>
                        {e.changes && (
                          <button className="button secondary small" onClick={() => setView(e)}>
                            View details
                          </button>
                        )}
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
              title="Every action, accounted for"
              text="Important activity will appear here as your clinic grows."
            />
          )
        )}
      </section>
      {view && (
        <Modal title="Activity details" subtitle={view.action} onClose={() => setView(null)} wide>
          <pre className="audit-details">{JSON.stringify(view.changes, null, 2)}</pre>
        </Modal>
      )}
    </>
  )
}
