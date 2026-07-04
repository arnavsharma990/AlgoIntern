import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, Clock3, ExternalLink, FileText, MapPin, Search } from 'lucide-react'
import { applicationStatuses, listStudentApplications, updateStudentApplication, type ApplicationStatus, type StudentApplication } from '../lib/applications'

const statusLabels: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  selected: 'Selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

type SortMode = 'updated' | 'applied'

const formatDate = (value: string | null) => {
  if (!value) return 'Not set'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const friendlyError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('network') || message.includes('fetch')) return 'We could not reach your applications. Check your connection and try again.'
  return 'We could not load your applications right now. Please try again.'
}

const isActive = (status: ApplicationStatus) => !['selected', 'rejected', 'withdrawn'].includes(status)

export function ApplicationsPage({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const [applications, setApplications] = useState<StudentApplication[]>([])
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')
  const [sort, setSort] = useState<SortMode>('updated')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  const loadApplications = async () => {
    setLoading(true)
    try {
      setApplications(await listStudentApplications(studentId))
      setError(null)
    } catch (requestError) {
      setError(friendlyError(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    listStudentApplications(studentId)
      .then((items) => { if (mounted) { setApplications(items); setError(null) } })
      .catch((requestError: unknown) => { if (mounted) setError(friendlyError(requestError)) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [studentId])

  const stats = useMemo(() => ({
    total: applications.length,
    active: applications.filter((item) => isActive(item.status)).length,
    interviews: applications.filter((item) => item.status === 'interview').length,
    selected: applications.filter((item) => item.status === 'selected').length,
  }), [applications])

  const visibleApplications = useMemo(() => applications
    .filter((item) => filter === 'all' || item.status === filter)
    .sort((left, right) => {
      const leftDate = sort === 'applied' ? left.applied_at : left.last_updated_at || left.updated_at
      const rightDate = sort === 'applied' ? right.applied_at : right.last_updated_at || right.updated_at
      return new Date(rightDate || 0).getTime() - new Date(leftDate || 0).getTime()
    }), [applications, filter, sort])

  const updateApplication = async (application: StudentApplication, updates: { status?: ApplicationStatus; notes?: string | null }) => {
    setSavingId(application.id)
    setSavedNotice(null)
    try {
      const persistedUpdates = updates.status === 'applied' ? { ...updates, applied_at: application.applied_at ?? new Date().toISOString() } : updates
      await updateStudentApplication(studentId, application.id, persistedUpdates)
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, ...persistedUpdates, last_updated_at: new Date().toISOString() } : item))
      setSavedNotice('Application updated.')
    } catch (requestError) {
      setError(friendlyError(requestError))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="applications-page">
      <div className="applications-shell container">
        <div className="applications-topline"><button type="button" className="ghost-button" onClick={onBack}><ChevronLeft size={15} /> Dashboard</button><span className="eyebrow">Student workspace</span></div>
        <div className="applications-heading"><div><div className="section-kicker">Application tracking</div><h1>Keep every opportunity moving.</h1><p>Track where you are, what comes next, and the details you want to remember.</p></div><div className="applications-count"><strong>{stats.total}</strong><span>total applications</span></div></div>

        <div className="application-stats"><div><span>Total applications</span><strong>{stats.total}</strong></div><div><span>Active applications</span><strong>{stats.active}</strong></div><div><span>Interviews</span><strong>{stats.interviews}</strong></div><div><span>Selected</span><strong>{stats.selected}</strong></div></div>
        <div className="applications-controls"><div className="application-filters"><Search size={15} />{(['all', ...applicationStatuses] as const).map((status) => <button type="button" key={status} className={filter === status ? 'chip active' : 'chip'} onClick={() => setFilter(status)}>{status === 'all' ? 'All' : statusLabels[status]}</button>)}</div><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort applications"><option value="updated">Recently updated</option><option value="applied">Recently applied</option></select></div>
        {savedNotice && <p className="form-feedback success-feedback" role="status">{savedNotice}</p>}
        {loading && <div className="discover-state"><div className="loading-line" /><p>Loading your applications...</p></div>}
        {!loading && error && <div className="discover-state"><div className="empty-icon"><FileText size={18} /></div><h2>We hit a snag.</h2><p>{error}</p><button type="button" className="secondary-button" onClick={() => void loadApplications()}>Try again</button></div>}
        {!loading && !error && visibleApplications.length === 0 && <div className="discover-state"><div className="empty-icon"><FileText size={18} /></div><h2>No applications here yet.</h2><p>Track an internship from Discover and your application pipeline will appear here.</p><button type="button" className="secondary-button" onClick={() => window.history.back()}>Explore internships</button></div>}
        {!loading && !error && visibleApplications.length > 0 && <div className="applications-list">{visibleApplications.map((application) => <article className="application-card" key={application.id}><div className="application-card-main"><div className="application-card-title"><div><span className={`application-status status-${application.status}`}>{statusLabels[application.status]}</span><h2>{application.internship?.title || 'Internship opportunity'}</h2><p>{application.internship?.company?.name || 'Company undisclosed'}</p></div><a className="ghost-button application-link" href={application.internship?.application_url} target="_blank" rel="noreferrer">View / Apply <ExternalLink size={14} /></a></div><div className="application-meta"><span><MapPin size={14} />{application.internship?.location || 'Location flexible'}</span><span><Clock3 size={14} />{application.internship?.work_mode || 'Work mode flexible'}</span><span>{application.internship?.domain || 'Domain flexible'}</span><span><CalendarDays size={14} />Applied {formatDate(application.applied_at)}</span></div></div><div className="application-edit"><label>Status<select value={application.status} disabled={savingId === application.id} onChange={(event) => void updateApplication(application, { status: event.target.value as ApplicationStatus })}>{applicationStatuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label><label>Notes<textarea defaultValue={application.notes || ''} maxLength={1000} placeholder="Add a note for your future self..." onBlur={(event) => { if (event.target.value !== (application.notes || '')) void updateApplication(application, { notes: event.target.value.trim() || null }) }} /></label><span className="application-updated">Updated {formatDate(application.last_updated_at || application.updated_at)}</span></div></article>)}</div>}
      </div>
    </main>
  )
}
