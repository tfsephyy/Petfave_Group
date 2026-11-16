import { useEffect, useState } from 'react'
import { api } from './api'
import { SessionContext } from './session'

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [toast, setToast] = useState(null)
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem('petfave-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  )
  const refreshSession = async () => {
    try {
      const data = await api('/session')
      setUser(data.user)
      setConnectionError('')
    } catch {
      setConnectionError(
        'We could not reach the clinic server. Check that the backend is running and try again.',
      )
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    api('/session')
      .then((data) => setUser(data.user))
      .catch(() =>
        setConnectionError(
          'We could not reach the clinic server. Check that the backend is running and try again.',
        ),
      )
      .finally(() => setLoading(false))
    const expired = () => setUser(null)
    const timer = setInterval(() => setNow(new Date()), 60000)
    window.addEventListener('petfave:expired', expired)
    return () => {
      window.removeEventListener('petfave:expired', expired)
      clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('petfave-theme', theme)
  }, [theme])
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(id)
    }
  }, [toast])
  const notify = (message, type = 'success') => setToast({ message, type })
  return (
    <SessionContext.Provider
      value={{
        user,
        setUser,
        now,
        loading,
        connectionError,
        refreshSession,
        notify,
        theme,
        setTheme,
        staff: ['admin', 'veterinarian', 'receptionist'].includes(user?.role),
        clinician: ['admin', 'veterinarian'].includes(user?.role),
      }}
    >
      {children}
      {toast && (
        <div role="status" className={`toast ${toast.type}`} onClick={() => setToast(null)}>
          {toast.message}
        </div>
      )}
    </SessionContext.Provider>
  )
}
