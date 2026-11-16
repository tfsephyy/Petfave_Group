import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Eye,
  EyeOff,
  Heart,
  PawPrint,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { api } from '../lib/api'
import { useSession } from '../lib/session'
import { Field, FormError, Logo } from '../components/ui'

export function Landing() {
  const { user, now } = useSession()
  return (
    <div className="landing">
      <nav className="public-nav">
        <Link to="/">
          <Logo />
        </Link>
        <div>
          <a href="#care">Our approach</a>
          <a href="#features">Made for you</a>
          <Link className="button secondary" to={user ? '/app' : '/login'}>
            {user ? 'Open workspace' : 'Sign in'}
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">
              <span className="live-dot" /> A LITTLE MORE CARE. A LOT MORE LOVE.
            </p>
            <h1>
              Big love for
              <br />
              little <span>companions.</span>
            </h1>
            <p className="hero-copy">
              From their first hello to a lifetime of happy, healthy moments. Keep your pet’s care
              connected with PetFave.
            </p>
            <div className="hero-actions">
              <Link to={user ? '/app' : '/register'} className="button">
                {user ? 'Go to your workspace' : 'Join the PetFave family'}
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="text-button">
                Clinic team sign in ↗
              </Link>
            </div>
            <div className="hero-trust">
              <ShieldCheck size={18} />
              <span>Private health records. Thoughtful, connected care.</span>
            </div>
          </div>
          <div className="hero-art" aria-label="Illustration of connected pet care">
            <div className="art-orbit" />
            <div className="art-orbit second" />
            <div className="pet-illustration">
              <div className="ear left" />
              <div className="ear right" />
              <div className="dog-face">
                <div className="dog-spot" />
                <span className="eye left" />
                <span className="eye right" />
                <span className="nose" />
                <span className="mouth" />
                <span className="cheek left" />
                <span className="cheek right" />
              </div>
              <div className="dog-body" />
              <div className="collar">
                <Heart size={18} fill="currentColor" />
              </div>
              <div className="dog-paw left" />
              <div className="dog-paw right" />
            </div>
            <div className="floating-card care-card">
              <span className="mini-icon">
                <Heart size={21} />
              </span>
              <div>
                <strong>Care that stays connected</strong>
                <small>Every visit. Every little milestone.</small>
              </div>
            </div>
            <div className="floating-card vaccine-card">
              <span className="success-icon">
                <ShieldCheck size={20} />
              </span>
              <div>
                <strong>A healthier, happier life</strong>
                <small>Preventive care, made simple</small>
              </div>
            </div>
            <span className="art-spark spark-one">✦</span>
            <span className="art-spark spark-two">✦</span>
            <PawPrint className="art-paw" size={35} />
          </div>
        </section>
        <section id="care" className="landing-intro">
          <p className="eyebrow">GOOD CARE STARTS WITH A CONNECTION</p>
          <h2>One happy place for their wellbeing.</h2>
          <p>
            Less paperwork. More tail wags. A shared space for pet parents and the people who care
            for them.
          </p>
        </section>
        <section id="features" className="feature-grid">
          {[
            [
              PawPrint,
              'Their story, all together',
              'Pet profiles, photos, and a health history that grows with them.',
            ],
            [
              CalendarCheck,
              'A little easier to plan',
              'Request visits, check availability, and keep up with every appointment.',
            ],
            [
              Stethoscope,
              'Care with the full picture',
              'Clinical records and vaccinations, securely shared by your clinic.',
            ],
          ].map(([Icon, title, text]) => (
            <article key={title}>
              <span className="feature-icon">
                <Icon size={26} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>
        <section className="landing-cta">
          <div>
            <p className="eyebrow">HERE FOR EVERY CHAPTER</p>
            <h2>Their next healthy chapter starts here.</h2>
          </div>
          <Link to="/register" className="button">
            Create your account
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <Logo />
        <span>Made for the ones who make our lives better.</span>
        <span>© {now.getFullYear()} PetFave</span>
      </footer>
    </div>
  )
}

export function AuthPage({ mode = 'login' }) {
  const { user, setUser, notify } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  if (user) return <Navigate to="/app" replace />
  const register = mode === 'register',
    forgot = mode === 'forgot',
    reset = mode === 'reset'
  const title = register
    ? 'A happy start.'
    : forgot
      ? 'Let’s get you back in.'
      : reset
        ? 'A fresh start.'
        : 'Welcome back.'
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const values = Object.fromEntries(new FormData(event.currentTarget))
    values.email = values.email.trim().toLowerCase()
    if (reset) values.token = params.get('token')
    try {
      const data = await api(
        register ? '/register' : forgot ? '/forgot-password' : reset ? '/reset-password' : '/login',
        { method: 'POST', body: values },
      )
      if (forgot) setSent(true)
      else if (reset) {
        notify('Your password has been reset. You can sign in now.')
        navigate('/login')
      } else {
        setUser(data.user)
        navigate('/app')
      }
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Link to="/">
          <Logo />
        </Link>
        <div>
          <span className="story-label">
            <Heart size={17} /> A LITTLE LOVE GOES A LONG WAY
          </span>
          <h1>
            For their health.
            <br />
            For your peace
            <br />
            of mind.
          </h1>
          <p>A connected care journey for your favorite companion, and the people who love them.</p>
          <div className="story-paw">
            <PawPrint size={100} strokeWidth={1} />
            <Heart size={38} />
          </div>
        </div>
        <span className="auth-caption">Thoughtfully built around better pet care.</span>
      </aside>
      <main className="auth-main">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to PetFave
        </Link>
        <div className="auth-form">
          <span className="auth-greeting">
            <PawPrint size={25} />
          </span>
          <h1>{title}</h1>
          <p className="muted">
            {register
              ? 'Create your pet parent account and keep their care close.'
              : forgot
                ? 'We’ll send a secure password reset link to your email.'
                : reset
                  ? 'Choose a strong password to protect your account.'
                  : 'Sign in to your little corner of PetFave.'}
          </p>
          {sent ? (
            <div className="success-box">
              If an account matches that email, a reset link will arrive shortly. Check your inbox
              and spam folder.
            </div>
          ) : (
            <form onSubmit={submit}>
              <FormError error={error} />
              {register && (
                <Field label="Full name">
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    placeholder="Your full name"
                  />
                </Field>
              )}
              <Field label="Email address">
                <input
                  name="email"
                  type="email"
                  defaultValue={reset ? params.get('email') || '' : ''}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  maxLength={254}
                />
              </Field>
              {!forgot && (
                <Field
                  label="Password"
                  hint={
                    register || reset
                      ? 'At least 12 characters, with uppercase, lowercase, and a number.'
                      : undefined
                  }
                >
                  <div className="password-input">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={register || reset ? 'new-password' : 'current-password'}
                      required
                      minLength={register || reset ? 12 : 1}
                      maxLength={128}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
              )}
              {(register || reset) && (
                <Field label="Confirm password">
                  <input
                    name="password_confirmation"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    placeholder="One more time"
                  />
                </Field>
              )}
              {!register && !forgot && !reset && (
                <div className="auth-options">
                  <span>
                    <ShieldCheck size={14} /> Secure session
                  </span>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              )}
              <button className="button full" disabled={busy}>
                {busy
                  ? 'One moment…'
                  : register
                    ? 'Create your account'
                    : forgot
                      ? 'Send reset link'
                      : reset
                        ? 'Reset password'
                        : 'Sign in'}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          <p className="auth-switch">
            {register
              ? 'Already part of the family?'
              : forgot || reset
                ? 'Remember your password?'
                : 'New to PetFave?'}{' '}
            <Link to={register || forgot || reset ? '/login' : '/register'}>
              {register || forgot || reset ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <div className="auth-privacy">
            <ShieldCheck size={15} /> Your pet’s information stays private and protected.
          </div>
        </div>
        <span className="auth-bottom">PetFave · Better together, healthier forever.</span>
      </main>
    </div>
  )
}
