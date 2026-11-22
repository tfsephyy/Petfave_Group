import { Moon, Sun } from 'lucide-react'
import { useSession } from '../lib/session'

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useSession()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? 'compact' : ''}`}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
      aria-pressed={dark}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      {!compact && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}
