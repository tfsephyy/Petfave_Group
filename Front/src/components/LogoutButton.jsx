import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { api } from '../lib/api'
import { useSession } from '../lib/session'
import { Confirm } from './ui'

export default function LogoutButton({ className = 'button secondary', label = 'Log out' }) {
  const { setUser } = useSession()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <button type="button" className={className} onClick={() => setConfirming(true)}>
        <LogOut size={18} /> {label}
      </button>
      {confirming && (
        <Confirm
          title="Log out?"
          message="Are you sure you want to log out? You'll need to sign in again to access your account."
          label="Log out"
          cancelLabel="Cancel"
          busyLabel="Logging out…"
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await api('/logout', { method: 'POST' })
            setUser(null)
            navigate('/login', { replace: true })
          }}
        />
      )}
    </>
  )
}
