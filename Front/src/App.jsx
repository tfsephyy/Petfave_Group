import { useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Heart,
  LayoutDashboard,
  KeyRound,
  Menu,
  Package,
  PawPrint,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import { SessionProvider } from './lib/context'
import { useSession } from './lib/session'
import { date } from './lib/api'
import { useResource } from './lib/hooks'
import { Empty, ErrorBox, Logo, Spinner } from './components/ui'
import { AuthPage, Landing } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import { Animals, AnimalDetail } from './pages/Animals'
import Guardians from './pages/Guardians'
import Appointments from './pages/Appointments'
import Inventory from './pages/Inventory'
import { AccountSettings, AuditLog } from './pages/Settings'
import ThemeToggle from './components/ThemeToggle'
import LogoutButton from './components/LogoutButton'
import Employees from './pages/Employees'
import EmployeeHome from './pages/EmployeeHome'
import ChangePassword from './pages/ChangePassword'
import './App.css'
import './design.css'
import './public.css'

function Workspace() {
  const { user, loading, staff, now } = useSession()
  const [sidebar, setSidebar] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const location = useLocation()
  const employee = user?.role === 'employee'
  const restricted = employee || user?.must_change_password
  const alerts = useResource(user && !restricted ? '/dashboard' : null)
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password && location.pathname !== '/app/change-password')
    return <Navigate to="/app/change-password" replace />
  if (!user.must_change_password && location.pathname === '/app/change-password')
    return <Navigate to="/app" replace />
  if (employee && !['/app', '/app/settings', '/app/change-password'].includes(location.pathname))
    return <Navigate to="/app" replace />
  const navigation = user.must_change_password
    ? [[KeyRound, 'Set your password', '/app/change-password']]
    : employee
      ? [[LayoutDashboard, 'Overview', '/app']]
      : [
          [LayoutDashboard, 'Overview', '/app'],
          ...(staff ? [[Users, 'Pet parents', '/app/guardians']] : []),
          [PawPrint, staff ? 'Patients' : 'My pets', '/app/pets'],
          [CalendarDays, 'Appointments', '/app/appointments'],
          ...(staff ? [[Package, 'Inventory', '/app/inventory']] : []),
          ...(user.role === 'admin' ? [[ClipboardList, 'Audit trail', '/app/audit']] : []),
          ...(user.role === 'admin' ? [[UsersRound, 'Employees', '/app/employees']] : []),
        ]
  const current =
    navigation.find(([, , path]) =>
      path === '/app' ? location.pathname === path : location.pathname.startsWith(path),
    )?.[1] || 'Account settings'
  const due = alerts.data?.due_records || []
  return (
    <div className="workspace">
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`sidebar ${sidebar ? 'open' : ''}`}
        aria-label="Workspace sidebar"
        tabIndex={0}
      >
        <Link to="/" className="sidebar-brand">
          <Logo />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close menu"
          onClick={() => setSidebar(false)}
        >
          <X size={20} />
        </button>
        <div className="clinic-switch">
          <span className="clinic-icon">
            <Heart size={20} />
          </span>
          <div>
            <strong>PetFave Clinic</strong>
            <small>
              {employee ? 'Employee workspace' : staff ? 'Clinic workspace' : 'Pet parent portal'}
            </small>
          </div>
          <ShieldCheck size={16} />
        </div>
        <p className="nav-label">
          {employee ? 'YOUR WORKSPACE' : staff ? 'WORKSPACE' : 'YOUR LITTLE WORLD'}
        </p>
        <nav>
          {navigation.map(([Icon, label, path]) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/app'}
              onClick={() => setSidebar(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === 'Appointments' && alerts.data?.stats?.today > 0 && (
                <span className="nav-count">{alerts.data.stats.today}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!user.must_change_password && (
            <NavLink to="/app/settings" className="nav-link" onClick={() => setSidebar(false)}>
              <Settings size={19} /> Account settings
            </NavLink>
          )}
          <LogoutButton className="nav-link" label="Sign out" />
          <div className="sidebar-footer">
            <span className="live-dot" /> Connected with care
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{current}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="clinic-date">{date(now, { weekday: 'short' })}</span>
            <ThemeToggle compact />
            {!restricted && (
              <div className="notification-wrap">
                <button
                  className="icon-button notification-button"
                  aria-label="Care reminders"
                  aria-expanded={notifications}
                  onClick={() => setNotifications((v) => !v)}
                >
                  <Bell size={19} />
                  {due.length > 0 && <span />}
                </button>
                {notifications && (
                  <div className="notification-panel">
                    <h3>Care reminders</h3>
                    {due.length ? (
                      due.map((record) => (
                        <Link
                          key={record.id}
                          to={`/app/pets/${record.animal_id}`}
                          onClick={() => setNotifications(false)}
                        >
                          <span className="mini-icon">
                            <Heart size={16} />
                          </span>
                          <div>
                            <strong>
                              {record.animal?.name} · {record.title}
                            </strong>
                            <small>Due {date(record.due_on)}</small>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <Empty
                        title="All caught up"
                        text="Upcoming preventive care reminders will appear here."
                      />
                    )}
                  </div>
                )}
              </div>
            )}
            <Link
              to={user.must_change_password ? '/app/change-password' : '/app/settings'}
              className="user-menu"
            >
              <span className="avatar">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.role.replaceAll('_', ' ')}</small>
              </span>
              <ChevronDown size={15} />
            </Link>
          </div>
        </header>
        <main className="content" key={location.pathname}>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>With a little care, great things grow.</span>
          <span>PetFave · Asia/Manila</span>
        </footer>
      </div>
    </div>
  )
}

function WorkspaceHome() {
  const { user } = useSession()
  return user.role === 'employee' ? <EmployeeHome /> : <Dashboard />
}

function Guard({ children, admin = false }) {
  const { staff, user } = useSession()
  return (admin ? user?.role === 'admin' : staff) ? children : <Navigate to="/app" replace />
}
function AppRoutes() {
  const { connectionError, refreshSession } = useSession()
  if (connectionError)
    return (
      <div className="connection-screen">
        <Logo />
        <h1>Let’s reconnect.</h1>
        <ErrorBox error={connectionError} retry={refreshSession} />
      </div>
    )
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/reset-password" element={<AuthPage mode="reset" />} />
      <Route path="/app" element={<Workspace />}>
        <Route index element={<WorkspaceHome />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route
          path="employees"
          element={
            <Guard admin>
              <Employees />
            </Guard>
          }
        />
        <Route path="pets" element={<Animals />} />
        <Route path="pets/:id" element={<AnimalDetail />} />
        <Route
          path="guardians"
          element={
            <Guard>
              <Guardians />
            </Guard>
          }
        />
        <Route path="appointments" element={<Appointments />} />
        <Route
          path="inventory"
          element={
            <Guard>
              <Inventory />
            </Guard>
          }
        />
        <Route path="settings" element={<AccountSettings />} />
        <Route
          path="audit"
          element={
            <Guard admin>
              <AuditLog />
            </Guard>
          }
        />
      </Route>
      <Route
        path="*"
        element={
          <div className="connection-screen">
            <Logo />
            <Empty
              title="This path wandered off."
              text="Let’s get you back to a familiar place."
              action={
                <Link className="button" to="/app">
                  Back to your workspace
                </Link>
              }
            />
          </div>
        }
      />
    </Routes>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  )
}
