import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Filter,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  Wand2,
  X
} from 'lucide-react'
import { demoApplications, internships } from './data/internships'
import type { Internship } from './types/internship'
import { signInStudent, signUpStudent, getFriendlyAuthError } from './lib/auth'
import { useAuth } from './hooks/useAuth'
import { DiscoverPage } from './pages/DiscoverPage'
import { Logo } from './components/Logo'
import { ProfilePage, type ProfileFormData } from './pages/ProfilePage'
import { profileCompletion } from './lib/profile'
import { listStudentApplications, type StudentApplication } from './lib/applications'
import { ApplicationsPage } from './pages/ApplicationsPage'

const domains = ['All', 'Software', 'Data', 'Design', 'Product', 'Marketing', 'Operations'] as const
const locations = ['All', 'Remote', 'Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Noida'] as const
const workModes = ['All', 'Remote', 'Hybrid', 'On-site'] as const
const sortOptions = ['Relevance', 'Newest', 'Stipend'] as const
const headlineLines = ['Find the right internship.', 'Build your career.']

type AuthMode = 'login' | 'signup'

const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function AuthScreen({ mode, onModeChange }: { mode: AuthMode; onModeChange: (mode: AuthMode) => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const result = await signUpStudent(fullName.trim(), email.trim(), password)
        if (result.needsEmailConfirmation) {
          setMessage('Account created. Please check your email to verify your account.')
        } else {
          navigateTo('/dashboard')
        }
      } else {
        await signInStudent(email.trim(), password)
        navigateTo('/dashboard')
      }
    } catch (requestError) {
      setError(getFriendlyAuthError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand-row">
          <a href="/" className="brand" onClick={(event) => { event.preventDefault(); navigateTo('/') }}>
            <span className="brand-mark"><Logo /></span>
            <span className="brand-text">AlgoIntern</span>
          </a>
          <span className="auth-note">Student workspace</span>
        </div>
        <div className="auth-card">
          <div className="section-kicker">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</div>
          <h1>{mode === 'login' ? 'Sign in to AlgoIntern' : 'Create your student account'}</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Pick up where you left off with your internship pipeline.' : 'Keep every opportunity and application in one focused workspace.'}
          </p>

          <form className="auth-form" onSubmit={submit} noValidate>
            {mode === 'signup' && (
              <label>
                Full name
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Your full name" />
              </label>
            )}
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" />
            </label>
            <label>
              Password
              <span className="password-field">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            {mode === 'signup' && (
              <label>
                Confirm password
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Repeat your password" />
              </label>
            )}

            {error && <p className="form-feedback error-feedback" role="alert">{error}</p>}
            {message && <p className="form-feedback success-feedback" role="status">{message}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? 'New to AlgoIntern?' : 'Already have an account?'}{' '}
            <button type="button" onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}

function Dashboard({ profile, onSignOut, onNavigate }: { profile: NonNullable<ReturnType<typeof useAuth>['profile']>; onSignOut: () => Promise<void>; onNavigate: (path: string) => void }) {
  const [signingOut, setSigningOut] = useState(false)
  const [applications, setApplications] = useState<StudentApplication[]>([])
  const [applicationSummary, setApplicationSummary] = useState({ total: 0, active: 0 })
  const displayName = profile.full_name?.split(' ')[0] || 'Student'
  const completion = profileCompletion(profile)

  useEffect(() => {
    let mounted = true
    void listStudentApplications(profile.id).then((items) => {
      if (!mounted) return
      setApplications(items)
      setApplicationSummary({ total: items.length, active: items.filter((item) => !['selected', 'rejected', 'withdrawn'].includes(item.status)).length })
    }).catch(() => undefined)
    return () => { mounted = false }
  }, [profile.id])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await onSignOut()
      navigateTo('/')
    } finally {
      setSigningOut(false)
    }
  }

  const journeySteps = [
    { title: 'Profile', hint: 'Complete your profile', done: completion === 100, path: '/profile' },
    { title: 'Discover', hint: 'Save or track a role', done: applications.length > 0, path: '/discover' },
    { title: 'Apply', hint: 'Submit an application', done: applications.some((item) => item.status !== 'saved'), path: '/discover' },
    { title: 'Interview', hint: 'Reach interview stage', done: applications.some((item) => item.status === 'interview' || item.status === 'selected'), path: '/applications' },
  ]
  const journeyDone = journeySteps.filter((step) => step.done).length
  const journeyNext = journeySteps.find((step) => !step.done)

  return (
    <div className="dashboard-page">
      <header className="topbar scrolled">
        <nav className="nav container" aria-label="Student navigation">
          <a href="/" className="brand" onClick={(event) => { event.preventDefault(); navigateTo('/') }}>
            <span className="brand-mark"><Logo /></span>
            <span className="brand-text">AlgoIntern</span>
          </a>
          <div className="nav-actions">
            <span className="dashboard-user">{profile.full_name || profile.email}</span>
            <button className="ghost-button desktop-only" type="button" onClick={() => onNavigate('/discover')}>Discover</button>
            <button className="ghost-button desktop-only" type="button" onClick={() => onNavigate('/applications')}>Applications</button>
            <button className="ghost-button desktop-only" type="button" onClick={() => onNavigate('/profile')}>Profile</button>
            <button className="ghost-button" type="button" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out...' : 'Log out'}
            </button>
          </div>
        </nav>
      </header>
      <main className="dashboard-main container">
        <div className="section-kicker">Student workspace</div>
        <h1>Good to see you, {displayName}.</h1>
        <p className="dashboard-lead">Your authenticated workspace is ready. This is the foundation for your profile, saved internships, and application pipeline.</p>
        <section className="journey-card" aria-label="Career journey">
          <div className="journey-head">
            <span className="card-label">Career Journey</span>
            <span className="journey-count">{journeyDone} of {journeySteps.length} complete</span>
          </div>
          <div className="journey-bar" role="progressbar" aria-valuenow={journeyDone} aria-valuemin={0} aria-valuemax={journeySteps.length} aria-label="Career journey progress">
            <span style={{ width: `${(journeyDone / journeySteps.length) * 100}%` }} />
          </div>
          <ol className="journey-steps">
            {journeySteps.map((step, index) => (
              <li key={step.title} className={step.done ? 'journey-step done' : 'journey-step'}>
                <span className="journey-dot">{step.done ? <Check size={13} /> : index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.done ? 'Completed' : step.hint}</span>
                </div>
              </li>
            ))}
          </ol>
          {journeyNext && (
            <div className="journey-foot">
              <span>Next up: {journeyNext.title} — {journeyNext.hint.toLowerCase()}.</span>
              <button className="secondary-button journey-cta" type="button" onClick={() => onNavigate(journeyNext.path)}>Continue <ChevronRight size={15} /></button>
            </div>
          )}
        </section>
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="card-label">Profile</span>
            <h2>{profile.full_name || 'Complete your profile'}</h2>
            <p>{profile.email || 'Your email is connected to this workspace.'}</p>
            <div className="dashboard-progress"><span style={{ width: `${completion}%` }} /></div>
            <span className="dashboard-status">{completion === 100 ? 'Profile complete' : `${completion}% complete`}</span>
            <button className="secondary-button" type="button" onClick={() => onNavigate('/profile')}>{completion === 100 ? 'Edit profile' : 'Complete profile'}</button>
          </div>
          <div className="dashboard-card">
            <span className="card-label">Workspace</span>
            <h2>Move with intention.</h2>
            <p>Discover internships, keep your profile current, and prepare for the next stage of your search.</p>
            <button className="secondary-button" type="button" onClick={() => onNavigate('/discover')}>Open explorer <ChevronRight size={15} /></button>
          </div>
          <div className="dashboard-card dashboard-application-card">
            <span className="card-label">Applications</span>
            <h2>{applicationSummary.total} tracked</h2>
            <p>{applicationSummary.active} active applications need your attention.</p>
            <button className="secondary-button" type="button" onClick={() => onNavigate('/applications')}>View applications <ChevronRight size={15} /></button>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const { user, profile, loading: authLoading, signOut, updateProfile } = useAuth()
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [loggingOut, setLoggingOut] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<(typeof domains)[number]>('All')
  const [selectedLocation, setSelectedLocation] = useState<(typeof locations)[number]>('All')
  const [selectedWorkMode, setSelectedWorkMode] = useState<(typeof workModes)[number]>('All')
  const [selectedSort, setSelectedSort] = useState<(typeof sortOptions)[number]>('Relevance')
  const [savedIds, setSavedIds] = useState<number[]>([2])
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null)
  const [selectedApplicationStatus, setSelectedApplicationStatus] = useState('All')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headlineReady, setHeadlineReady] = useState(false)

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const protectedPath = currentPath === '/dashboard' || currentPath === '/profile' || currentPath === '/discover' || currentPath === '/applications'
    if (!authLoading && !user && protectedPath) navigateTo('/login')
  }, [authLoading, currentPath, user])

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setHeadlineReady(true), 150)
    return () => window.clearTimeout(revealTimer)
  }, [])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll')

    if (revealElements[0]) revealElements[0].classList.add('is-visible')

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.01, rootMargin: '0px 0px -8% 0px' },
    )

    revealElements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [authLoading, currentPath])

  useEffect(() => {
    if (!selectedInternship) return

    const closeDialog = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedInternship(null)
    }

    window.addEventListener('keydown', closeDialog)
    return () => window.removeEventListener('keydown', closeDialog)
  }, [selectedInternship])

  const filteredInternships = useMemo(() => {
    const query = search.toLowerCase().trim()

    const results = internships.filter((internship) => {
      const matchesQuery =
        !query ||
        internship.title.toLowerCase().includes(query) ||
        internship.company.toLowerCase().includes(query) ||
        internship.skills.some((skill) => skill.toLowerCase().includes(query))

      const matchesDomain = selectedDomain === 'All' || internship.domain === selectedDomain
      const matchesLocation =
        selectedLocation === 'All' ||
        (selectedLocation === 'Remote' ? internship.workMode === 'Remote' : internship.location === selectedLocation)
      const matchesWorkMode = selectedWorkMode === 'All' || internship.workMode === selectedWorkMode

      return matchesQuery && matchesDomain && matchesLocation && matchesWorkMode
    })

    return [...results].sort((a, b) => {
      if (selectedSort === 'Newest') return a.postedDaysAgo - b.postedDaysAgo
      if (selectedSort === 'Stipend') return b.stipend - a.stipend
      return b.stipend - a.stipend + (a.postedDaysAgo - b.postedDaysAgo) * 2
    })
  }, [search, selectedDomain, selectedLocation, selectedWorkMode, selectedSort])

  const toggleSave = (id: number) => {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    )
  }

  const handleApply = () => {
    if (!selectedInternship) return
    window.alert('Demo application recorded locally.')
  }

  const statusFilters = ['All', 'Applied', 'Under Review', 'Shortlisted', 'Interview']
  const applicationCounts = statusFilters.reduce(
    (acc, status) => {
      acc[status] = status === 'All' ? demoApplications.length : demoApplications.filter((item) => item.status === status).length
      return acc
    },
    {} as Record<string, number>,
  )

  const visibleApplications =
    selectedApplicationStatus === 'All'
      ? demoApplications
      : demoApplications.filter((item) => item.status === selectedApplicationStatus)

  const handlePublicSignOut = async () => {
    setLoggingOut(true)
    try {
      await signOut()
    } finally {
      setLoggingOut(false)
    }
  }

  const saveProfile = async (data: ProfileFormData) => {
    setSavingProfile(true)
    try {
      await updateProfile({
        full_name: data.full_name.trim(),
        phone: data.phone.trim() || null,
        headline: data.headline.trim() || null,
        location: data.location.trim() || null,
        college: data.college.trim() || null,
        degree: data.degree.trim() || null,
        branch: data.branch.trim() || null,
        graduation_year: data.graduation_year ? Number(data.graduation_year) : null,
        cgpa: data.cgpa ? Number(data.cgpa) : null,
        bio: data.bio.trim() || null,
        skills: data.skills,
        interests: data.interests,
        preferred_domains: data.preferred_domains,
        preferred_locations: data.preferred_locations,
        preferred_work_modes: data.preferred_work_modes,
      })
    } finally {
      setSavingProfile(false)
    }
  }

  if (authLoading) {
    return <main className="auth-loading">Loading your workspace...</main>
  }

  if (currentPath === '/dashboard') {
    return user && profile
      ? <Dashboard profile={profile} onSignOut={signOut} onNavigate={navigateTo} />
      : <AuthScreen mode="login" onModeChange={(mode) => navigateTo(`/${mode}`)} />
  }

  if (currentPath === '/profile' || currentPath === '/discover' || currentPath === '/applications') {
    if (!user || !profile) return <AuthScreen mode="login" onModeChange={(mode) => navigateTo(`/${mode}`)} />
    if (currentPath === '/discover') return <DiscoverPage studentId={user.id} onBack={() => navigateTo('/dashboard')} />
    if (currentPath === '/applications') return <ApplicationsPage studentId={user.id} onBack={() => navigateTo('/dashboard')} />
    return <ProfilePage profile={profile} email={user.email ?? profile.email ?? ''} saving={savingProfile} onSave={saveProfile} onBack={() => navigateTo('/dashboard')} />
  }

  if (currentPath === '/login' || currentPath === '/signup') {
    if (user && profile) {
      navigateTo('/dashboard')
      return null
    }
    return <AuthScreen mode={currentPath === '/signup' ? 'signup' : 'login'} onModeChange={(mode) => navigateTo(`/${mode}`)} />
  }

  return (
    <div className="page-shell">
      <header className={`topbar ${isScrolled ? 'scrolled' : ''}`}>
        <nav className="nav container" aria-label="Main navigation">
          <a href="#top" className="brand" aria-label="AlgoIntern home">
            <span className="brand-mark"><Logo /></span>
            <span className="brand-text">AlgoIntern</span>
          </a>

          <div className="nav-center desktop-only">
            <a href="#discover">Discover</a>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
          </div>

          <div className="nav-actions desktop-only">
            {user ? (
              <>
                <button className="ghost-button" type="button" onClick={() => navigateTo('/dashboard')}>Dashboard</button>
                <button className="ghost-button" type="button" onClick={() => navigateTo('/discover')}>Discover</button>
                <button className="ghost-button" type="button" onClick={() => navigateTo('/applications')}>Applications</button>
                <button className="ghost-button" type="button" onClick={() => navigateTo('/profile')}>Profile</button>
                <button className="primary-button" type="button" onClick={handlePublicSignOut} disabled={loggingOut}>
                  {loggingOut ? 'Signing out...' : 'Log out'}
                </button>
              </>
            ) : (
              <>
                <button className="ghost-button" type="button" onClick={() => navigateTo('/login')}>
                  Sign in
                </button>
                <button className="primary-button" type="button" onClick={() => navigateTo('/signup')}>
                  Get started
                </button>
              </>
            )}
          </div>

          <button
            className="menu-button mobile-only"
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <Menu size={18} />
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a href="#discover" onClick={() => setMobileMenuOpen(false)}>Discover</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            {user ? (
              <>
                <button type="button" className="ghost-button full-width" onClick={() => { setMobileMenuOpen(false); navigateTo('/dashboard') }}>Dashboard</button>
                <button type="button" className="ghost-button full-width" onClick={() => { setMobileMenuOpen(false); navigateTo('/discover') }}>Discover</button>
                <button type="button" className="ghost-button full-width" onClick={() => { setMobileMenuOpen(false); navigateTo('/applications') }}>Applications</button>
                <button type="button" className="ghost-button full-width" onClick={() => { setMobileMenuOpen(false); navigateTo('/profile') }}>Profile</button>
                <button type="button" className="primary-button full-width" onClick={handlePublicSignOut} disabled={loggingOut}>{loggingOut ? 'Signing out...' : 'Log out'}</button>
              </>
            ) : (
              <>
                <button type="button" className="ghost-button full-width" onClick={() => { setMobileMenuOpen(false); navigateTo('/login') }}>Sign in</button>
                <button type="button" className="primary-button full-width" onClick={() => { setMobileMenuOpen(false); navigateTo('/signup') }}>Get started</button>
              </>
            )}
          </div>
        )}
      </header>

      <main id="top">
        <section className="hero-section container reveal-on-scroll">
          <div className="hero-copy">
            <div className="status-pill">INTERNSHIP MANAGEMENT, SIMPLIFIED</div>
            <h1 className={headlineReady ? 'headline-ready' : ''} aria-live="polite">
              {headlineLines.map((line) => (
                <span key={line} className="headline-line">
                  {line}
                </span>
              ))}
            </h1>
            <p>
              Discover relevant opportunities, manage applications, and keep your entire internship journey in one place.
            </p>
            <div className="hero-actions">
              <a href="#discover" className="primary-button action-button">
                Explore internships
              </a>
              <a href="#how-it-works" className="secondary-button action-button">
                See how it works
              </a>
            </div>
          </div>

          <div className="mini-demo-panel" aria-label="Internship Explorer preview">
            <div className="preview-header">
              <div>
                <p className="eyebrow">Internship Explorer</p>
                <h3>Explore opportunities</h3>
              </div>
              <button type="button" className="mini-chip">
                <Sparkles size={14} />
                Live demo
              </button>
            </div>

            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search internships..."
                aria-label="Search internships"
              />
            </div>

            <div className="filter-row">
              {['All', 'Software', 'Data', 'Design', 'Remote'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === 'All' ? 'filter-tag active' : 'filter-tag'}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mini-list">
              <div className="mini-card">
                <div>
                  <h4>Software Engineering Intern</h4>
                  <p>Nova Labs</p>
                  <span>Bangalore · Hybrid</span>
                </div>
                <div className="mini-meta">
                  <strong>₹25k/month</strong>
                  <button type="button">View internship</button>
                </div>
              </div>

              <div className="mini-card muted-card">
                <div>
                  <h4>Data Analyst Intern</h4>
                  <p>Vertex Analytics</p>
                  <span>Delhi · Remote</span>
                </div>
                <div className="mini-meta">
                  <strong>₹20k/month</strong>
                  <button type="button">View internship</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="discover" className="discovery-section container">
          <div className="section-heading">
            <div className="section-kicker">Internship discovery, reimagined</div>
            <h2>Stop searching. Start matching.</h2>
          </div>

          <div className="discovery-panel">
            <div className="toolbar">
              <label className="search-wrap">
                <Search size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search titles, companies, skills..."
                  aria-label="Search all internships"
                />
              </label>

              <div className="toolbar-actions">
                <button type="button" className="toolbar-button">
                  <Filter size={15} />
                  Filters
                </button>
                <select value={selectedSort} onChange={(event) => setSelectedSort(event.target.value as (typeof sortOptions)[number])}>
                  {sortOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="result-row">
              <span>{filteredInternships.length} opportunities</span>
              <span className="live-chip"><Sparkles size={12} /> Live demo</span>
            </div>

            <div className="filter-group">
              <div className="filter-row stacked-row">
                <span className="group-label">Domain</span>
                {domains.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    className={selectedDomain === domain ? 'chip active' : 'chip'}
                    onClick={() => setSelectedDomain(domain)}
                  >
                    {domain}
                  </button>
                ))}
              </div>

              <div className="filter-row stacked-row">
                <span className="group-label">Location</span>
                {locations.map((location) => (
                  <button
                    key={location}
                    type="button"
                    className={selectedLocation === location ? 'chip active' : 'chip'}
                    onClick={() => setSelectedLocation(location)}
                  >
                    {location}
                  </button>
                ))}
              </div>

              <div className="filter-row stacked-row">
                <span className="group-label">Work mode</span>
                {workModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={selectedWorkMode === mode ? 'chip active' : 'chip'}
                    onClick={() => setSelectedWorkMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-grid">
              {filteredInternships.length > 0 ? (
                filteredInternships.map((internship) => {
                  const isSaved = savedIds.includes(internship.id)

                  return (
                    <article key={internship.id} className="internship-card">
                      <div className="card-topline">
                        <span className="domain-tag">{internship.domain}</span>
                        <button
                          type="button"
                          className={isSaved ? 'save-button active' : 'save-button'}
                          onClick={() => toggleSave(internship.id)}
                          aria-label={`Save ${internship.title}`}
                        >
                          <Bookmark size={16} />
                        </button>
                      </div>

                      <div className="card-header">
                        <div>
                          <h3>{internship.title}</h3>
                          <div className="meta-line">
                            <Building2 size={14} />
                            <span>{internship.company}</span>
                          </div>
                        </div>
                        <div className="stipend">₹{internship.stipend.toLocaleString('en-IN')}/month</div>
                      </div>

                      <div className="meta-row">
                        <span>
                          <MapPin size={14} /> {internship.location}
                        </span>
                        <span>
                          <BriefcaseBusiness size={14} /> {internship.workMode}
                        </span>
                      </div>

                      <div className="skill-list">
                        {internship.skills.map((skill) => (
                          <span key={skill} className="skill-pill">
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="card-footer">
                        <div className="info-block">
                          <CalendarDays size={14} />
                          <span>Posted {internship.postedDaysAgo}d ago</span>
                        </div>
                        <button type="button" className="view-button" onClick={() => setSelectedInternship(internship)}>
                          View details
                        </button>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><Search size={18} /></div>
                  <h3>No internships match your filters</h3>
                  <p>Try a broader search or reset your domain, location, and work-mode filters.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="steps-section container reveal-on-scroll">
          <div className="section-heading center-heading">
            <div className="section-kicker">How it works</div>
            <h2>Simple enough to trust. Powerful enough to scale.</h2>
          </div>

          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">01</div>
              <div className="step-body">
                <h3>Build your profile</h3>
                <p>Capture your education, projects, skills, and preferences in one structured place.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">02</div>
              <div className="step-body">
                <h3>Discover opportunities</h3>
                <p>Use search and filters to find the internships that truly fit your goals and strengths.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">03</div>
              <div className="step-body">
                <h3>Manage every application</h3>
                <p>Track stages, deadlines, and next steps without losing context across multiple internships.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="feature-section container reveal-on-scroll">
          <div className="section-heading center-heading">
            <div className="section-kicker">Core features</div>
            <h2>Everything you need to move from browsing to action.</h2>
          </div>

          <div className="feature-grid">
            {[
              ['Internship Discovery', 'Find opportunities using structured search and filters.', 'Target'],
              ['Application Tracking', 'Keep every application and status in one place.', 'TrendingUp'],
              ['Resume-Based Profile', 'Turn your resume into a structured student profile.', 'FileText'],
              ['Company & Internship Management', 'Organize internship listings and applicant information.', 'Building2'],
              ['Skill Visibility', 'See the skills associated with each opportunity.', 'Database'],
              ['Personal Workspace', 'Save opportunities and build your internship pipeline.', 'UserRound']
            ].map(([title, text, iconKey], index) => {
              const Icon = iconKey === 'Target' ? Target : iconKey === 'TrendingUp' ? TrendingUp : iconKey === 'FileText' ? FileText : iconKey === 'Building2' ? Building2 : iconKey === 'Database' ? Database : UserRound
              return (
                <div key={index} className="feature-card">
                  <div className="feature-icon">
                    <Icon size={18} />
                  </div>
                  <div className="feature-number">0{index + 1}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="pipeline-section container reveal-on-scroll">
          <div className="section-heading">
            <div className="section-kicker">Application tracking</div>
            <h2>Keep your internship pipeline moving.</h2>
          </div>

          <div className="pipeline-demo">
            <div className="pipeline-tabs">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={selectedApplicationStatus === status ? 'pipeline-tab active' : 'pipeline-tab'}
                  onClick={() => setSelectedApplicationStatus(status)}
                >
                  {status}
                  <span>{applicationCounts[status]}</span>
                </button>
              ))}
            </div>

            <div className="pipeline-board">
              {visibleApplications.map((application) => (
                <div key={application.id} className="pipeline-item">
                  <div className="pipeline-status-indicator" data-status={application.status.toLowerCase().replace(/\s+/g, '-')}></div>
                  <div>
                    <h3>{application.title}</h3>
                    <p>{application.company}</p>
                  </div>
                  <div className="pipeline-meta">
                    <span>{application.status}</span>
                    <span>{application.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="resume-section container reveal-on-scroll">
          <div className="section-heading">
            <div className="section-kicker">Resume automation</div>
            <h2>From uploaded resume to structured profile.</h2>
          </div>

          <div className="resume-flow">
            <div className="resume-card article-card">
              <div className="card-label">Resume</div>
              <div className="resume-box">
                <FileText size={18} />
                <span>Resume uploaded</span>
              </div>
            </div>

            <div className="flow-arrow">
              <ChevronRight size={20} />
            </div>

            <div className="resume-card action-card">
              <div className="card-label">Extract</div>
              <div className="chip-set">
                <span><Wand2 size={14} /> AI-assisted structuring</span>
                <span>Coming next</span>
              </div>
            </div>

            <div className="flow-arrow">
              <ChevronRight size={20} />
            </div>

            <div className="resume-card profile-card">
              <div className="card-label">Structured Profile</div>
              <div className="profile-block">
                <div>
                  <strong>Skills</strong>
                  <p>Python · React · SQL · Machine Learning</p>
                </div>
                <div>
                  <strong>Education</strong>
                  <p>B.Tech Computer Science</p>
                </div>
                <div>
                  <strong>Projects</strong>
                  <p>Internship Management System</p>
                </div>
                <div>
                  <strong>Experience</strong>
                  <p>Web Development</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-section container reveal-on-scroll">
          <div className="trust-box">
            <div className="trust-content">
              <div className="section-kicker">Built to keep momentum</div>
              <h2>One place to discover, organize, and manage internships.</h2>
            </div>
            <div className="trust-stats">
              <div>
                <ShieldCheck size={18} />
                <span>Structured discovery</span>
              </div>
              <div>
                <Clock3 size={18} />
                <span>Application tracking</span>
              </div>
              <div>
                <Star size={18} />
                <span>Smarter profile workflow</span>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section container">
          <div className="cta-box">
            <div>
              <div className="section-kicker">Ready to build your pipeline?</div>
              <h2>Build your internship pipeline once. Manage it from anywhere.</h2>
            </div>
            <div className="cta-actions">
              <a href="#discover" className="primary-button action-button">Explore internships</a>
              <button type="button" className="secondary-button action-button" onClick={() => navigateTo('/signup')}>Get started</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-mark"><Logo /></span>
              <span className="brand-text">AlgoIntern</span>
            </div>
            <p>Internship Management &amp; Discovery Platform</p>
          </div>

          <div className="footer-links">
            <div>
              <h4>Product</h4>
              <a href="#discover">Discover</a>
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
            </div>
            <div>
              <h4>Project</h4>
              <a href="https://github.com/arnavsharma990/AlgoIntern" target="_blank" rel="noreferrer">GitHub</a>
              <a href="#top">Documentation</a>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 AlgoIntern. All rights reserved.</span>
        </div>
      </footer>

      {selectedInternship && (
        <div className="modal-backdrop" onClick={() => setSelectedInternship(null)}>
          <aside
            className="detail-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedInternship.title} details`}
          >
            <div className="modal-header">
              <div>
                <div className="section-kicker">{selectedInternship.domain}</div>
                <h3>{selectedInternship.title}</h3>
              </div>
              <button type="button" className="close-button" onClick={() => setSelectedInternship(null)} aria-label="Close internship details">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-row">
                <div>
                  <p className="detail-label">Company</p>
                  <strong>{selectedInternship.company}</strong>
                </div>
                <div>
                  <p className="detail-label">Role</p>
                  <strong>{selectedInternship.title}</strong>
                </div>
              </div>

              <div className="modal-row two-col">
                <div>
                  <p className="detail-label">Location</p>
                  <span>{selectedInternship.location}</span>
                </div>
                <div>
                  <p className="detail-label">Work mode</p>
                  <span>{selectedInternship.workMode}</span>
                </div>
                <div>
                  <p className="detail-label">Stipend</p>
                  <span>₹{selectedInternship.stipend.toLocaleString('en-IN')}/month</span>
                </div>
                <div>
                  <p className="detail-label">Duration</p>
                  <span>{selectedInternship.duration}</span>
                </div>
                <div>
                  <p className="detail-label">Application deadline</p>
                  <span>{selectedInternship.deadline}</span>
                </div>
              </div>

              <div className="skills-block">
                <p className="detail-label">Required skills</p>
                <div className="skill-list">
                  {selectedInternship.skills.map((skill) => (
                    <span key={skill} className="skill-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="description-block">
                <p className="detail-label">Description</p>
                <p>{selectedInternship.description}</p>
              </div>

              <div className="why-fit-block">
                <p className="detail-label">Why this could fit you</p>
                <ul>
                  {selectedInternship.whyFit.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-button save-modal" onClick={() => toggleSave(selectedInternship.id)}>
                {savedIds.includes(selectedInternship.id) ? 'Saved' : 'Save'}
              </button>
              <button type="button" className="primary-button apply-button" onClick={handleApply}>
                Apply
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
