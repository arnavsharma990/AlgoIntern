import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'
import type { Profile } from '../lib/auth'
import { getFriendlyAuthError } from '../lib/auth'
import { profileCompletion } from '../lib/profile'
import { analyzeStudentResume, getFriendlyResumeError, getStoredResumeInsights, listStudentResumes, removeStudentResume, saveResumeInsights, uploadStudentResume, validateResumeFile, type ParsedResume, type Resume } from '../lib/resumes'

const domainOptions = ['Software', 'Data', 'Design', 'Product', 'Marketing', 'Operations']
const locationOptions = ['Remote', 'Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Noida']
const workModeOptions = ['Remote', 'Hybrid', 'On-site']

const cleanTags = (tags: string[]) => [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
const mergeTags = (existing: string[], incoming: string[]) => {
  const result = [...existing]
  const seen = new Set(existing.map((value) => value.toLowerCase()))
  incoming.forEach((value) => {
    const cleaned = value.trim()
    if (cleaned && !seen.has(cleaned.toLowerCase())) {
      result.push(cleaned)
      seen.add(cleaned.toLowerCase())
    }
  })
  return result
}

const scalarAiFields = ['full_name', 'headline', 'phone', 'location', 'college', 'degree', 'branch', 'graduation_year', 'cgpa', 'bio'] as const
type ScalarAiField = typeof scalarAiFields[number]

export type ProfileFormData = {
  full_name: string
  phone: string
  headline: string
  location: string
  college: string
  degree: string
  branch: string
  graduation_year: string
  cgpa: string
  bio: string
  skills: string[]
  interests: string[]
  preferred_domains: string[]
  preferred_locations: string[]
  preferred_work_modes: string[]
}

const toFormData = (profile: Profile): ProfileFormData => ({
  full_name: profile.full_name ?? '',
  phone: profile.phone ?? '',
  headline: profile.headline ?? '',
  location: profile.location ?? '',
  college: profile.college ?? '',
  degree: profile.degree ?? '',
  branch: profile.branch ?? '',
  graduation_year: profile.graduation_year?.toString() ?? '',
  cgpa: profile.cgpa?.toString() ?? '',
  bio: profile.bio ?? '',
  skills: cleanTags(profile.skills ?? []),
  interests: cleanTags(profile.interests ?? []),
  preferred_domains: cleanTags(profile.preferred_domains ?? []),
  preferred_locations: cleanTags(profile.preferred_locations ?? []),
  preferred_work_modes: cleanTags(profile.preferred_work_modes ?? []),
})

function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const value = draft.trim()
    if (!value) return
    onChange(cleanTags([...values, value]))
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

  return (
    <div className="tag-input-wrap">
      <label>{label}</label>
      <div className="tag-list">
        {values.map((value) => (
          <span className="editable-tag" key={value}>
            {value}
            <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`}>&times;</button>
          </span>
        ))}
        <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} onBlur={addTag} placeholder={placeholder} />
      </div>
    </div>
  )
}

function MultiSelect({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="multi-select-wrap">
      <label>{label}</label>
      <div className="selection-chips">
        {options.map((option) => {
          const selected = values.includes(option)
          return <button type="button" key={option} className={selected ? 'chip active' : 'chip'} onClick={() => onChange(selected ? values.filter((value) => value !== option) : [...values, option])}>{option}</button>
        })}
      </div>
    </div>
  )
}

export function ProfilePage({ profile, email, saving, onSave, onBack }: { profile: Profile; email: string; saving: boolean; onSave: (data: ProfileFormData) => Promise<void>; onBack: () => void }) {
  const [form, setForm] = useState(() => toFormData(profile))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resume, setResume] = useState<Resume | null>(null)
  const [resumeStatus, setResumeStatus] = useState<'idle' | 'uploading' | 'extracting' | 'saving'>('idle')
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumeNotice, setResumeNotice] = useState<string | null>(null)
  const [aiDraft, setAiDraft] = useState<ParsedResume | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'applying'>('idle')
  const [aiError, setAiError] = useState<string | null>(null)
  const [selectedAiFields, setSelectedAiFields] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const completion = useMemo(() => profileCompletion(form), [form])

  useEffect(() => {
    let mounted = true
    void listStudentResumes(profile.id)
      .then((resumes) => {
        if (mounted) {
          const loadedResume = resumes.find((item) => item.is_primary) ?? resumes[0] ?? null
          setResume(loadedResume)
          if (loadedResume) setAiDraft(getStoredResumeInsights(loadedResume))
        }
      })
      .catch((requestError: unknown) => {
        if (mounted) setResumeError(getFriendlyResumeError(requestError))
      })
    return () => { mounted = false }
  }, [profile.id])

  const update = <Key extends keyof ProfileFormData>(key: Key, value: ProfileFormData[Key]) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (!form.full_name.trim()) return setError('Please enter your full name.')
    if (form.phone && !/^[+\d][\d\s()-]{6,19}$/.test(form.phone)) return setError('Please enter a valid phone number.')
    if (form.graduation_year && (!/^\d{4}$/.test(form.graduation_year) || Number(form.graduation_year) < 1900 || Number(form.graduation_year) > 2200)) return setError('Please enter a reasonable graduation year.')
    if (form.cgpa && (Number.isNaN(Number(form.cgpa)) || Number(form.cgpa) < 0 || Number(form.cgpa) > 10)) return setError('CGPA must be a number between 0 and 10.')

    try {
      await onSave({ ...form, skills: cleanTags(form.skills), interests: cleanTags(form.interests) })
      setSuccess('Your profile has been saved.')
    } catch (requestError) {
      setError(getFriendlyAuthError(requestError))
    }
  }

  const processResume = async (file: File) => {
    setResumeError(null)
    setResumeNotice(null)
    try {
      validateResumeFile(file)
      const previousResume = resume
      const nextResume = await uploadStudentResume(profile.id, file, setResumeStatus)
      if (previousResume) {
        try {
          await removeStudentResume(previousResume)
        } catch {
          setResumeNotice('Resume ready. The previous file could not be cleaned up automatically.')
        }
      }
      setResume(nextResume)
      if (!nextResume.extracted_text || nextResume.extraction?.likelyScanned) setResumeNotice('This PDF appears to contain scanned/image-based content. Text extraction may be incomplete.')
      else if (nextResume.extraction && nextResume.extraction.pageCount > 1) setResumeNotice(`Resume uploaded — text extracted from ${nextResume.extraction.pageCount} pages.`)
      else if (!previousResume) setResumeNotice('Resume ready.')
    } catch (requestError) {
      setResumeError(getFriendlyResumeError(requestError))
    } finally {
      setResumeStatus('idle')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void processResume(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files[0]
    if (file) void processResume(file)
  }

  const removeResume = async () => {
    if (!resume || !window.confirm('Remove this resume from your profile?')) return
    setResumeError(null)
    setResumeNotice(null)
    setResumeStatus('saving')
    try {
      await removeStudentResume(resume)
      setResume(null)
      setResumeNotice('Resume removed.')
    } catch (requestError) {
      setResumeError(getFriendlyResumeError(requestError))
    } finally {
      setResumeStatus('idle')
    }
  }

  const analyzeResume = async () => {
    if (!resume) return setAiError('No resume uploaded yet.')
    if (!resume.extracted_text || resume.extracted_text.trim().length < 80) return setAiError("Your resume doesn't contain enough readable text to analyze.")
    setAiError(null)
    setAiStatus('analyzing')
    try {
      const parsed = await analyzeStudentResume(resume.id)
      await saveResumeInsights(resume.id, resume.student_id, parsed)
      setResume((current) => current ? { ...current, extracted_skills: parsed.skills, extracted_education: parsed.education, extracted_experience: parsed.experience, extracted_projects: parsed.projects } : current)
      setAiDraft(parsed)
      const fieldsWithValues: string[] = [
        ...scalarAiFields.filter((field) => parsed[field] !== null && parsed[field] !== ''),
        ...(parsed.skills.length > 0 ? ['skills'] : []),
        ...(parsed.interests.length > 0 ? ['interests'] : []),
        ...(parsed.preferred_domains.length > 0 ? ['preferred_domains'] : []),
      ]
      setSelectedAiFields(fieldsWithValues)
    } catch {
      setAiError('AI analysis is temporarily unavailable. Please try again.')
    } finally {
      setAiStatus('idle')
    }
  }

  const applyAiFields = async () => {
    if (!aiDraft) return
    setAiError(null)
    setAiStatus('applying')
    const nextForm = { ...form }
    scalarAiFields.forEach((field: ScalarAiField) => {
      if (!selectedAiFields.includes(field) || aiDraft[field] === null) return
      nextForm[field] = String(aiDraft[field]) as never
    })
    if (selectedAiFields.includes('skills')) nextForm.skills = mergeTags(nextForm.skills, aiDraft.skills)
    if (selectedAiFields.includes('interests')) nextForm.interests = mergeTags(nextForm.interests, aiDraft.interests)
    if (selectedAiFields.includes('preferred_domains')) nextForm.preferred_domains = mergeTags(nextForm.preferred_domains, aiDraft.preferred_domains)
    try {
      await onSave(nextForm)
      setForm(nextForm)
      setSuccess('Selected resume insights were applied to your profile.')
    } catch (requestError) {
      setAiError(getFriendlyAuthError(requestError))
    } finally {
      setAiStatus('idle')
    }
  }

  const toggleAiField = (field: string) => setSelectedAiFields((current) => current.includes(field) ? current.filter((value) => value !== field) : [...current, field])

  return (
    <main className="profile-page">
      <div className="profile-shell container">
        <div className="profile-page-header">
          <button type="button" className="ghost-button" onClick={onBack}>Back to dashboard</button>
          <div className="profile-completion compact-completion"><span>Profile completion</span><strong>{completion}%</strong></div>
        </div>
        <div className="profile-heading">
          <div className="section-kicker">Student profile</div>
          <h1>Tell us about yourself.</h1>
          <p>Build the profile that will power your future internship discovery experience.</p>
        </div>

        <form className="profile-form" onSubmit={submit}>
          <section className="profile-section-card">
            <div className="profile-section-heading"><span>01</span><div><h2>Personal information</h2><p>Make your profile feel like you.</p></div></div>
            <div className="form-grid">
              <label>Full name<input maxLength={120} value={form.full_name} onChange={(event) => update('full_name', event.target.value)} /></label>
              <label>Email<input value={email} readOnly aria-readonly="true" /></label>
              <label>Phone<input maxLength={24} value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 98765 43210" /></label>
              <label>Headline<input maxLength={160} value={form.headline} onChange={(event) => update('headline', event.target.value)} placeholder="Aspiring product engineer" /></label>
              <label>Location<input maxLength={120} value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Bangalore" /></label>
            </div>
          </section>

          <section className="profile-section-card">
            <div className="profile-section-heading"><span>02</span><div><h2>Education</h2><p>Share the academic context behind your goals.</p></div></div>
            <div className="form-grid">
              <label>College<input maxLength={160} value={form.college} onChange={(event) => update('college', event.target.value)} /></label>
              <label>Degree<input maxLength={100} value={form.degree} onChange={(event) => update('degree', event.target.value)} placeholder="B.Tech" /></label>
              <label>Branch<input maxLength={120} value={form.branch} onChange={(event) => update('branch', event.target.value)} placeholder="Computer Science" /></label>
              <label>Graduation year<input inputMode="numeric" maxLength={4} value={form.graduation_year} onChange={(event) => update('graduation_year', event.target.value.replace(/\D/g, ''))} /></label>
              <label>CGPA<input inputMode="decimal" maxLength={5} value={form.cgpa} onChange={(event) => update('cgpa', event.target.value)} placeholder="8.50" /></label>
            </div>
          </section>

          <section className="profile-section-card">
            <div className="profile-section-heading"><span>03</span><div><h2>About you</h2><p>Give future opportunities a little more context.</p></div></div>
            <label>Bio<textarea maxLength={700} rows={5} value={form.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Tell us what you are learning, building, and looking for." /></label>
          </section>

          <section className="profile-section-card resume-section-card">
            <div className="profile-section-heading"><span>04</span><div><h2>Your resume</h2><p>Upload a PDF to store it privately and extract its raw text.</p></div></div>
            {resume ? (
              <div className="resume-ready-card">
                <div className="resume-file-icon">PDF</div>
                <div className="resume-file-details"><strong>{resume.file_name || 'Resume.pdf'}</strong><span>Uploaded recently · {resume.file_size ? `${(resume.file_size / 1024 / 1024).toFixed(2)} MB` : 'PDF'}</span></div>
                <div className="resume-actions"><button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()} disabled={resumeStatus !== 'idle'}>Replace</button><button type="button" className="ghost-button" onClick={() => void removeResume()} disabled={resumeStatus !== 'idle'}>Remove</button></div>
              </div>
            ) : (
              <div className={dragActive ? 'resume-dropzone drag-active' : 'resume-dropzone'} onDragOver={(event) => { event.preventDefault(); setDragActive(true) }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click() }}>
                <div className="resume-upload-mark">↑</div><strong>Drop your resume here</strong><span>or browse files</span><small>PDF · Max 5 MB</small>
              </div>
            )}
            <input ref={fileInputRef} className="resume-file-input" type="file" accept="application/pdf,.pdf" onChange={onFileChange} />
            {resumeStatus !== 'idle' && <p className="resume-status" role="status">{resumeStatus === 'uploading' ? 'Uploading resume...' : resumeStatus === 'extracting' ? 'Extracting text...' : 'Saving resume...'}</p>}
            {resumeError && <p className="form-feedback error-feedback" role="alert">{resumeError}</p>}
            {resumeNotice && <p className="form-feedback success-feedback" role="status">{resumeNotice}</p>}
            {aiError && !aiDraft && <p className="form-feedback error-feedback" role="alert">{aiError}</p>}
            {resume && <div className="resume-ai-cta"><div><strong>Turn your resume into a structured profile.</strong><span>Use AI to find details for your review. Your profile will not change until you apply them.</span></div><button type="button" className="secondary-button" onClick={() => void analyzeResume()} disabled={aiStatus !== 'idle' || resumeStatus !== 'idle'}>{aiStatus === 'analyzing' ? 'Analyzing resume...' : 'Analyze resume with AI'}</button></div>}
          </section>

          {aiDraft && <section className="profile-section-card ai-insights-card">
            <div className="profile-section-heading"><span>AI</span><div><h2>AI resume insights</h2><p>Review what we found, then choose what belongs in your profile.</p></div></div>
            <div className="ai-summary"><span>{aiDraft.skills.length} skills</span><span>{aiDraft.projects.length} projects</span><span>{aiDraft.experience.length} experience entries</span><span>{aiDraft.education.length} education entries</span></div>
            <div className="ai-review-grid">
              <div className="ai-review-block"><h3>Profile fields</h3>{scalarAiFields.map((field) => { const value = aiDraft[field]; if (value === null || value === '') return null; const currentValue = form[field]; return <label className="ai-field-choice" key={field}><input type="checkbox" checked={selectedAiFields.includes(field)} onChange={() => toggleAiField(field)} /><span><strong>{field.replaceAll('_', ' ')}</strong><small>{currentValue ? `Current: ${currentValue}` : 'No current value'} · AI found: {String(value)}</small></span></label> })}</div>
              <div className="ai-review-block"><h3>Skills</h3><div className="skill-list">{aiDraft.skills.map((skill) => <span className="skill-pill" key={skill}>{skill}</span>)}</div><h3>Interests and domains</h3><div className="skill-list">{[...aiDraft.interests, ...aiDraft.preferred_domains].map((item) => <span className="skill-pill" key={item}>{item}</span>)}</div></div>
            </div>
            {aiDraft.experience.length > 0 && <div className="ai-detail-list"><h3>Experience</h3>{aiDraft.experience.map((item, index) => <div key={`${item.company}-${index}`}><strong>{item.role || 'Experience'}</strong><span>{item.company || 'Company not specified'} · {[item.start_date, item.end_date].filter(Boolean).join(' — ')}</span><p>{item.description}</p></div>)}</div>}
            {aiDraft.projects.length > 0 && <div className="ai-detail-list"><h3>Projects</h3>{aiDraft.projects.map((item, index) => <div key={`${item.name}-${index}`}><strong>{item.name || 'Project'}</strong><span>{item.technologies.join(' · ')}</span><p>{item.description}</p></div>)}</div>}
            {aiError && <p className="form-feedback error-feedback" role="alert">{aiError}</p>}
            <div className="ai-actions"><button type="button" className="primary-button" onClick={() => void applyAiFields()} disabled={aiStatus !== 'idle'}>{aiStatus === 'applying' ? 'Applying...' : 'Apply selected to profile'}</button><button type="button" className="ghost-button" onClick={() => setAiDraft(null)}>Review later</button></div>
          </section>}

          <section className="profile-section-card">
            <div className="profile-section-heading"><span>05</span><div><h2>Skills and interests</h2><p>Add a few focused signals. Press Enter to create a tag.</p></div></div>
            <div className="tag-grid">
              <TagInput label="Skills" values={form.skills} onChange={(values) => update('skills', values)} placeholder="Add a skill" />
              <TagInput label="Interests" values={form.interests} onChange={(values) => update('interests', values)} placeholder="Add an interest" />
            </div>
          </section>

          <section className="profile-section-card">
            <div className="profile-section-heading"><span>06</span><div><h2>Internship preferences</h2><p>Choose what should shape your future discovery feed.</p></div></div>
            <div className="preference-grid">
              <MultiSelect label="Preferred domains" options={domainOptions} values={form.preferred_domains} onChange={(values) => update('preferred_domains', values)} />
              <MultiSelect label="Preferred locations" options={locationOptions} values={form.preferred_locations} onChange={(values) => update('preferred_locations', values)} />
              <MultiSelect label="Preferred work modes" options={workModeOptions} values={form.preferred_work_modes} onChange={(values) => update('preferred_work_modes', values)} />
            </div>
          </section>

          <div className="profile-save-row">
            <div>{error && <p className="form-feedback error-feedback" role="alert">{error}</p>}{success && <p className="form-feedback success-feedback" role="status">{success}</p>}</div>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving changes...' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </main>
  )
}
