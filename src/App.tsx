import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
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

const domains = ['All', 'Software', 'Data', 'Design', 'Product', 'Marketing', 'Operations'] as const
const locations = ['All', 'Remote', 'Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Noida'] as const
const workModes = ['All', 'Remote', 'Hybrid', 'On-site'] as const
const sortOptions = ['Relevance', 'Newest', 'Stipend'] as const
const headlineLines = ['Find the right internship.', 'Build your career.']

function App() {
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
  }, [])

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

  return (
    <div className="page-shell">
      <header className={`topbar ${isScrolled ? 'scrolled' : ''}`}>
        <nav className="nav container" aria-label="Main navigation">
          <a href="#top" className="brand" aria-label="AlgoIntern home">
            <span className="brand-mark">A</span>
            <span className="brand-text">AlgoIntern</span>
          </a>

          <div className="nav-center desktop-only">
            <a href="#discover">Discover</a>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
          </div>

          <div className="nav-actions desktop-only">
            <button className="ghost-button" type="button">
              Sign in
            </button>
            <button className="primary-button" type="button">
              Get started
            </button>
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
            <button type="button" className="ghost-button full-width">Sign in</button>
            <button type="button" className="primary-button full-width">Get started</button>
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

        <section id="discover" className="discovery-section container reveal-on-scroll">
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
              <button type="button" className="secondary-button action-button">Get started</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-mark">A</span>
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
