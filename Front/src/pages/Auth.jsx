import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  PawPrint,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { api } from '../lib/api'
import { useSession } from '../lib/session'
import { Field, FormError, Logo } from '../components/ui'
import ThemeToggle from '../components/ThemeToggle'
import carePhoto from '../assets/petfave-care.png'

const features = [
  {
    icon: PawPrint,
    title: 'Every pet. One profile.',
    text: 'Keep their details, photos, and important health information in one familiar place.',
  },
  {
    icon: CalendarCheck2,
    title: 'Make room for good care.',
    text: 'Request an appointment, check availability, and stay up to date with your next visit.',
  },
  {
    icon: ClipboardList,
    title: 'Their history, connected.',
    text: 'Follow vaccinations, treatments, and care instructions recorded by your clinic.',
  },
]

function CarePhoto({ className = '', eager = false }) {
  return (
    <img
      className={className}
      src={carePhoto}
      alt="A golden retriever receiving a gentle checkup from a veterinarian"
      width="1122"
      height="1402"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
    />
  )
}

export function Landing() {
  const { user, now } = useSession()
  return (
    <div className="landing-site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <nav className="site-nav" aria-label="Main navigation">
          <Link to="/" aria-label="PetFave home">
            <Logo />
          </Link>
          <div className="site-nav-links">
            <a href="#features">Why PetFave</a>
            <a href="#how-it-works">How it works</a>
            <a href="#for-clinics">For your clinic</a>
          </div>
          <div className="site-nav-actions">
            <ThemeToggle compact />
            <Link className="site-signin" to={user ? '/app' : '/login'}>
              {user ? 'My workspace' : 'Sign in'}
            </Link>
            <Link className="button nav-cta" to={user ? '/app' : '/register'}>
              {user ? 'Open workspace' : 'Get started'}
              <ArrowRight size={15} />
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="section-kicker">
              <span /> CONNECTED VETERINARY CARE
            </span>
            <h1>
              Good care starts with a little <span>connection.</span>
            </h1>
            <p>
              Appointments, health records, and everyday wellbeing. One thoughtful space for the
              pets you love and the clinic you trust.
            </p>
            <div className="landing-hero-actions">
              <Link className="button" to={user ? '/app' : '/register'}>
                {user ? 'Go to your workspace' : 'Create your account'}
                <ArrowRight size={18} />
              </Link>
              <a className="button secondary" href="#features">
                Explore PetFave
                <ChevronRight size={17} />
              </a>
            </div>
            <div className="hero-assurance">
              <span className="assurance-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>A little peace of mind, built in.</strong>
                <span>Your pet's records stay between you and your care team.</span>
              </div>
            </div>
          </div>
          <div className="landing-visual">
            <div className="hero-photo-frame">
              <CarePhoto eager />
              <span className="photo-label">
                <Heart size={15} /> Pet-first. Always.
              </span>
              <div className="photo-caption">
                <span>HERE FOR EVERY CHAPTER</span>
                <strong>
                  A familiar face.
                  <br />A healthier future.
                </strong>
              </div>
            </div>
            <div className="care-connection-card">
              <span className="connection-card-icon">
                <Stethoscope size={24} />
              </span>
              <div>
                <strong>Better care, together.</strong>
                <p>Your pet. Your clinic. Connected.</p>
              </div>
              <span className="connection-check">
                <Check size={17} />
              </span>
            </div>
            <div className="visual-caption">
              <span /> Thoughtfully designed around their wellbeing.
            </div>
          </div>
        </section>
        <div className="care-principles">
          {[
            [PawPrint, 'One place for every pet'],
            [ShieldCheck, 'Private by design'],
            [Stethoscope, 'Connected to your clinic'],
          ].map(([Icon, text]) => (
            <div key={text}>
              <Icon size={21} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <section id="features" className="landing-section">
          <div className="section-heading-public">
            <div>
              <span className="section-kicker">A SIMPLER WAY TO CARE</span>
              <h2>
                Less to manage.
                <br />
                <span>More time for them.</span>
              </h2>
            </div>
            <p>
              Stay close to what matters, with the practical tools that make looking after your
              companion feel a little easier.
            </p>
          </div>
          <div className="care-feature-grid">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <div className="feature-card-top">
                  <span className="feature-symbol">
                    <Icon size={25} strokeWidth={1.6} />
                  </span>
                  <span className="feature-index">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href="#how-it-works">
                  See how it works
                  <ArrowRight size={15} />
                </a>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="care-journey">
          <div className="journey-intro">
            <span className="section-kicker">A GOOD START. A SHARED JOURNEY.</span>
            <h2>
              From the first hello
              <br />
              to everyday care.
            </h2>
            <p>A few simple steps bring your pet's care into focus.</p>
            <Link to={user ? '/app' : '/register'} className="text-button">
              {user ? 'Open your workspace' : "Let\u2019s get you started"}
              <ArrowRight size={17} />
            </Link>
          </div>
          <ol className="journey-steps">
            {[
              [
                'Make yourself at home',
                'Create your pet parent account and introduce your companions.',
              ],
              [
                'Plan their next visit',
                "Choose a service and request a time with your clinic\u2019s care team.",
              ],
              [
                'Keep their story together',
                'Return to their health history, care instructions, and upcoming visits.',
              ],
            ].map(([title, text], i) => (
              <li key={title}>
                <span className="step-number">0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section id="for-clinics" className="clinic-intro-banner">
          <div className="clinic-banner-icon">
            <Stethoscope size={31} strokeWidth={1.6} />
          </div>
          <div>
            <span className="section-kicker">FOR THE PEOPLE BEHIND THE CARE</span>
            <h2>A clearer day at the clinic.</h2>
            <p>
              Patient records, appointments, and supplies, brought together in your clinic
              workspace.
            </p>
          </div>
          <Link to={user ? '/app' : '/login'} className="button secondary">
            Clinic team sign in
            <ArrowRight size={17} />
          </Link>
        </section>
        <section className="public-final-cta">
          <span className="section-kicker">CARE THAT FEELS A LITTLE CLOSER</span>
          <h2>
            The next chapter
            <br />
            starts with <span>you.</span>
          </h2>
          <p>Give their health story a home.</p>
          <Link to={user ? '/app' : '/register'} className="button">
            {user ? 'Open your workspace' : 'Create your account'}
            <ArrowRight size={18} />
          </Link>
          <span className="cta-footnote">For pet parents and their favorite companions.</span>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <Link to="/" aria-label="PetFave home">
            <Logo />
          </Link>
          <p>Better care. A little more connected.</p>
        </div>
        <div className="footer-links">
          <a href="#features">Why PetFave</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/login">Sign in</Link>
        </div>
        <span>© {now.getFullYear()} PetFave. All rights reserved.</span>
      </footer>
    </div>
  )
}

export function AuthPage({ mode = 'login' }) {
  const { user, setUser, notify, now, loading: sessionLoading } = useSession()
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
    ? 'Create account'
    : forgot
      ? 'Reset password'
      : reset
        ? 'New password'
        : 'Welcome back'
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
    <div className="auth-shell-compact">
      <header className="auth-compact-header">
        <Link to="/" aria-label="PetFave home">
          <Logo />
        </Link>
        <div>
          <Link to="/" className="auth-home-link">
            <ArrowLeft size={15} /> Home
          </Link>
          <ThemeToggle compact />
        </div>
      </header>
      <main className="auth-compact-stage">
        <section className="auth-compact-card" aria-labelledby="auth-title">
          <div className="auth-compact-card-top">
            <span className="auth-compact-icon">
              {forgot || reset ? (
                <LockKeyhole size={19} />
              ) : register ? (
                <PawPrint size={19} />
              ) : (
                <Stethoscope size={19} />
              )}
            </span>
            <div>
              <h1 id="auth-title">{title}</h1>
              <p className="auth-compact-sub">
                {register
                  ? 'Start with a few details below.'
                  : forgot
                    ? 'Enter your email to receive a reset link.'
                    : reset
                      ? 'Choose a strong password.'
                      : 'Sign in to your PetFave workspace.'}
              </p>
            </div>
          </div>
          {sent ? (
            <div className="success-box" role="status">
              <ShieldCheck size={20} />
              <strong>Check your inbox.</strong>
              <p>If an account matches that email, a reset link will arrive shortly.</p>
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
                    placeholder="Enter your full name"
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
                      ? '12+ chars, upper, lower & number.'
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
                      placeholder={
                        register || reset ? 'Create a strong password' : 'Enter your password'
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
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
                    placeholder="Re-enter your password"
                  />
                </Field>
              )}
              {!register && !forgot && !reset && (
                <div className="auth-form-options">
                  <span>
                    <LockKeyhole size={11} /> Secure sign-in
                  </span>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              )}
              <button className="button full auth-submit" disabled={busy || sessionLoading}>
                {sessionLoading
                  ? 'Connecting…'
                  : busy
                    ? 'One moment…'
                    : register
                      ? 'Create account'
                      : forgot
                        ? 'Send reset link'
                        : reset
                          ? 'Reset password'
                          : 'Sign in'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
          <div className="auth-switch-row">
            {register
              ? 'Already have an account?'
              : forgot || reset
                ? 'Remember your password?'
                : 'New to PetFave?'}{' '}
            <Link to={register || forgot || reset ? '/login' : '/register'}>
              {register || forgot || reset ? 'Sign in' : 'Create an account'}
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>
        <aside className="auth-compact-info" aria-label="About PetFave">
          <div className="auth-info-photo">
            <CarePhoto eager />
          </div>
          <div className="auth-info-copy">
            <h2>
              Their wellbeing.
              <br />
              <span>Your peace of mind.</span>
            </h2>
            <p>One shared space for the moments, milestones, and care that make a healthy life.</p>
          </div>
          <div className="auth-info-checks">
            <span>
              <Check size={14} /> Health records, together
            </span>
            <span>
              <Check size={14} /> Simpler appointment planning
            </span>
            <span>
              <Check size={14} /> Connected to your clinic
            </span>
          </div>
        </aside>
      </main>
      <footer className="auth-compact-footer">
        <span>© {now.getFullYear()} PetFave</span>
        <span>
          <LockKeyhole size={12} /> Private by design
        </span>
      </footer>
    </div>
  )
}
