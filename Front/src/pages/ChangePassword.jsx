import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SaveForm } from '../components/forms'
import { Field, PageHead } from '../components/ui'
import { useSession } from '../lib/session'

export default function ChangePassword() {
  const { setUser, notify } = useSession()
  const navigate = useNavigate()
  return (
    <>
      <PageHead
        eyebrow="WELCOME TO PETFAVE"
        title="Set your password"
        description="Replace your temporary password with a password only you know."
      />
      <section className="panel settings-panel password-setup-panel">
        <div className="settings-title">
          <span className="mini-icon">
            <KeyRound size={21} />
          </span>
          <h2>Make this account yours</h2>
        </div>
        <SaveForm
          path="/settings/password"
          method="PUT"
          label="Save password and continue"
          showCancel={false}
          onSaved={(data) => {
            setUser(data.user)
            notify('Your password is set. Welcome to PetFave.')
            navigate('/app', { replace: true })
          }}
        >
          <Field label="Temporary password">
            <input
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </Field>
          <Field
            label="New password"
            hint="At least 12 characters, uppercase, lowercase, and a number."
          >
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </Field>
        </SaveForm>
      </section>
    </>
  )
}
