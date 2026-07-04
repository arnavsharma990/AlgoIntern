import { useEffect, useMemo, useState } from 'react'
import { Bookmark, CalendarDays, ChevronLeft, Clock3, ExternalLink, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { listActiveInternships, listSavedInternshipIds, saveInternship, unsaveInternship, type DiscoverInternship } from '../lib/discover'
import { listStudentApplicationIds, trackApplication } from '../lib/applications'
import { getInternshipMatch, type InternshipMatch } from '../lib/matching'

type SortMode = 'newest' | 'deadline' | 'stipend'
type FilterValue = 'All' | string

const formatDate = (value: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatStipend = (internship: DiscoverInternship) => {
  const symbol = internship.stipend_currency === 'INR' || !internship.stipend_currency ? '₹' : `${internship.stipend_currency} `
  if (internship.stipend_min !== null && internship.stipend_max !== null && internship.stipend_min !== internship.stipend_max) return `${symbol}${internship.stipend_min.toLocaleString('en-IN')} – ${internship.stipend_max.toLocaleString('en-IN')}`
  const amount = internship.stipend_max ?? internship.stipend_min
  return amount === null ? null : `${symbol}${amount.toLocaleString('en-IN')}`
}

const errorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('network') || message.includes('fetch')) return 'We could not reach the internship catalog. Check your connection and try again.'
  if (message.includes('permission') || message.includes('row-level')) return 'You do not have permission to view these internships.'
  return 'We could not load internships right now. Please try again.'
}

export function DiscoverPage({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const [internships, setInternships] = useState<DiscoverInternship[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [workMode, setWorkMode] = useState<FilterValue>('All')
  const [domain, setDomain] = useState<FilterValue>('All')
  const [location, setLocation] = useState<FilterValue>('All')
  const [stipendOnly, setStipendOnly] = useState(false)
  const [sort, setSort] = useState<SortMode>('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [applicationIds, setApplicationIds] = useState<Set<string>>(new Set())
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, InternshipMatch>>({})
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([listActiveInternships(), listSavedInternshipIds(studentId), listStudentApplicationIds(studentId)])
      .then(([items, saved, applications]) => {
        if (!mounted) return
        setInternships(items)
        setSavedIds(new Set(saved))
        setApplicationIds(new Set(applications))
        setError(null)
      })
      .catch((requestError: unknown) => { if (mounted) setError(errorMessage(requestError)) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [studentId])

  const domains = useMemo(() => [...new Set(internships.map((item) => item.domain).filter(Boolean) as string[])].sort(), [internships])
  const locations = useMemo(() => [...new Set(internships.map((item) => item.location).filter(Boolean) as string[])].sort(), [internships])
  const workModes = useMemo(() => [...new Set(internships.map((item) => item.work_mode).filter(Boolean) as string[])].sort(), [internships])

  const filteredInternships = useMemo(() => {
    const query = search.trim().toLowerCase()
    return internships.filter((internship) => {
      const searchable = [internship.title, internship.company?.name, internship.domain, internship.location, ...internship.skills].filter(Boolean).join(' ').toLowerCase()
      return (!query || searchable.includes(query)) && (workMode === 'All' || internship.work_mode === workMode) && (domain === 'All' || internship.domain === domain) && (location === 'All' || internship.location === location) && (!stipendOnly || internship.stipend_min !== null || internship.stipend_max !== null)
    }).sort((left, right) => {
      if (sort === 'stipend') return (right.stipend_max ?? right.stipend_min ?? -1) - (left.stipend_max ?? left.stipend_min ?? -1)
      if (sort === 'deadline') {
        if (!left.deadline) return 1
        if (!right.deadline) return -1
        return new Date(left.deadline).getTime() - new Date(right.deadline).getTime()
      }
      return new Date(right.posted_at || 0).getTime() - new Date(left.posted_at || 0).getTime()
    })
  }, [domain, internships, location, search, sort, stipendOnly, workMode])

  const toggleSave = async (internshipId: string) => {
    setSavingId(internshipId)
    try {
      if (savedIds.has(internshipId)) {
        await unsaveInternship(studentId, internshipId)
        setSavedIds((current) => { const next = new Set(current); next.delete(internshipId); return next })
      } else {
        await saveInternship(studentId, internshipId)
        setSavedIds((current) => new Set(current).add(internshipId))
      }
    } catch { setError('We could not update your saved internships. Please try again.') } finally { setSavingId(null) }
  }

  const track = async (internshipId: string) => {
    setTrackingId(internshipId)
    try {
      await trackApplication(studentId, internshipId)
      setApplicationIds((current) => new Set(current).add(internshipId))
    } catch {
      setError('We could not track this application. Please try again.')
    } finally {
      setTrackingId(null)
    }
  }

  const analyzeMatch = async (internshipId: string) => {
    setMatchingId(internshipId)
    setMatchError(null)
    try {
      const result = await getInternshipMatch(internshipId)
      setMatches((current) => ({ ...current, [internshipId]: result }))
    } catch {
      setMatchError('AI matching is temporarily unavailable. Please try again.')
    } finally {
      setMatchingId(null)
    }
  }

  return (
    <main className="discover-page">
      <div className="discover-shell container">
        <div className="discover-topline"><button type="button" className="ghost-button" onClick={onBack}><ChevronLeft size={15} /> Dashboard</button><span className="eyebrow">Student workspace</span></div>
        <div className="discover-heading"><div><div className="section-kicker">Internship Explorer</div><h1>Find work that moves you forward.</h1><p>Browse active opportunities from your connected sources and save the ones worth a closer look.</p></div><div className="discover-count"><strong>{filteredInternships.length}</strong><span>matching opportunities</span></div></div>
        <section className="discover-controls">
          <label className="discover-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles, companies, skills..." aria-label="Search internships" /></label>
          <div className="discover-filter-row"><SlidersHorizontal size={15} /><select value={workMode} onChange={(event) => setWorkMode(event.target.value)} aria-label="Filter by work mode"><option value="All">All work modes</option>{workModes.map((item) => <option key={item}>{item}</option>)}</select><select value={domain} onChange={(event) => setDomain(event.target.value)} aria-label="Filter by domain"><option value="All">All domains</option>{domains.map((item) => <option key={item}>{item}</option>)}</select><select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by location"><option value="All">All locations</option>{locations.map((item) => <option key={item}>{item}</option>)}</select><label className="stipend-toggle"><input type="checkbox" checked={stipendOnly} onChange={(event) => setStipendOnly(event.target.checked)} /> Stipend listed</label><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort internships"><option value="newest">Newest</option><option value="deadline">Deadline soon</option><option value="stipend">Stipend high to low</option></select></div>
        </section>
        {matchError && <p className="form-feedback error-feedback" role="alert">{matchError}</p>}
        {loading && <div className="discover-state"><div className="loading-line" /><p>Loading active internships...</p></div>}
        {!loading && error && <div className="discover-state error-state"><div className="empty-icon"><Search size={18} /></div><h2>We hit a snag.</h2><p>{error}</p><button type="button" className="secondary-button" onClick={() => window.location.reload()}>Try again</button></div>}
        {!loading && !error && filteredInternships.length === 0 && <div className="discover-state"><div className="empty-icon"><Search size={18} /></div><h2>No internships match those filters.</h2><p>Try a broader search or clear one of your filters.</p></div>}
        {!loading && !error && filteredInternships.length > 0 && <div className="discover-grid">{filteredInternships.map((internship) => { const saved = savedIds.has(internship.id); const tracked = applicationIds.has(internship.id); const stipend = formatStipend(internship); const match = matches[internship.id]; return <article className="discover-card" key={internship.id}><div className="discover-card-top"><span className="domain-tag">{internship.domain || 'Opportunity'}</span><button className={saved ? 'save-button active' : 'save-button'} type="button" aria-label={saved ? `Unsave ${internship.title}` : `Save ${internship.title}`} onClick={() => void toggleSave(internship.id)} disabled={savingId === internship.id}><Bookmark size={16} /></button></div><div className="discover-card-title"><div><h2>{internship.title}</h2><p>{internship.company?.name || 'Company undisclosed'}</p></div>{stipend && <strong>{stipend}</strong>}</div><div className="discover-meta"><span><MapPin size={14} />{internship.location || 'Location flexible'}</span><span><Clock3 size={14} />{internship.work_mode || 'Work mode flexible'}</span>{internship.duration && <span>{internship.duration}</span>}</div>{internship.skills.length > 0 && <div className="skill-list">{internship.skills.map((skill) => <span className="skill-pill" key={skill}>{skill}</span>)}</div>}{match ? <div className={`match-panel ${match.match_label === 'Not eligible' ? 'match-ineligible' : ''}`}><div className="match-score"><strong>{match.match_score}%</strong><span>{match.match_label}</span></div><div className="match-reasons">{match.reasons.slice(0, 2).map((reason) => <span key={reason}>{reason}</span>)}</div>{(match.matching_skills.length > 0 || match.missing_skills.length > 0) && <div className="match-skills">{match.matching_skills.slice(0, 3).map((skill) => <span className="match-skill match-skill-good" key={`good-${skill}`}>+ {skill}</span>)}{match.missing_skills.slice(0, 3).map((skill) => <span className="match-skill match-skill-missing" key={`missing-${skill}`}>− {skill}</span>)}</div>}</div> : <button type="button" className="match-trigger" onClick={() => void analyzeMatch(internship.id)} disabled={matchingId === internship.id}>{matchingId === internship.id ? 'Analyzing your fit...' : 'Analyze your match'}</button>}<div className="discover-card-footer"><div className="discover-dates">{internship.deadline && <span><CalendarDays size={13} /> Due {formatDate(internship.deadline)}</span>}<span>{internship.source_listing_id ? 'External listing' : 'Original source'}</span></div><div className="discover-card-actions"><button type="button" className={tracked ? 'secondary-button tracked-button' : 'secondary-button'} onClick={() => void track(internship.id)} disabled={tracked || trackingId === internship.id}>{trackingId === internship.id ? 'Tracking...' : tracked ? 'Application tracked' : 'Track application'}</button><a className="view-button" href={internship.application_url} target="_blank" rel="noreferrer">View internship <ExternalLink size={14} /></a></div></div></article>})}</div>}
      </div>
    </main>
  )
}
